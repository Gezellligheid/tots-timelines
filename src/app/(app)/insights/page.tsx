"use client";
import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useApp } from "@/providers/Providers";
import { Segmented, Skeleton } from "@/components/ui";
import { Icon, type IconName } from "@/components/Icon";
import { CountUp, RevealText, WipeIn } from "@/components/motion";
import { Bars, GrowthChart, RhythmRing } from "@/components/charts";
import { LogSheet } from "@/components/LogSheet";
import { loadGrowth, ageMonths, sexKey, type GrowthMetric } from "@/lib/growth";
import { DAY, dayKey, dayNightSleep, feedIntervals, fmtDur, longestSleep, sleepMs, startOfDay } from "@/lib/stats";
import { gToLb, cmToIn, mlToOz } from "@/lib/units";

type Range = "day" | "week" | "month";

function Card({ title, tone, icon, children }: { title: string; tone: string; icon: IconName; children: React.ReactNode }) {
  return (
    <WipeIn>
      <div className="card p-5">
        <div className="mb-4 flex items-center gap-3">
          <span className={`grid h-10 w-10 place-items-center rounded-full bg-${tone} text-${tone}-ink`}><Icon name={icon} size={20} /></span>
          <h2 className="text-lg font-extrabold">{title}</h2>
        </div>
        {children}
      </div>
    </WipeIn>
  );
}

export default function InsightsPage() {
  const t = useTranslations("insights");
  const locale = useLocale();
  const { baby, events, growth, userDoc, eventsReady } = useApp();
  const [range, setRange] = useState<Range>("week");
  const [metric, setMetric] = useState<GrowthMetric>("weight");
  const [tbl, setTbl] = useState<Awaited<ReturnType<typeof loadGrowth>> | null>(null);
  const [sheet, setSheet] = useState<{ x: number; y: number } | null>(null);
  const units = userDoc?.units ?? "metric";
  const imp = units === "imperial";
  useEffect(() => { loadGrowth().then(setTbl); }, []);

  const days = range === "day" ? 1 : range === "week" ? 7 : 30;
  const now = Date.now();
  const d0 = startOfDay(now);

  const calc = useMemo(() => {
    const keys = Array.from({ length: days }, (_, i) => d0 - (days - 1 - i) * DAY);
    const from = keys[0];
    const inR = events.filter((e) => e.start >= from);
    const feeds = inR.filter((e) => e.type === "feed" && e.data.method !== "pump");
    const diapers = inR.filter((e) => e.type === "diaper");
    const perDay = keys.map((k) => {
      const key = dayKey(k);
      const de = inR.filter((e) => dayKey(e.start) === key);
      const f = de.filter((e) => e.type === "feed" && e.data.method !== "pump");
      return {
        k,
        feeds: f.length,
        ml: f.reduce((a, e) => a + (e.data.ml ?? 0), 0),
        sleep: sleepMs(events, k, k + DAY, now) / 3600000,
        wet: de.filter((e) => e.type === "diaper" && e.data.kind !== "dirty").length,
        dirty: de.filter((e) => e.type === "diaper" && e.data.kind !== "wet").length,
      };
    });
    const active = Math.max(1, perDay.filter((p) => p.feeds || p.sleep || p.wet || p.dirty).length);
    const gaps = feedIntervals(feeds);
    const dn = dayNightSleep(inR, now);
    const sleeps = inR.filter((e) => e.type === "sleep" && e.end);
    // peak feed hour
    const hours = new Array(24).fill(0);
    feeds.forEach((e) => hours[new Date(e.start).getHours()]++);
    const peak = hours.indexOf(Math.max(...hours));
    // week-over-week sleep
    const w1 = sleepMs(events, now - 7 * DAY, now, now), w0 = sleepMs(events, now - 14 * DAY, now - 7 * DAY, now);
    const trend = w0 > 0 ? (w1 - w0) / 7 : 0;
    return {
      perDay, active, feeds, diapers,
      feedsPerDay: feeds.length / active,
      mlPerDay: perDay.reduce((a, p) => a + p.ml, 0) / active,
      avgGap: gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0,
      sleepPerDay: perDay.reduce((a, p) => a + p.sleep, 0) / active,
      longest: longestSleep(inR),
      naps: sleeps.filter((e) => e.data.kind !== "night").length / active,
      wetPerDay: perDay.reduce((a, p) => a + p.wet, 0) / active,
      dirtyPerDay: perDay.reduce((a, p) => a + p.dirty, 0) / active,
      nightPct: dn.day + dn.night ? Math.round((dn.night / (dn.day + dn.night)) * 100) : 0,
      peak: feeds.length ? peak : null,
      trend,
    };
  }, [events, days, d0, now]);

  const labelFor = (k: number) => (days <= 7 ? new Date(k).toLocaleDateString(locale, { weekday: "short" }).slice(0, 3) : String(new Date(k).getDate()));

  const patterns: string[] = [];
  if (calc.avgGap) patterns.push(t("pat.feedGap", { dur: fmtDur(calc.avgGap) }));
  if (calc.longest) patterns.push(t("pat.longestSleep", { dur: fmtDur(calc.longest) }));
  if (calc.nightPct) patterns.push(t("pat.dayNight", { pct: calc.nightPct }));
  if (calc.peak != null) patterns.push(t("pat.peakFeed", { h: calc.peak }));
  if (Math.abs(calc.trend) > 5 * 60000) patterns.push(t(calc.trend > 0 ? "pat.sleepTrendUp" : "pat.sleepTrendDown", { dur: fmtDur(Math.abs(calc.trend)) }));
  if (calc.wetPerDay) patterns.push(t("pat.wet", { n: +calc.wetPerDay.toFixed(1) }));

  // growth series
  const series = useMemo(() => {
    if (!baby) return [];
    const pts = growth.map((g) => ({ month: ageMonths(baby.birthDate, g.start, baby.gestationWeeks), value: metric === "weight" ? g.data.weightG && g.data.weightG / 1000 : metric === "length" ? g.data.lengthCm : g.data.headCm })).filter((p) => p.value) as { month: number; value: number }[];
    const birth = metric === "weight" ? baby.birthWeightG && baby.birthWeightG / 1000 : metric === "length" ? baby.birthLengthCm : baby.birthHeadCm;
    if (birth && !pts.some((p) => p.month < 0.1)) pts.unshift({ month: 0, value: birth });
    return pts;
  }, [growth, baby, metric]);

  if (!baby) return null;
  const maxMonth = Math.min(24, Math.max(6, Math.ceil(Math.max(0, ...series.map((p) => p.month)) + 2)));
  const rows = tbl?.[metric][sexKey(baby.sex)];
  const convert = metric === "weight" ? (v: number) => (imp ? gToLb(v * 1000) : v) : (v: number) => (imp ? cmToIn(v) : v);
  const gUnit = metric === "weight" ? (imp ? "lb" : "kg") : imp ? "in" : "cm";

  const stat = (label: string, value: number, decimals = 0, suffix = "") => (
    <div className="rounded-[22px] bg-surface2 p-3">
      <p className="text-2xl font-extrabold tabular-nums"><CountUp value={value} decimals={decimals} />{suffix}</p>
      <p className="text-xs font-semibold text-soft">{label}</p>
    </div>
  );

  const noData = !events.length;

  return (
    <div className="space-y-5 pt-2">
      <h1 className="text-3xl font-extrabold"><RevealText text={t("title")} /></h1>
      <Segmented value={range} onChange={setRange} options={[{ value: "day", label: t("day") }, { value: "week", label: t("week") }, { value: "month", label: t("month") }]} />

      {!eventsReady ? <Skeleton className="h-56" /> : noData ? <p className="card p-6 text-center text-soft">{t("noData")}</p> : (
        <>
          <Card title={t("feeding")} tone="butter" icon="bottle">
            <div className="mb-4 grid grid-cols-3 gap-2">
              {stat(t("feedsPerDay"), calc.feedsPerDay, 1)}
              {stat(t("avgGap"), calc.avgGap / 3600000, 1, "h")}
              {calc.mlPerDay > 0 ? stat(imp ? "oz / day" : t("avgMl"), imp ? mlToOz(calc.mlPerDay) : calc.mlPerDay) : stat(t("longest"), calc.longest / 3600000, 1, "h")}
            </div>
            {range !== "day" && <Bars data={calc.perDay.map((p) => ({ label: labelFor(p.k), parts: [{ v: p.feeds, color: "var(--butter-ink)" }] }))} />}
          </Card>

          <Card title={t("sleep")} tone="blush" icon="moon">
            <div className="mb-4 grid grid-cols-3 gap-2">
              {stat(t("avgSleep"), calc.sleepPerDay, 1, "h")}
              {stat(t("longest"), calc.longest / 3600000, 1, "h")}
              {stat(t("naps"), calc.naps, 1)}
            </div>
            {range !== "day" && <Bars unit="h" data={calc.perDay.map((p) => ({ label: labelFor(p.k), parts: [{ v: p.sleep, color: "var(--blush-ink)" }] }))} />}
            {calc.nightPct > 0 && (
              <div className="mt-4">
                <div className="flex h-3 overflow-hidden rounded-full bg-line">
                  <div style={{ width: `${100 - calc.nightPct}%`, background: "var(--butter-ink)" }} />
                  <div style={{ width: `${calc.nightPct}%`, background: "var(--lavender-ink)" }} />
                </div>
                <div className="mt-1.5 flex justify-between text-xs font-semibold text-soft"><span>{t("dayShare")} {100 - calc.nightPct}%</span><span>{t("nightShare")} {calc.nightPct}%</span></div>
              </div>
            )}
          </Card>

          <Card title={t("diapers")} tone="lavender" icon="diaper">
            <div className="mb-4 grid grid-cols-2 gap-2">
              {stat(t("wetPerDay"), calc.wetPerDay, 1)}
              {stat(t("dirtyPerDay"), calc.dirtyPerDay, 1)}
            </div>
            {range !== "day" && <Bars data={calc.perDay.map((p) => ({ label: labelFor(p.k), parts: [{ v: p.wet, color: "var(--sky-ink)" }, { v: p.dirty, color: "var(--peach-ink)" }] }))} />}
          </Card>

          <Card title={t("rhythm")} tone="mint" icon="timeline">
            <RhythmRing events={events} />
            <div className="mt-3 flex justify-center gap-4 text-xs font-semibold text-soft">
              {[["var(--blush-ink)", t("legendSleep")], ["var(--butter-ink)", t("legendFeed")], ["var(--lavender-ink)", t("legendDiaper")]].map(([c, l]) => (
                <span key={l} className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />{l}</span>
              ))}
            </div>
          </Card>

          <Card title={t("patterns")} tone="sky" icon="star">
            {patterns.length ? <ul className="space-y-2.5">{patterns.map((p) => <li key={p} className="flex gap-2.5 font-semibold"><span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-sky-ink" />{p}</li>)}</ul> : <p className="text-soft">{t("pat.none")}</p>}
          </Card>
        </>
      )}

      <Card title={t("growth")} tone="mint" icon="sprout">
        <div className="mb-3"><Segmented value={metric} onChange={setMetric} options={(["weight", "length", "head"] as GrowthMetric[]).map((m) => ({ value: m, label: t(m) }))} /></div>
        {rows ? <GrowthChart rows={rows} points={series} maxMonth={maxMonth} convert={convert} unit={gUnit} /> : <Skeleton className="h-48" />}
        <p className="mt-2 text-xs text-soft">WHO · P3 · P15 · P50 · P85 · P97. {t("typicalNote")}</p>
        {!series.length && <p className="mt-2 text-sm font-semibold text-soft">{t("growthEmpty", { name: baby.name })}</p>}
        <button className="ghost-btn mt-3 w-full" onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setSheet({ x: r.left + r.width / 2, y: r.top + r.height / 2 }); }}>
          <Icon name="plus" size={18} /> {t("addMeasurement")}
        </button>
      </Card>

      <LogSheet type={sheet ? "growth" : null} origin={sheet} onClose={() => setSheet(null)} />
    </div>
  );
}
