import { NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { adminDb, getUid } from "@/lib/server/admin";

export async function POST(req: Request) {
  const uid = await getUid(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { babyId } = await req.json();
  const baby = (await adminDb().doc(`babies/${babyId}`).get()).data();
  if (!baby || baby.ownerUid !== uid) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const token = randomBytes(24).toString("hex");
  const hash = createHash("sha256").update(token).digest("hex");
  await adminDb().doc(`invites/${hash}`).set({ babyId, createdBy: uid, createdAt: Date.now(), expiresAt: Date.now() + 7 * 86400000, used: false });
  return NextResponse.json({ token });
}
