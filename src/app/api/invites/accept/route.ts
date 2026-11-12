import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb, getUid } from "@/lib/server/admin";

export async function POST(req: Request) {
  const uid = await getUid(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { token } = await req.json();
  if (typeof token !== "string") return NextResponse.json({ error: "bad request" }, { status: 400 });
  const db = adminDb();
  const ref = db.doc(`invites/${createHash("sha256").update(token).digest("hex")}`);
  try {
    const babyId = await db.runTransaction(async (tx) => {
      const inv = (await tx.get(ref)).data();
      if (!inv || inv.used || inv.expiresAt < Date.now()) throw new Error("invalid");
      const user = (await tx.get(db.doc(`users/${uid}`))).data();
      tx.update(db.doc(`babies/${inv.babyId}`), {
        memberUids: FieldValue.arrayUnion(uid),
        [`members.${uid}`]: { name: user?.displayName ?? "Parent", ...(user?.role ? { role: user.role } : {}) },
      });
      tx.update(ref, { used: true, usedBy: uid, usedAt: Date.now() });
      return inv.babyId as string;
    });
    return NextResponse.json({ babyId });
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 410 });
  }
}
