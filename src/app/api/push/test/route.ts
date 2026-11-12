import { NextResponse } from "next/server";
import { adminDb, getUid } from "@/lib/server/admin";
import { sendToUser } from "@/lib/server/push";

export async function POST(req: Request) {
  const uid = await getUid(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const nl = (await adminDb().doc(`users/${uid}`).get()).data()?.locale === "nl";
  const sent = await sendToUser(uid, {
    title: "Tots & Timelines",
    body: nl ? "Meldingen werken! 🎉" : "Notifications are working! 🎉",
    url: "/home",
    tag: "test",
  });
  return NextResponse.json({ sent });
}
