import { api } from "./data";

async function resize(file: File, max = 1000): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("resize"))), "image/webp", 0.82));
}

/** Resize in the browser, then upload straight to R2 via a presigned URL. Returns the object key. */
export async function uploadPhoto(file: File, babyId: string): Promise<string> {
  const blob = await resize(file);
  const { key, uploadUrl } = await api<{ key: string; uploadUrl: string }>("/api/media/presign", {
    babyId,
    contentType: "image/webp",
  });
  const r = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": "image/webp" }, body: blob });
  if (!r.ok) throw new Error("upload failed");
  return key;
}

const urlCache = new Map<string, { url: string; exp: number }>();
export async function photoUrl(key: string): Promise<string> {
  const hit = urlCache.get(key);
  if (hit && hit.exp > Date.now()) return hit.url;
  const { url } = await api<{ url: string }>(`/api/media/url?key=${encodeURIComponent(key)}`);
  urlCache.set(key, { url, exp: Date.now() + 50 * 60000 });
  return url;
}
