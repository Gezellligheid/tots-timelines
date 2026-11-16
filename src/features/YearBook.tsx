"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { addMonths, differenceInMonths } from "date-fns";
import { useLocale, useTranslations } from "next-intl";
import { useApp } from "@/providers/Providers";
import { Icon } from "@/components/Icon";
import { GrowthChart } from "@/components/charts";
import { PrintImage } from "@/components/PrintImage";
import { ageText } from "@/lib/format";
import { ageMonths, loadGrowth, percentileOf, sexKey, zScore } from "@/lib/growth";
import { fmtLength, fmtWeight, gToLb } from "@/lib/units";
import { loadSummary } from "@/lib/wrappedLoad";
import { birthMidnight, type WrappedSummary } from "@/lib/wrapped";
import type { EventDoc } from "@/lib/types";

const PER_PAGE = 4;

function Page({ tone = "white", children }: { tone?: string; children: React.ReactNode }) {
  return (
    <section className={`yb-page relative mx-auto mb-6 w-full max-w-[794px] overflow-hidden rounded-xl shadow-xl ${tone === "white" ? "bg-white" : `bg-${tone}`}`} style={{ aspectRatio: "210 / 297" }}>
      {children}
    </section>
  );
}

/** A printable keepsake of the first year (use "Save as PDF" in the print dialog). */
export function YearBook() {
  const t = useTranslations("yearbook");
  const tm = useTranslations("moments");
  const tAge = useTranslations("age");
  const locale = useLocale();
  const router = useRouter();
  const { authReady, user, userDoc, baby, moments, growth } = useApp();
  const units = userDoc?.units ?? "metric";
  const [sums, setSums] = useState<WrappedSummary[] | null>(null);
  const [tbl, setTbl] = useState<Awaited<ReturnType<typeof loadGrowth>> | null>(null);

  useEffect(() => {
    if (authReady && !user) router.replace("/");
  }, [authReady, user, router]);
  useEffect(() => { loadGrowth().then(setTbl); }, []);
  useEffect(() => {
    if (!baby) return;
    let live = true;
    (async () => {
      const m = differenceInMonths(new Date(), birthMidnight(baby.birthDate));
      const quarters = [3, 6, 9, 12].filter((n) => n - 3 <= m);
      const res = await Promise.all(quarters.map((n) => loadSummary(baby, n)));
      if (live) setSums(res.filter(Boolean) as WrappedSummary[]);
    })();
    return () => { live = false; };
  }, [baby?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const birth = baby ? birthMidnight(baby.birthDate) : new Date();
  const ageM = baby ? differenceInMonths(new Date(), birth) : 0;
  const full = ageM >= 12;
  const fmt = (d: Date | number, o: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }) => new Date(d).toLocaleDateString(locale, o);

  const totals = useMemo(() => {
    if (!sums?.length) return null;
    const sum = (f: (s: WrappedSummary) => number) => sums.reduce((a, s) => a + f(s), 0);
    return {
      days: sum((s) => s.days),
      feeds: sum((s) => s.feeds.count),
      litres: sum((s) => s.feeds.bottleMl) / 1000,
      breastH: sum((s) => s.feeds.breastMin) / 60,
      diapers: sum((s) => s.diapers.total),
      sleepH: sum((s) => s.sleep.totalH),
    };
  }, [sums]);

  const monthPages = useMemo(() => {
    if (!baby) return [];
    const end = addMonths(birth, 12).getTime();
    const list = moments.filter((m) => m.start < end).sort((a, b) => a.start - b.start);
    const byMonth = new Map<number, EventDoc[]>();
    for (const m of list) {
      const idx = differenceInMonths(new Date(m.start), birth) + 1;
      byMonth.set(idx, [...(byMonth.get(idx) ?? []), m]);
    }
    const pages: { month: number; items: EventDoc[]; first: boolean }[] = [];
    [...byMonth.entries()].sort((a, b) => a[0] - b[0]).forEach(([month, items]) => {
      for (let i = 0; i < items.length; i += PER_PAGE) pages.push({ month, items: items.slice(i, i + PER_PAGE), first: i === 0 });
    });
    return pages;
  }, [moments, baby]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!baby || !sums) {
    return <div className="force-light grid min-h-dvh place-items-center bg-[#e9e6df] font-semibold text-[var(--soft)]">{t("loading")}</div>;
  }

  const imp = units === "imperial";
  const pts = [
    ...(baby.birthWeightG ? [{ month: 0, value: baby.birthWeightG / 1000 }] : []),
    ...growth.filter((g) => g.data.weightG && g.start < addMonths(birth, 12).getTime()).map((g) => ({ month: ageMonths(baby.birthDate, g.start, baby.gestationWeeks), value: g.data.weightG! / 1000 })),
  ];
  const lastG = [...growth].filter((g) => g.start < addMonths(birth, 12).getTime()).sort((a, b) => b.start - a.start)[0];
  const wRows = tbl?.weight[sexKey(baby.sex)];
  const maxMonth = Math.min(24, Math.max(6, Math.ceil(Math.max(0, ...pts.map((p) => p.month)) + 1)));
  const pct = (key: "weight" | "length" | "head", v?: number) => {
    if (!tbl || !v || !lastG) return null;
    const m = ageMonths(baby.birthDate, lastG.start, baby.gestationWeeks);
    return Math.round(percentileOf(zScore(tbl[key][sexKey(baby.sex)], m, key === "weight" ? v / 1000 : v)));
  };
  const title = (m: EventDoc) => m.data.title || (m.data.milestone ? tm(`ms.${m.data.milestone}`) : tm("badgeMemory"));
  const empty = !monthPages.length && !totals;

  const tile = (tone: string, value: string, label: string) => (
    <div className={`rounded-3xl bg-${tone} p-6`}>
      <p className="text-5xl font-extrabold leading-none tracking-tight tabular-nums">{value}</p>
      <p className="mt-2 text-sm font-semibold opacity-70">{label}</p>
    </div>
  );

  return (
    <div className="force-light min-h-dvh bg-[#e9e6df] pb-10 print:bg-white print:pb-0">
      <style>{`@media print { @page { size: A4; margin: 0 } .yb-page { width: 210mm !important; height: 297mm !important; max-width: none !important; margin: 0 !important; border-radius: 0 !important; box-shadow: none !important; break-after: page; } }`}</style>

      <div className="no-print sticky top-0 z-20 border-b border-black/10 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-[794px] items-center gap-3 px-4 py-3">
          <button className="glass-btn !h-10 !w-10" aria-label={t("back")} onClick={() => router.back()}><Icon name="back" size={20} /></button>
          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--soft)]">{t("tip")}</p>
          <button className="pill-btn !h-10 !px-5 !text-sm" onClick={() => window.print()}><Icon name="download" size={18} />{t("print")}</button>
        </div>
      </div>

      <div className="pt-6">
        {/* cover */}
        <Page tone="lavender">
          <span className="absolute -left-24 -top-16 h-80 w-80 rounded-full bg-blush" />
          <span className="absolute -bottom-24 -right-20 h-96 w-96 rounded-full bg-mint" />
          <span className="absolute right-10 top-24 h-24 w-24 rounded-full bg-butter" />
          <div className="relative flex h-full flex-col items-center justify-center px-12 text-center">
            <PrintImage
              photoKey={baby.photoKey}
              className="h-72 w-72 rounded-full border-[10px] border-white shadow-lg"
              fallback={<span className="grid h-full w-full place-items-center bg-butter text-[var(--butter-ink)]"><Icon name="baby" size={140} strokeWidth={1.6} /></span>}
            />
            <h1 className="mt-10 text-6xl font-extrabold leading-[1.05] tracking-tight">{full ? t("coverTitle", { name: baby.name }) : t("coverSoFar", { name: baby.name })}</h1>
            <p className="mt-4 text-xl font-semibold opacity-70">{fmt(birth)} – {fmt(full ? addMonths(birth, 12) : new Date())}</p>
          </div>
        </Page>

        {empty && (
          <Page>
            <div className="grid h-full place-items-center p-16 text-center text-xl font-semibold text-[var(--soft)]">{t("empty")}</div>
          </Page>
        )}

        {/* the year in numbers */}
        {totals && (
          <Page>
            <div className="flex h-full flex-col px-14 py-16">
              <p className="text-sm font-extrabold uppercase tracking-widest text-[var(--soft)]">{baby.name}</p>
              <h2 className="mt-2 text-5xl font-extrabold tracking-tight">{t("numbersTitle")}</h2>
              <div className="mt-10 grid grid-cols-2 gap-5">
                {tile("butter", String(totals.feeds), t("feedsLabel"))}
                {tile("sky", String(totals.diapers), t("diapersLabel"))}
                {tile("blush", String(Math.round(totals.sleepH)), t("sleepHours"))}
                {tile("mint", String(totals.days), t("daysLogged"))}
                {totals.litres > 0 && tile("peach", totals.litres.toFixed(1), t("litres"))}
                {totals.breastH > 0 && tile("lavender", totals.breastH.toFixed(0), t("breastHours"))}
              </div>
              <div className="mt-auto space-y-2 text-lg font-semibold text-[var(--soft)]">
                <p>{t("funDiapers", { m: Math.max(1, Math.round(totals.diapers * 0.3)) })}</p>
                <p>{t("funSleep", { d: (totals.sleepH / 24).toFixed(1) })}</p>
              </div>
            </div>
          </Page>
        )}

        {/* growth */}
        {pts.length > 1 && wRows && (
          <Page>
            <div className="flex h-full flex-col px-14 py-16">
              <h2 className="text-5xl font-extrabold tracking-tight">{t("growthTitle")}</h2>
              <div className="mt-10 rounded-3xl bg-mint/40 p-6">
                <GrowthChart rows={wRows} points={pts} maxMonth={maxMonth} convert={(v) => (imp ? gToLb(v * 1000) : v)} unit={imp ? "lb" : "kg"} />
              </div>
              {lastG && (
                <div className="mt-8 grid grid-cols-3 gap-4">
                  {([
                    [t("weight"), baby.birthWeightG ? fmtWeight(baby.birthWeightG, units) : "–", lastG.data.weightG ? fmtWeight(lastG.data.weightG, units) : "–", pct("weight", lastG.data.weightG)],
                    [t("length"), baby.birthLengthCm ? fmtLength(baby.birthLengthCm, units) : "–", lastG.data.lengthCm ? fmtLength(lastG.data.lengthCm, units) : "–", pct("length", lastG.data.lengthCm)],
                    [t("head"), baby.birthHeadCm ? fmtLength(baby.birthHeadCm, units) : "–", lastG.data.headCm ? fmtLength(lastG.data.headCm, units) : "–", pct("head", lastG.data.headCm)],
                  ] as const).map(([label, a, b, p]) => (
                    <div key={label} className="rounded-2xl bg-[var(--surface-2)] p-4">
                      <p className="text-xs font-extrabold uppercase tracking-wide text-[var(--soft)]">{label}</p>
                      <p className="mt-1 text-sm text-[var(--soft)]">{a}</p>
                      <p className="text-2xl font-extrabold tabular-nums">{b}</p>
                      {p != null && <p className="text-xs font-semibold text-[var(--mint-ink)]">P{p}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Page>
        )}

        {/* months with moments */}
        {monthPages.map((pg, i) => (
          <Page key={`${pg.month}-${i}`}>
            <div className="flex h-full flex-col px-12 py-14">
              <p className="text-sm font-extrabold uppercase tracking-widest text-[var(--soft)]">{fmt(addMonths(birth, pg.month - 1), { month: "long", year: "numeric" })}</p>
              <h2 className="mt-1 text-5xl font-extrabold tracking-tight">{t("monthTitle", { n: pg.month })}</h2>
              <div className="mt-8 grid flex-1 grid-cols-2 content-start gap-5">
                {pg.items.map((m, j) =>
                  m.photoKey ? (
                    <figure key={m.id} className="overflow-hidden rounded-3xl bg-[var(--surface-2)]">
                      <PrintImage photoKey={m.photoKey} className="aspect-[4/3] w-full" />
                      <figcaption className="p-4">
                        <p className="text-lg font-extrabold leading-tight">{title(m)}</p>
                        {m.note && <p className="mt-1 text-sm leading-snug opacity-75">{m.note}</p>}
                        <p className="mt-1.5 text-xs font-semibold text-[var(--soft)]">{fmt(m.start, { day: "numeric", month: "long" })} · {ageText(baby.birthDate, tAge, new Date(m.start))}</p>
                      </figcaption>
                    </figure>
                  ) : (
                    <div key={m.id} className={`rounded-3xl p-5 ${["bg-butter", "bg-sky", "bg-peach", "bg-mint"][(i + j) % 4]}`}>
                      <Icon name={m.data.milestone ? "star" : "heart"} size={22} />
                      <p className="mt-3 text-xl font-extrabold leading-tight">{title(m)}</p>
                      {m.note && <p className="mt-2 text-sm leading-snug opacity-80">{m.note}</p>}
                      <p className="mt-2 text-xs font-semibold opacity-60">{fmt(m.start, { day: "numeric", month: "long" })} · {ageText(baby.birthDate, tAge, new Date(m.start))}</p>
                    </div>
                  ),
                )}
              </div>
            </div>
          </Page>
        ))}

        {/* closing */}
        <Page tone="butter">
          <span className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-blush" />
          <span className="absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-lavender" />
          <div className="relative flex h-full flex-col items-center justify-center px-14 text-center">
            <span className="grid h-28 w-28 place-items-center rounded-full bg-white text-[var(--butter-ink)]"><Icon name="heart" size={60} /></span>
            <h2 className="mt-10 text-5xl font-extrabold leading-tight tracking-tight">{t("closingTitle")}</h2>
            <p className="mt-5 max-w-md text-xl font-medium opacity-75">{t("closingBody")}</p>
            <p className="mt-16 text-sm font-semibold opacity-50">Tots &amp; Timelines</p>
          </div>
        </Page>
      </div>
    </div>
  );
}
