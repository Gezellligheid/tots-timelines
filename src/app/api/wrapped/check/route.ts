import { NextResponse } from "next/server";
import { getUid, isMember } from "@/lib/server/admin";
import { processBabyWrapped } from "@/lib/server/wrapped";

export async function POST(req: Request) {
  const uid = await getUid(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { babyId } = await req.json();
  if (typeof babyId !== "string" || !(await isMember(uid, babyId))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json(await processBabyWrapped(babyId));
}
