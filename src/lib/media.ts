import { deleteField, doc, updateDoc } from "firebase/firestore";
import { api } from "./data";
import { db } from "./firebase";
import { isOnline } from "./net";
import { listQueuedPhotos, queuePhoto, removeQueuedPhoto } from "./offlineQueue";

async function resize(file: File | Blob, max = 1000): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("resize"))), "image/webp", 0.82));
}

/** Upload an already resized image straight to R2 via a presigned URL. Returns the object key. */
async function uploadBlob(blob: Blob, babyId: string): Promise<string> {
  const { key, uploadUrl } = await api<{ key: string; uploadUrl: string }>("/api/media/presign", { babyId, contentType: "image/webp" });
  const r = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": "image/webp" }, body: blob });
  if (!r.ok) throw new Error("upload failed");
  return key;
}

/** Resize in the browser, then upload. Returns the object key. */
export async function uploadPhoto(file: File, babyId: string): Promise<string> {
  return uploadBlob(await resize(file), babyId);
}

/** Resize now and keep the photo on the device until it can be uploaded (see processPhotoQueue). */
export async function queuePhotoForLater(file: File, babyId: string, eventId: string) {
  await queuePhoto({ babyId, eventId, blob: await resize(file) });
}

let processing = false;
/** Upload photos that were chosen offline and attach them to their moments. Safe to call any time. */
export async function processPhotoQueue() {
  if (processing || !isOnline()) return;
  processing = true;
  try {
    for (const item of await listQueuedPhotos()) {
      if (!isOnline()) break;
      try {
        const photoKey = await uploadBlob(item.blob, item.babyId);
        await updateDoc(doc(db, "babies", item.babyId, "events", item.eventId), { photoKey, photoPending: deleteField() });
        await removeQueuedPhoto(item.id);
      } catch {
        /* try again next time */
      }
    }
  } finally {
    processing = false;
  }
}

/* ---- viewing: signed URL when online, a local copy when offline ---- */

const urlCache = new Map<string, { url: string; exp: number }>();
const localUrls = new Map<string, string>();
const PHOTO_CACHE = "tt-photos";
const cacheKey = (key: string) => `/__photo/${key}`;

async function keepCopy(key: string, url: string) {
  try {
    const cache = await caches.open(PHOTO_CACHE);
    if (await cache.match(cacheKey(key))) return;
    const res = await fetch(url);
    if (res.ok) await cache.put(cacheKey(key), res);
  } catch {
    /* a copy is a bonus */
  }
}

async function localCopy(key: string): Promise<string | null> {
  const known = localUrls.get(key);
  if (known) return known;
  try {
    const hit = await (await caches.open(PHOTO_CACHE)).match(cacheKey(key));
    if (!hit) return null;
    const url = URL.createObjectURL(await hit.blob());
    localUrls.set(key, url);
    return url;
  } catch {
    return null;
  }
}

export async function photoUrl(key: string): Promise<string> {
  // offline: the copy kept on this device comes first (a signed link may not load anymore)
  if (!isOnline()) {
    const local = await localCopy(key);
    if (local) return local;
  }
  const hit = urlCache.get(key);
  if (hit && hit.exp > Date.now()) return hit.url;
  if (isOnline()) {
    try {
      const { url } = await api<{ url: string }>(`/api/media/url?key=${encodeURIComponent(key)}`);
      urlCache.set(key, { url, exp: Date.now() + 50 * 60000 });
      void keepCopy(key, url);
      return (await localCopy(key)) ?? url;
    } catch {
      /* fall through to the local copy */
    }
  }
  const local = await localCopy(key);
  if (local) return local;
  throw new Error("offline");
}
