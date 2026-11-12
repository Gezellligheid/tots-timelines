import { NextResponse } from "next/server";
import { adminDb, getUid } from "@/lib/server/admin";
import { sendToUser } from "@/lib/server/push";

type Kind = "basic" | "feed" | "wrapped";

const TXT = {
  en: {
    basic: () => ({ title: "Tots & Timelines", body: "Notifications are working! 🎉", url: "/home" }),
    feed: (n: string) => ({ title: "Time for the next feed?", body: `${n} was last fed 3h 00m ago.`, url: "/home" }),
    wrapped: (n: string) => ({ title: `${n}'s Wrapped is ready 🎉`, body: "Your first 3 months in numbers", url: "/profile" }),
  },
  nl: {
    basic: () => ({ title: "Tots & Timelines", body: "Meldingen werken! 🎉", url: "/home" }),
    feed: (n: string) => ({ title: "Tijd voor de volgende voeding?", body: `${n} is 3u 00m geleden voor het laatst gevoed.`, url: "/home" }),
    wrapped: (n: string) => ({ title: `De Wrapped van ${n} is klaar 🎉`, body: "Je eerste 3 maanden in cijfers", url: "/profile" }),
  },
};

/** Sends a sample notification to the caller's own devices (test button in Profile). */
export async function POST(req: Request) {
  const uid = await getUid(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const kind: Kind = body.kind === "feed" || body.kind === "wrapped" ? body.kind : "basic";
  const name = typeof body.babyName === "string" && body.babyName ? body.babyName.slice(0, 40) : "Baby";
  const lang = (await adminDb().doc(`users/${uid}`).get()).data()?.locale === "nl" ? "nl" : "en";
  const msg = TXT[lang][kind](name);
  const sent = await sendToUser(uid, { ...msg, tag: `test-${kind}` });
  return NextResponse.json({ sent });
}
