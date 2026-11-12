import { collection, deleteDoc, doc, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import type { EventData, EventDoc, EventType } from "./types";

export type NewEvent = { type: EventType; start: number; end?: number | null; data: EventData; note?: string; photoKey?: string };

/** Writes are fire-and-forget: Firestore applies them locally at once and syncs when online. */
export function addEvent(babyId: string, ev: NewEvent, id?: string) {
  const uid = auth.currentUser!.uid;
  const ref = id ? doc(db, "babies", babyId, "events", id) : doc(collection(db, "babies", babyId, "events"));
  void setDoc(ref, { ...ev, createdBy: uid, updatedAt: Date.now() });
  if (ev.type === "feed" && ev.data.method !== "pump") {
    void updateDoc(doc(db, "babies", babyId), { lastFeedAt: ev.end ?? ev.start });
  }
  return ref.id;
}

/** `type` is the type of the event being patched; only stopping a feed updates "last fed". */
export function patchEvent(babyId: string, id: string, patch: Partial<NewEvent>, type?: EventType) {
  void updateDoc(doc(db, "babies", babyId, "events", id), { ...patch, updatedAt: Date.now() });
  if (patch.end && type === "feed") void updateDoc(doc(db, "babies", babyId), { lastFeedAt: patch.end }).catch(() => {});
}

export function removeEvent(babyId: string, id: string) {
  void deleteDoc(doc(db, "babies", babyId, "events", id));
}

export function restoreEvent(babyId: string, e: EventDoc) {
  const { id, ...rest } = e;
  void setDoc(doc(db, "babies", babyId, "events", id), rest);
}

export async function api<T = unknown>(path: string, body?: unknown): Promise<T> {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}
