import { isShortcutKind, renderShortcutIcon } from "@/lib/shortcutIcons";

export async function GET(_: Request, { params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  if (!isShortcutKind(type)) return new Response("not found", { status: 404 });
  const res = renderShortcutIcon(type);
  res.headers.set("Cache-Control", "public, max-age=31536000, immutable");
  return res;
}
