import { NextResponse } from "next/server";
import { adminDb } from "@/lib/server/admin";
import { sendToUser } from "@/lib/server/push";

export const dynamic = "force-dynamic";

const TXT = {
  en: {
    feedTitle: "Time for the next feed?",
    feedBody: (n: string, ago: string) => `${n} was last fed ${ago} ago.`,
  },
  nl: {
    feedTitle: "Tijd voor de volgende voeding?",
    feedBody: (n: string, ago: string) => `${n} is ${ago} geleden voor het laatst gevoed.`,
  },
};

function localParts(ts: number, tz: string) {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: tz, hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  const p = Object.fromEntries(f.formatToParts(ts).map((x) => [x.type, x.value]));
  const hh = p.hour === "24" ? "00" : p.hour;
  return { day: `${p.year}-${p.month}-${p.day}`, hm: `${hh}:${p.minute}`, minutes: parseInt(hh) * 60 + parseInt(p.minute) };
}
const toMin = (s: string) => parseInt(s.slice(0, 2)) * 60 + parseInt(s.slice(3, 5));
const inQuiet = (m: number, start: string, end: string) => {
  const a = toMin(start), b = toMin(end);
  return a <= b ? m >= a && m < b : m >= a || m < b;
};

/** Called every minute by a Cloudflare Worker cron trigger (see /workers/reminders). */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || (auth !== `Bearer ${secret}` && req.headers.get("x-cron-secret") !== secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = adminDb();
  const now = Date.now();
  const snap = await db.collection("reminders").where("enabled", "==", true).get();
  const users = new Map<string, FirebaseFirestore.DocumentData | undefined>();
  const babies = new Map<string, FirebaseFirestore.DocumentData | undefined>();
  let sent = 0;

  for (const d of snap.docs) {
    const r = d.data();
    if (!users.has(r.ownerUid)) users.set(r.ownerUid, (await db.doc(`users/${r.ownerUid}`).get()).data());
    if (!babies.has(r.babyId)) babies.set(r.babyId, (await db.doc(`babies/${r.babyId}`).get()).data());
    const u = users.get(r.ownerUid), b = babies.get(r.babyId);
    if (!u || !b || !(b.memberUids as string[])?.includes(r.ownerUid)) continue;
    const tz = u.tz || "UTC";
    const lang: "en" | "nl" = u.locale === "nl" ? "nl" : "en";
    const lp = localParts(now, tz);

    if (r.type === "feed") {
      if (!b.lastFeedAt || !r.intervalHours) continue;
      const due = b.lastFeedAt + r.intervalHours * 3600000;
      if (now < due || now - due > 6 * 3600000 || (r.lastSentAt ?? 0) >= due) continue;
      if (u.quiet?.enabled && inQuiet(lp.minutes, u.quiet.start, u.quiet.end)) continue;
      const mins = Math.round((now - b.lastFeedAt) / 60000);
      const ago = `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m`;
      const n = await sendToUser(r.ownerUid, { title: TXT[lang].feedTitle, body: TXT[lang].feedBody(b.name, ago), url: "/home", tag: `feed-${r.babyId}` });
      await d.ref.update({ lastSentAt: now });
      sent += n;
    } else if (r.type === "daily") {
      if (!r.time || r.time !== lp.hm || r.lastSentDay === lp.day) continue;
      const n = await sendToUser(r.ownerUid, { title: r.label || "Reminder", body: b.name, url: "/home", tag: `daily-${d.id}` });
      await d.ref.update({ lastSentDay: lp.day });
      sent += n;
    }
  }
  return NextResponse.json({ checked: snap.size, sent });
}
