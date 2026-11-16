import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb, getUid } from "@/lib/server/admin";

/** Owner only: create (or replace) the public, read-only family link, or turn it off. */
export async function POST(req: Request) {
  const uid = await getUid(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { babyId, action } = await req.json();
  if (typeof babyId !== "string") return NextResponse.json({ error: "bad request" }, { status: 400 });

  const db = adminDb();
  const ref = db.doc(`babies/${babyId}`);
  const baby = (await ref.get()).data();
  if (!baby || baby.ownerUid !== uid) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  if (baby.familyToken) await db.doc(`shares/${baby.familyToken}`).delete();

  if (action === "revoke") {
    await ref.update({ familyToken: FieldValue.delete() });
    return NextResponse.json({ ok: true });
  }

  const token = randomBytes(24).toString("hex");
  await db.doc(`shares/${token}`).set({ babyId, createdBy: uid, createdAt: Date.now() });
  await ref.update({ familyToken: token });
  return NextResponse.json({ token });
}
