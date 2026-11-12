import "server-only";
import { addMonths, differenceInMonths } from "date-fns";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import { sendToUser } from "./push";

/** A period needs at least this many logged entries to get a Wrapped (about two weeks of light tracking). */
const MIN_EVENTS = 60;

const TXT = {
  en: {
    title: (name: string) => `${name}'s Wrapped is ready 🎉`,
    first: (n: number) => `Your first ${n} months in numbers`,
    range: (a: number, b: number) => `Months ${a}–${b} in numbers`,
  },
  nl: {
    title: (name: string) => `De Wrapped van ${name} is klaar 🎉`,
    first: (n: number) => `Je eerste ${n} maanden in cijfers`,
    range: (a: number, b: number) => `Maand ${a}–${b} in cijfers`,
  },
};

/**
 * Decide whether the latest finished 3-month period of a baby has a Wrapped.
 * Idempotent and transactional: the push goes out exactly once per baby and period,
 * whether the check was triggered by the app being opened or by the cron.
 */
export async function processBabyWrapped(babyId: string): Promise<{ readyN: number | null }> {
  const db = adminDb();
  const ref = db.doc(`babies/${babyId}`);
  const first = (await ref.get()).data();
  if (!first) return { readyN: null };

  const birth = new Date(first.birthDate + "T00:00:00Z");
  const n = Math.floor(differenceInMonths(Date.now(), birth) / 3) * 3;
  if (n < 3) {
    if (!first.nextWrappedAt) await ref.update({ nextWrappedAt: addMonths(birth, 3).getTime() });
    return { readyN: first.wrappedReadyN ?? null };
  }
  if ((first.wrappedCheckedN ?? 0) >= n) return { readyN: first.wrappedReadyN ?? null };

  const from = addMonths(birth, n - 3).getTime();
  const to = addMonths(birth, n).getTime();
  const agg = await ref.collection("events").where("start", ">=", from).where("start", "<", to).count().get();
  const ok = agg.data().count >= MIN_EVENTS;

  const shouldPush = await db.runTransaction(async (tx) => {
    const b = (await tx.get(ref)).data();
    if (!b || (b.wrappedCheckedN ?? 0) >= n) return false;
    const patch: Record<string, unknown> = { wrappedCheckedN: n, nextWrappedAt: addMonths(birth, n + 3).getTime() };
    let push = false;
    if (ok) {
      patch.wrappedReadyN = n;
      patch.wrappedAvailable = FieldValue.arrayUnion(n);
      if ((b.wrappedPushedN ?? 0) < n) {
        patch.wrappedPushedN = n;
        push = true;
      }
    }
    tx.update(ref, patch);
    return push;
  });

  if (shouldPush) {
    for (const uid of (first.memberUids as string[]) ?? []) {
      const u = (await db.doc(`users/${uid}`).get()).data();
      const t = TXT[u?.locale === "nl" ? "nl" : "en"];
      await sendToUser(uid, {
        title: t.title(first.name),
        body: n === 3 ? t.first(n) : t.range(n - 2, n),
        url: `/wrapped/${n}`,
        tag: `wrapped-${babyId}-${n}`,
      }).catch(() => 0);
    }
  }
  return { readyN: ok ? n : (first.wrappedReadyN ?? null) };
}

/** Babies whose next period has ended: process them (called from the minute cron). */
export async function sweepDueWrapped(): Promise<number> {
  const snap = await adminDb().collection("babies").where("nextWrappedAt", "<=", Date.now()).limit(25).get();
  for (const d of snap.docs) await processBabyWrapped(d.id).catch(() => null);
  return snap.size;
}
