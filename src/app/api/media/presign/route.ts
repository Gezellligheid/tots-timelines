import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getUid, isMember } from "@/lib/server/admin";
import { presignPut } from "@/lib/server/r2";

export async function POST(req: Request) {
  const uid = await getUid(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { babyId, contentType } = await req.json();
  if (typeof babyId !== "string" || contentType !== "image/webp") return NextResponse.json({ error: "bad request" }, { status: 400 });
  if (!(await isMember(uid, babyId))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const key = `babies/${babyId}/${new Date().getFullYear()}/${randomUUID()}.webp`;
  return NextResponse.json({ key, uploadUrl: await presignPut(key, contentType) });
}
