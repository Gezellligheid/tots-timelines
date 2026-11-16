import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { adminDb } from "@/lib/server/admin";
import { presignGet } from "@/lib/server/r2";
import { ageText } from "@/lib/format";
import { Icon } from "@/components/Icon";

// A public, read-only page for grandparents and friends. Only moments the parents marked as shared are shown.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Family", robots: { index: false, follow: false } };

interface Shared {
  id: string;
  start: number;
  title?: string;
  milestone?: string;
  note?: string;
  url?: string;
}

export default async function FamilyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{48}$/.test(token)) notFound();

  const db = adminDb();
  const share = (await db.doc(`shares/${token}`).get()).data();
  if (!share) notFound();
  const baby = (await db.doc(`babies/${share.babyId}`).get()).data();
  if (!baby || baby.familyToken !== token) notFound();

  const snap = await db.collection(`babies/${share.babyId}/events`).where("type", "==", "moment").get();
  type MomentDoc = { id: string; start: number; note?: string; photoKey?: string; data?: { shared?: boolean; title?: string; milestone?: string } };
  const docs = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as MomentDoc)
    .filter((m) => m.data?.shared === true)
    .sort((a, b) => b.start - a.start)
    .slice(0, 60);
  const items: Shared[] = await Promise.all(
    docs.map(async (m) => ({
      id: m.id,
      start: m.start,
      title: m.data?.title,
      milestone: m.data?.milestone,
      note: m.note,
      url: m.photoKey ? await presignGet(m.photoKey).catch(() => undefined) : undefined,
    })),
  );
  const avatar = baby.photoKey ? await presignGet(baby.photoKey).catch(() => undefined) : undefined;

  const t = await getTranslations("family");
  const tm = await getTranslations("moments");
  const tAge = await getTranslations("age");
  const locale = await getLocale();

  return (
    <main className="mx-auto min-h-dvh w-full max-w-[520px] px-5 pb-16 pt-10">
      <header className="text-center">
        <span className={`mx-auto grid h-28 w-28 place-items-center overflow-hidden rounded-full bg-${baby.color ?? "lavender"} text-${baby.color ?? "lavender"}-ink shadow-[var(--shadow)]`}>
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            <Icon name="baby" size={64} />
          )}
        </span>
        <h1 className="mt-5 text-3xl font-extrabold tracking-tight">{t("title", { name: baby.name })}</h1>
        <p className="mt-1 text-[15px] font-medium text-soft">{t("sub", { age: ageText(baby.birthDate, tAge) })}</p>
      </header>

      <div className="mt-9 space-y-5">
        {items.map((m) => {
          const title = m.title || (m.milestone ? tm(`ms.${m.milestone}`) : tm("badgeMemory"));
          const when = new Date(m.start);
          return (
            <article key={m.id} className="overflow-hidden rounded-[28px] bg-surface shadow-[var(--shadow)]">
              {m.url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.url} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover" />
              )}
              <div className="p-4">
                <span className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-sky px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-sky-ink">
                  <Icon name={m.milestone ? "star" : "heart"} size={12} />
                  {m.milestone ? tm("badgeMilestone") : tm("badgeMemory")}
                </span>
                <h2 className="text-xl font-extrabold leading-tight">{title}</h2>
                {m.note && <p className="mt-2 text-[15px] leading-relaxed opacity-80">{m.note}</p>}
                <p className="mt-2 text-xs font-semibold text-soft">
                  {when.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })} · {ageText(baby.birthDate, tAge, when)}
                </p>
              </div>
            </article>
          );
        })}
        {!items.length && <p className="rounded-[24px] bg-surface p-6 text-center font-medium text-soft shadow-[var(--shadow)]">{t("empty")}</p>}
      </div>

      <p className="mt-12 text-center text-xs font-semibold text-soft">{t("footer")}</p>
    </main>
  );
}
