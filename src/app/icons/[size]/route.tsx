import { renderIcon } from "@/lib/iconArt";

// PWA manifest icons (192 / 512) and notification icon
export async function GET(_: Request, { params }: { params: Promise<{ size: string }> }) {
  const s = Math.min(Math.max(parseInt((await params).size) || 192, 32), 1024);
  const res = renderIcon(s);
  res.headers.set("Cache-Control", "public, max-age=31536000, immutable");
  return res;
}
