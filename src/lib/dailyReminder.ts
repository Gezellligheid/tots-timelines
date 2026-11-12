import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

/**
 * Create this parent's daily reminder for a baby (09:00, editable in Profile) unless one already exists.
 * An existing document, even a switched-off one, is never touched, so turning it off sticks.
 * Returns true when it was newly created.
 */
export async function ensureDailyReminder(uid: string, babyId: string, label: string, time = "09:00"): Promise<boolean> {
  const ref = doc(db, "reminders", `${uid}_${babyId}_daily`);
  const snap = await getDoc(ref).catch(() => null);
  if (!snap || snap.exists()) return false;
  await setDoc(ref, { ownerUid: uid, babyId, type: "daily", enabled: true, time, label });
  return true;
}
