"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useApp } from "@/providers/Providers";
import { Icon } from "@/components/Icon";
import { GrowthChart } from "@/components/charts";
import { ageText } from "@/lib/format";
import { ageMonths, loadGrowth, percentileOf, sexKey, zScore } from "@/lib/growth";
import { DAY, dayKey, feedIntervals, fmtDur, longestSleep, sleepMs, startOfDay } from "@/lib/stats";
import { cmToIn, fmtLength, fmtVolume, fmtWeight, gToLb } from "@/lib/units";
import { fmtTemp, tempStatus } from "@/lib/temp";

type Range = 7 | 14 | 30;
type Tables = Awaited<ReturnType<typeof loadGrowth>>;

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="print-keep mt-7">
      <h2 className="mb-3 border-b border-[var(--line)] pb-1.5 text-[13px] font-extrabold uppercase tracking-wider text-[var(--soft)]">{title}</h2>
      {children}
    </section>
  );
}
const Stat = ({ label, value, tone }: { label: string; value: string; tone: string }) => (
  <div className={`rounded-2xl bg-${tone} p-3.5`}>
    <p className="text-2xl font-extrabold leading-none tabular-nums">{value}</p>
    <p className="mt-1.5 text-[11px] font-semibold opacity-70">{label}</p>
  </div>
);
const KV = ({ k, v }: { k: string; v: string }) => (
  <div className="flex items-baseline justify-between gap-4 border-b border-[var(--line)] py-1.5 text-sm">
    <span className="text-[var(--soft)]">{k}</span>
    <span className="font-bold tabular-nums">{v}</span>
  </div>
);

/** A one-glance summary for the pediatrician / consultation bureau. Meant to be printed or saved as PDF. */
export function DoctorReport() {
  const t = useTranslations("report");
  const tl = useTranslations("log");
  const tAge = useTranslations("age");
  const locale = useLocale();
  const router = useRouter();
  const { authReady, user, userDoc, baby, events, growth } = useApp();
  const units = userDoc?.units ?? "metric";
  const [days, setDays] = useState<Range>(14);
  const [questions, setQuestions] = useState("");
  const [tbl, setTbl] = useState<Tables | null>(null);

  useEffect(() => {
    if (authReady && !user) router.replace("/");
  }, [authReady, user, router]);
  useEffect(() => { loadGrowth().then(setTbl); }, []);
  useEffect(() => {
    if (!baby) return;
    try { setQuestions(localStorage.getItem(`tt-report-q-${baby.id}`) ?? ""); } catch {}
  }, [baby?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const d = useMemo(() => {
    const now = Date.now();
    const from = startOfDay(now) - (days - 1) * DAY;
    const inR = events.filter((e) => e.start >= from);
    const perDay = Array.from({ length: days }, (_, i) => from + i * DAY).map((k) => {
      const key = dayKey(k);
      const de = inR.filter((e) => dayKey(e.start) === key);
      const f = de.filter((e) => e.type === "feed" && e.data.method !== "pump");
      return {
        k,
        any: de.length > 0,
        feeds: f.length,
        ml: f.reduce((a, e) => a + (e.data.ml ?? 0), 0),
        breastMin: f.filter((e) => e.data.method === "breast" && e.end).reduce((a, e) => a + Math.min(90, (e.end! - e.start) / 60000), 0),
        sleepH: sleepMs(events, k, k + DAY, now) / 3600000,
        wet: de.filter((e) => e.type === "diaper" && e.data.kind !== "dirty").length,
        dirty: de.filter((e) => e.type === "diaper" && e.data.kind !== "wet").length,
        vitamin: de.some((e) => e.type === "supplement"),
      };
    });
    const active = Math.max(1, perDay.filter((p) => p.any).length);
    const avg = (f: (p: (typeof perDay)[number]) => number) => perDay.reduce((a, p) => a + f(p), 0) / active;
    const feeds = inR.filter((e) => e.type === "feed" && e.data.method !== "pump");
    const gaps = feedIntervals(feeds);
    const colours = new Map<string, number>();
    inR.filter((e) => e.type === "diaper" && e.data.color).forEach((e) => colours.set(e.data.color!, (colours.get(e.data.color!) ?? 0) + 1));
    const temps = inR.filter((e) => e.type === "temperature" && e.data.tempC != null).sort((a, b) => a.start - b.start);
    return {
      perDay,
      active,
      feedsPerDay: avg((p) => p.feeds),
      mlPerDay: avg((p) => p.ml),
      breastMinPerDay: avg((p) => p.breastMin),
      avgGap: gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0,
      sleepPerDay: avg((p) => p.sleepH),
      longest: longestSleep(inR),
      naps: inR.filter((e) => e.type === "sleep" && e.end && e.data.kind !== "night").length / active,
      wetPerDay: avg((p) => p.wet),
      dirtyPerDay: avg((p) => p.dirty),
      colours: [...colours.entries()],
      temps,
      maxTemp: temps.length ? Math.max(...temps.map((e) => e.data.tempC!)) : null,
      vitaminDays: perDay.filter((p) => p.vitamin).length,
    };
  }, [events, days]);

  const rows = useMemo(() => {
    if (!baby) return [];
    return growth.map((g) => {
      const m = ageMonths(baby.birthDate, g.start, baby.gestationWeeks);
      const sx = sexKey(baby.sex);
      const p = (key: "weight" | "length" | "head", v?: number) => (tbl && v ? Math.round(percentileOf(zScore(tbl[key][sx], m, key === "weight" ? v / 1000 : v))) : null);
      return { g, m, pw: p("weight", g.data.weightG), pl: p("length", g.data.lengthCm), ph: p("head", g.data.headCm) };
    });
  }, [growth, baby, tbl]);

  if (!baby) return <div className="grid min-h-dvh place-items-center text-[var(--soft)]">…</div>;
  const imp = units === "imperial";
  const birth = new Date(baby.birthDate + "T12:00:00");
  const fmtDate = (ts: number) => new Date(ts).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
  const wPts = [
    ...(baby.birthWeightG ? [{ month: 0, value: baby.birthWeightG / 1000 }] : []),
    ...growth.filter((g) => g.data.weightG).map((g) => ({ month: ageMonths(baby.birthDate, g.start, baby.gestationWeeks), value: g.data.weightG! / 1000 })),
  ];
  const maxMonth = Math.min(24, Math.max(6, Math.ceil(Math.max(0, ...wPts.map((p) => p.month)) + 2)));
  const wRows = tbl?.weight[sexKey(baby.sex)];
  const hr = (n: number) => `${n.toFixed(1)} ${t("hoursShort")}`;

  return (
    <div className="force-light min-h-dvh bg-[#e9e6df] pb-10 print:bg-white print:pb-0">
      <style>{`@media print { @page { size: A4; margin: 14mm; } .report-sheet { box-shadow: none !important; margin: 0 !important; padding: 0 !important; max-width: none !important; } }`}</style>

      <div className="no-print sticky top-0 z-20 border-b border-black/10 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-[800px] flex-wrap items-center gap-2 px-4 py-3">
          <button className="glass-btn !h-10 !w-10" aria-label={t("back")} onClick={() => router.back()}><Icon name="back" size={20} /></button>
          <div className="flex flex-1 gap-1.5">
            {([7, 14, 30] as Range[]).map((r) => (
              <button key={r} onClick={() => setDays(r)} className={`h-10 rounded-full px-4 text-sm font-bold ${days === r ? "on-ink" : "bg-[#f1efe9]"}`}>{t(`range${r}`)}</button>
            ))}
          </div>
          <button className="pill-btn !h-10 !px-5 !text-sm" onClick={() => window.print()}><Icon name="download" size={18} />{t("print")}</button>
        </div>
      </div>

      <article className="report-sheet mx-auto mt-6 w-full max-w-[800px] rounded-2xl bg-white p-8 shadow-xl">
        <header className="flex items-start justify-between gap-6 border-b-2 border-[var(--ink)] pb-5">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-widest text-[var(--soft)]">{t("title")}</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight">{baby.name}</h1>
            <p className="mt-1 text-sm font-medium text-[var(--soft)]">{t("forBaby", { date: fmtDate(birth.getTime()), age: ageText(baby.birthDate, tAge) })}</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-bold">{t("period", { n: days })}</p>
            <p className="text-[var(--soft)]">{fmtDate(d.perDay[0].k)} – {fmtDate(Date.now())}</p>
          </div>
        </header>

        <Sec title={t("overview")}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat tone="butter" label={t("feedsPerDay")} value={d.feedsPerDay.toFixed(1)} />
            <Stat tone="blush" label={t("sleepPerDay")} value={hr(d.sleepPerDay)} />
            <Stat tone="lavender" label={`${t("wetPerDay")} / ${t("dirtyPerDay")}`} value={`${d.wetPerDay.toFixed(1)} / ${d.dirtyPerDay.toFixed(1)}`} />
            <Stat tone="peach" label={t("highest")} value={d.maxTemp != null ? fmtTemp(d.maxTemp, units) : "–"} />
          </div>
        </Sec>

        <div className="grid gap-x-10 sm:grid-cols-2">
          <Sec title={t("feeding")}>
            <KV k={t("feedsPerDay")} v={d.feedsPerDay.toFixed(1)} />
            <KV k={t("avgGap")} v={d.avgGap ? fmtDur(d.avgGap) : "–"} />
            {d.mlPerDay > 0 && <KV k={t("bottlePerDay")} v={fmtVolume(d.mlPerDay, units)} />}
            {d.breastMinPerDay > 0 && <KV k={t("breastPerDay")} v={`${Math.round(d.breastMinPerDay)} ${t("minShort")}`} />}
          </Sec>
          <Sec title={t("sleep")}>
            <KV k={t("sleepPerDay")} v={hr(d.sleepPerDay)} />
            <KV k={t("longestStretch")} v={d.longest ? fmtDur(d.longest) : "–"} />
            <KV k={t("napsPerDay")} v={d.naps.toFixed(1)} />
          </Sec>
          <Sec title={t("diapers")}>
            <KV k={t("wetPerDay")} v={d.wetPerDay.toFixed(1)} />
            <KV k={t("dirtyPerDay")} v={d.dirtyPerDay.toFixed(1)} />
            {d.colours.length > 0 && <KV k={t("stoolColours")} v={d.colours.map(([c, n]) => `${tl(`color.${c}`)} ×${n}`).join(", ")} />}
          </Sec>
          {baby.vitamin?.enabled && (
            <Sec title={baby.vitamin.name || t("vitamin")}>
              <KV k={t("vitamin")} v={t("given", { n: d.vitaminDays, days })} />
            </Sec>
          )}
        </div>

        {d.temps.length > 0 && (
          <Sec title={t("temperature")}>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-[var(--soft)]"><th className="py-1 font-semibold">{t("date")}</th><th className="font-semibold">{t("value")}</th><th className="font-semibold">{t("method")}</th></tr></thead>
              <tbody>
                {d.temps.map((e) => (
                  <tr key={e.id} className="border-t border-[var(--line)]">
                    <td className="py-1.5">{new Date(e.start).toLocaleString(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                    <td className={`font-bold tabular-nums ${tempStatus(e.data.tempC!) === "fever" ? "text-[var(--blush-ink)]" : ""}`}>
                      {fmtTemp(e.data.tempC, units)} {tempStatus(e.data.tempC!) === "fever" && <span className="ml-1 rounded-full bg-[var(--blush)] px-2 py-0.5 text-[10px] uppercase">{t("fever")}</span>}
                    </td>
                    <td className="text-[var(--soft)]">{e.data.tempMethod ? tl(`temp.${e.data.tempMethod}`) : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Sec>
        )}

        {rows.length > 0 && (
          <Sec title={t("growth")}>
            {wRows && wPts.length > 0 && <GrowthChart rows={wRows} points={wPts} maxMonth={maxMonth} convert={(v) => (imp ? gToLb(v * 1000) : v)} unit={imp ? "lb" : "kg"} />}
            <table className="mt-3 w-full text-sm">
              <thead><tr className="text-left text-xs text-[var(--soft)]"><th className="py-1 font-semibold">{t("date")}</th><th className="font-semibold">{t("age")}</th><th className="font-semibold">{t("weight")}</th><th className="font-semibold">{t("length")}</th><th className="font-semibold">{t("head")}</th></tr></thead>
              <tbody>
                {rows.map(({ g, m, pw, pl, ph }) => (
                  <tr key={g.id} className="border-t border-[var(--line)]">
                    <td className="py-1.5">{fmtDate(g.start)}</td>
                    <td className="text-[var(--soft)]">{m.toFixed(1)} {t("monthsShort")}</td>
                    <td className="tabular-nums">{g.data.weightG ? fmtWeight(g.data.weightG, units) : "–"}{pw != null && <span className="ml-1 text-xs text-[var(--soft)]">P{pw}</span>}</td>
                    <td className="tabular-nums">{g.data.lengthCm ? fmtLength(g.data.lengthCm, units) : "–"}{pl != null && <span className="ml-1 text-xs text-[var(--soft)]">P{pl}</span>}</td>
                    <td className="tabular-nums">{g.data.headCm ? fmtLength(g.data.headCm, units) : "–"}{ph != null && <span className="ml-1 text-xs text-[var(--soft)]">P{ph}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-1 text-[11px] text-[var(--soft)]">WHO growth standards · {imp ? `${cmToIn(1).toFixed(2)} in = 1 cm` : ""}</p>
          </Sec>
        )}

        <Sec title={t("dailyLog")}>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-[var(--soft)]"><th className="py-1 font-semibold">{t("date")}</th><th className="font-semibold">{t("feedsCol")}</th><th className="font-semibold">{t("sleepCol")}</th><th className="font-semibold">{t("wetCol")}</th><th className="font-semibold">{t("dirtyCol")}</th></tr></thead>
            <tbody>
              {[...d.perDay].reverse().map((p) => (
                <tr key={p.k} className="border-t border-[var(--line)]">
                  <td className="py-1">{new Date(p.k).toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" })}</td>
                  <td className="tabular-nums">{p.any ? p.feeds : "–"}</td>
                  <td className="tabular-nums">{p.any ? hr(p.sleepH) : "–"}</td>
                  <td className="tabular-nums">{p.any ? p.wet : "–"}</td>
                  <td className="tabular-nums">{p.any ? p.dirty : "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Sec>

        <Sec title={t("questions")}>
          <textarea
            className="no-print min-h-[110px] w-full resize-none rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-3 text-sm outline-none"
            placeholder={t("questionsPh")}
            value={questions}
            onChange={(e) => {
              setQuestions(e.target.value);
              try { localStorage.setItem(`tt-report-q-${baby.id}`, e.target.value); } catch {}
            }}
          />
          {questions.trim() && <p className="hidden whitespace-pre-wrap text-sm print:block">{questions}</p>}
        </Sec>

        <footer className="mt-8 border-t border-[var(--line)] pt-3 text-[11px] leading-relaxed text-[var(--soft)]">
          <p>{t("disclaimer")}</p>
          <p>{t("created", { date: fmtDate(Date.now()) })}</p>
        </footer>
      </article>
    </div>
  );
}
