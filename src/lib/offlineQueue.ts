/**
 * Photos chosen while offline wait here (IndexedDB) until there is a connection.
 * Everything else the app writes is queued by Firestore itself.
 */
export interface QueuedPhoto {
  id: string;
  babyId: string;
  eventId: string;
  blob: Blob;
  createdAt: number;
}

const DB_NAME = "tt-offline";
const STORE = "photoQueue";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const queuePhoto = (p: Omit<QueuedPhoto, "id" | "createdAt">) =>
  run("readwrite", (s) => s.put({ ...p, id: crypto.randomUUID(), createdAt: Date.now() }));
export const listQueuedPhotos = () => run<QueuedPhoto[]>("readonly", (s) => s.getAll());
export const removeQueuedPhoto = (id: string) => run("readwrite", (s) => s.delete(id));
