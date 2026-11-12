import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { adminDb, getUid } from "@/lib/server/admin";

export async function POST(req: Request) {
  const uid = await getUid(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { subscription, locale, tz } = await req.json();
  if (!subscription?.endpoint) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const id = createHash("sha256").update(subscription.endpoint).digest("hex").slice(0, 32);
  await adminDb().doc(`users/${uid}/pushSubscriptions/${id}`).set({ subscription, createdAt: Date.now(), ua: req.headers.get("user-agent")?.slice(0, 120) ?? "" });
  const patch: Record<string, string> = {};
  if (locale === "en" || locale === "nl") patch.locale = locale;
  if (typeof tz === "string") patch.tz = tz;
  if (Object.keys(patch).length) await adminDb().doc(`users/${uid}`).set(patch, { merge: true });
  return NextResponse.json({ ok: true });
}
