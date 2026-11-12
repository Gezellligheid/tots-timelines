import { NextResponse } from "next/server";
import { getUid, isMember } from "@/lib/server/admin";
import { presignGet } from "@/lib/server/r2";

export async function GET(req: Request) {
  const uid = await getUid(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const key = new URL(req.url).searchParams.get("key") ?? "";
  const m = /^babies\/([A-Za-z0-9]+)\/\d{4}\/[\w-]+\.webp$/.exec(key);
  if (!m) return NextResponse.json({ error: "bad request" }, { status: 400 });
  if (!(await isMember(uid, m[1]))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json({ url: await presignGet(key) });
}
