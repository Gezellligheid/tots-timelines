"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { collection, doc, getDoc, getDocs, orderBy, query, setDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useApp } from "@/providers/Providers";
import { Icon } from "@/components/Icon";
import { CountUp, EASE, MaskReveal, RevealText } from "@/components/motion";
import { BabyAvatar, PhotoImage } from "@/components/ui";
import { useMomentTitleKey } from "@/components/MomentCard";
import { usePeriodLabel } from "@/components/WrappedGate";
import { computeWrapped, periodBounds, wrappedKey, type GrowthPoint, type WrappedSummary } from "@/lib/wrapped";
import { ageMonths, loadGrowth, percentileOf, sexKey, zScore, type GrowthMetric } from "@/lib/growth";
import { fmtDur } from "@/lib/stats";
import { ageText } from "@/lib/format";
import { fmtLength, fmtWeight } from "@/lib/units";
import type { AccentName, Baby, EventDoc, Units } from "@/lib/types";

const SLIDE_MS = 8000;
type Tone = AccentName;

/* ---------------- small building blocks ---------------- */
function Stage({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <div className={`relative flex h-full flex-col justify-center overflow-hidden px-8 pb-24 pt-28 bg-${tone}`}>
      <span className="breathe absolute -left-20 top-24 h-64 w-64 rounded-full bg-surface/40" />
      <motion.span className="absolute -right-16 bottom-20 h-56 w-56 rounded-full bg-surface/30" animate={{ y: [0, -16, 0] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }} />
      <div className="relative">{children}</div>
    </div>
  );
}
const Kicker = ({ children, icon = "star" }: { children: React.ReactNode; icon?: "star" | "bottle" | "moon" | "diaper" | "sprout" | "timeline" | "heart" }) => (
  <motion.span initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-5 inline-flex items-center gap-2 rounded-full bg-surface/80 px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-wider">
    <Icon name={icon} size={14} /> {children}
  </motion.span>
);
function Big({ value, decimals = 0, delay = 0.3 }: { value: number; decimals?: number; delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay, type: "spring", stiffness: 180, damping: 16 }} className="text-[104px] font-extrabold leading-[0.95] tracking-tighter tabular-nums">
      <CountUp value={value} decimals={decimals} />
    </motion.div>
  );
}
const Line = ({ children, delay = 0.7, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) => (
  <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.7, ease: EASE }} className={`mt-3 text-xl font-bold leading-snug ${className}`}>
    {children}
  </motion.p>
);

/* ---------------- slides ---------------- */
function Intro({ s, baby, n }: { s: WrappedSummary; baby: Baby; n: number }) {
  const t = useTranslations("wrapped");
  const locale = useLocale();
  const fmt = (ts: number) => new Date(ts).toLocaleDateString(locale, { month: "short", year: "numeric" });
  return (
    <Stage tone="lavender">
      <MaskReveal className="mb-8 w-fit" origin="50% 50%" duration={1.1}>
        <div className="rounded-full bg-surface p-2 shadow-[var(--shadow)]"><BabyAvatar photoKey={baby.photoKey} color={baby.color} size={150} /></div>
      </MaskReveal>
      <Kicker>{t("introTag")}</Kicker>
      <h1 className="text-[44px] font-extrabold leading-[1.05] tracking-tight">
        <RevealText text={n === 3 ? t("introFirst", { name: baby.name, n }) : t("introRange", { name: baby.name, from: n - 2, to: n })} delay={0.35} />
      </h1>
      <Line delay={1.1} className="!text-base !font-semibold opacity-70">{fmt(s.from)} – {fmt(s.to - 1)}</Line>
    </Stage>
  );
}

function Logs({ s }: { s: WrappedSummary }) {
  const t = useTranslations("wrapped");
  return (
    <Stage tone="butter">
      <Line delay={0.1} className="!mt-0 mb-2 !text-2xl">{t("logsLead")}</Line>
      <Big value={s.logs} />
      <Line>{t("logsUnit", { days: s.days })}</Line>
      <Line delay={1.1} className="!text-base !font-semibold opacity-60">{t("logsFoot")}</Line>
    </Stage>
  );
}

function Feed({ s }: { s: WrappedSummary }) {
  const t = useTranslations("wrapped");
  const f = s.feeds;
  return (
    <Stage tone="peach">
      <Kicker icon="bottle">{t("feedTitle")}</Kicker>
      <Big value={f.count} />
      <Line>{t("feedsLabel")} · {t("feedPerDay", { n: +f.perDay.toFixed(1) })}</Line>
      <div className="mt-6 space-y-2.5">
        {f.bottleMl > 0 && <Chipline delay={1.0}>{t("bottleL", { l: +(f.bottleMl / 1000).toFixed(1) })}</Chipline>}
        {f.breastMin > 0 && <Chipline delay={1.2}>{t("breastH", { h: +(f.breastMin / 60).toFixed(1) })}</Chipline>}
        {f.peakHour != null && <Chipline delay={1.4}>{t("peak", { h: f.peakHour })}</Chipline>}
      </div>
    </Stage>
  );
}
const Chipline = ({ children, delay }: { children: React.ReactNode; delay: number }) => (
  <motion.div initial={{ clipPath: "inset(0 100% 0 0 round 999px)" }} animate={{ clipPath: "inset(0 0% 0 0 round 999px)" }} transition={{ delay, duration: 0.8, ease: EASE }} className="w-fit rounded-full bg-surface/80 px-4 py-2.5 text-[15px] font-bold">
    {children}
  </motion.div>
);

function Diapers({ s }: { s: WrappedSummary }) {
  const t = useTranslations("wrapped");
  const d = s.diapers;
  const meters = Math.max(1, Math.round(d.total * 0.3));
  return (
    <Stage tone="sky">
      <Kicker icon="diaper">{t("diaperTitle")}</Kicker>
      <Big value={d.total} />
      <Line>{t("diapersLabel")} · {t("diaperSplit", { wet: d.wet, dirty: d.dirty })}</Line>
      <div className="mt-8 flex h-24 items-end gap-2">
        {Array.from({ length: 9 }, (_, i) => (
          <motion.span key={i} className="w-full rounded-[10px] bg-surface/70" style={{ height: 24 + i * 8 }} initial={{ clipPath: "inset(100% 0 0 0 round 10px)" }} animate={{ clipPath: "inset(0% 0 0 0 round 10px)" }} transition={{ delay: 0.9 + i * 0.08, duration: 0.7, ease: EASE }} />
        ))}
      </div>
      <Line delay={1.7} className="!text-base !font-semibold opacity-70">{t("diaperFun", { m: meters })}</Line>
    </Stage>
  );
}

function Sleep({ s }: { s: WrappedSummary }) {
  const t = useTranslations("wrapped");
  const sl = s.sleep;
  const max = Math.max(sl.longestFirstMs, sl.longestLastMs, 1);
  const grew = sl.longestLastMs - sl.longestFirstMs;
  return (
    <Stage tone="blush">
      <Kicker icon="moon">{t("sleepTitle")}</Kicker>
      <Big value={Math.round(sl.totalH)} />
      <Line>{t("sleepHours")} · {t("sleepDays", { d: +(sl.totalH / 24).toFixed(1) })}</Line>
      {(sl.longestFirstMs > 0 || sl.longestLastMs > 0) && (
        <div className="mt-7 space-y-3">
          <p className="text-sm font-extrabold uppercase tracking-wide opacity-60">{t("sleepLongest")}</p>
          {([[t("sleepFirst"), sl.longestFirstMs, 1.0], [t("sleepLast"), sl.longestLastMs, 1.3]] as [string, number, number][]).map(([label, ms, d]) => (
            <div key={label}>
              <div className="mb-1 flex justify-between text-sm font-bold"><span>{label}</span><span>{fmtDur(ms)}</span></div>
              <div className="h-4 overflow-hidden rounded-full bg-surface/50">
                <motion.div className="h-full rounded-full bg-ink" initial={{ width: 0 }} animate={{ width: `${(ms / max) * 100}%` }} transition={{ delay: d, duration: 1.1, ease: EASE }} />
              </div>
            </div>
          ))}
          {grew > 10 * 60000 && <Line delay={1.9} className="!mt-2 !text-base">+{t("sleepGrew", { dur: fmtDur(grew) })}</Line>}
        </div>
      )}
    </Stage>
  );
}

function Rhythm({ s }: { s: WrappedSummary }) {
  const t = useTranslations("wrapped");
  const id = useId();
  const cx = 120, cy = 120;
  const maxFeed = Math.max(1, ...s.feeds.hourly);
  const pt = (r: number, a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  return (
    <Stage tone="lavender">
      <Kicker icon="timeline">{t("rhythmTitle")}</Kicker>
      <svg viewBox="0 0 240 240" className="mx-auto w-full max-w-[300px]">
        <mask id={id}>
          <motion.circle cx={cx} cy={cy} r={60} fill="none" stroke="#fff" strokeWidth={140} pathLength={1} strokeDasharray="1" initial={{ strokeDashoffset: 1 }} animate={{ strokeDashoffset: 0 }} transition={{ delay: 0.3, duration: 2, ease: EASE }} transform={`rotate(-90 ${cx} ${cy})`} />
        </mask>
        <g mask={`url(#${id})`}>
          {s.sleep.hourly.map((f, h) => {
            const a0 = (h / 24) * Math.PI * 2 - Math.PI / 2 + 0.03, a1 = ((h + 1) / 24) * Math.PI * 2 - Math.PI / 2 - 0.03;
            const [x0, y0] = pt(92, a0), [x1, y1] = pt(92, a1);
            return <path key={h} d={`M${x0} ${y0} A92 92 0 0 1 ${x1} ${y1}`} fill="none" stroke="var(--lavender-ink)" strokeWidth={28} strokeLinecap="round" opacity={0.12 + 0.88 * f} />;
          })}
          {s.feeds.hourly.map((c, h) => {
            if (!c) return null;
            const [x, y] = pt(58, ((h + 0.5) / 24) * Math.PI * 2 - Math.PI / 2);
            return <circle key={h} cx={x} cy={y} r={3 + 8 * (c / maxFeed)} fill="var(--butter-ink)" />;
          })}
        </g>
        {[0, 6, 12, 18].map((h) => {
          const [x, y] = pt(116, (h / 24) * Math.PI * 2 - Math.PI / 2);
          return <text key={h} x={x} y={y + 3} textAnchor="middle" fontSize="9" fontWeight="800" fill="var(--ink)" opacity={0.6}>{h}</text>;
        })}
      </svg>
      <Line delay={1.2} className="!text-base !font-semibold opacity-70 text-center">{t("rhythmSub")}</Line>
    </Stage>
  );
}

function Growth({ s, baby, units }: { s: WrappedSummary; baby: Baby; units: Units }) {
  const t = useTranslations("wrapped");
  const { start, end } = s.growth;
  const [pcts, setPcts] = useState<Partial<Record<GrowthMetric, number>>>({});
  useEffect(() => {
    if (!end) return;
    let live = true;
    loadGrowth().then((tbl) => {
      if (!live) return;
      const m = ageMonths(baby.birthDate, end.t, baby.gestationWeeks), sx = sexKey(baby.sex);
      const out: Partial<Record<GrowthMetric, number>> = {};
      if (end.weightG) out.weight = percentileOf(zScore(tbl.weight[sx], m, end.weightG / 1000));
      if (end.lengthCm) out.length = percentileOf(zScore(tbl.length[sx], m, end.lengthCm));
      if (end.headCm) out.head = percentileOf(zScore(tbl.head[sx], m, end.headCm));
      setPcts(out);
    });
    return () => { live = false; };
  }, [end, baby]);
  if (!end) return null;
  const rows: { key: GrowthMetric; label: string; a?: string; b?: string }[] = [
    { key: "weight" as GrowthMetric, label: t("weight"), a: start?.weightG ? fmtWeight(start.weightG, units) : undefined, b: end.weightG ? fmtWeight(end.weightG, units) : undefined },
    { key: "length" as GrowthMetric, label: t("length"), a: start?.lengthCm ? fmtLength(start.lengthCm, units) : undefined, b: end.lengthCm ? fmtLength(end.lengthCm, units) : undefined },
    { key: "head" as GrowthMetric, label: t("head"), a: start?.headCm ? fmtLength(start.headCm, units) : undefined, b: end.headCm ? fmtLength(end.headCm, units) : undefined },
  ].filter((r) => r.b);
  return (
    <Stage tone="mint">
      <Kicker icon="sprout">{t("growthTitle")}</Kicker>
      <div className="space-y-3">
        {rows.map((r, i) => (
          <motion.div key={r.key} initial={{ clipPath: "inset(0 100% 0 0 round 24px)" }} animate={{ clipPath: "inset(0 0% 0 0 round 24px)" }} transition={{ delay: 0.3 + i * 0.25, duration: 0.8, ease: EASE }} className="rounded-[24px] bg-surface/80 p-4">
            <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wide opacity-60"><span>{r.label}</span>{pcts[r.key] != null && <span className="rounded-full bg-mint px-2.5 py-0.5 normal-case tracking-normal text-mint-ink">{t("percentile", { n: Math.round(pcts[r.key]!) })}</span>}</div>
            <div className="mt-1 flex items-baseline gap-2 text-3xl font-extrabold tabular-nums">
              {r.a && <><span className="text-xl opacity-50">{r.a}</span><Icon name="chevR" size={18} /></>}
              <span>{r.b}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </Stage>
  );
}

/** Photo for a moment: private R2 photo, or an inline demo image on localhost. */
function MomentImage({ m, className = "" }: { m: WrappedSummary["moments"][number]; className?: string }) {
  if (m.photoKey) return <PhotoImage photoKey={m.photoKey} className={className} />;
  if (m.img) {
    return (
      <MaskReveal className={`overflow-hidden ${className}`} duration={0.9}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={m.img} alt="" className="h-full w-full object-cover" />
      </MaskReveal>
    );
  }
  return null;
}
const hasPhoto = (m: WrappedSummary["moments"][number]) => !!(m.photoKey || m.img);

/** Pick up to k items spread evenly across the list (first and last included). */
function spread<T>(arr: T[], k: number): T[] {
  if (arr.length <= k) return arr;
  return Array.from({ length: k }, (_, i) => arr[Math.round((i * (arr.length - 1)) / (k - 1))]);
}

function Moments({ s }: { s: WrappedSummary }) {
  const t = useTranslations("wrapped");
  const photos = spread(s.moments.filter(hasPhoto), 4);
  return (
    <Stage tone="sky">
      <Kicker>{t("momentsTitle")}</Kicker>
      <Big value={s.moments.length} />
      <Line>{t("momentsKeep")}</Line>
      {photos.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-3">
          {photos.map((m, i) => (
            <MaskReveal key={m.id} origin={i % 2 ? "100% 0%" : "0% 0%"} delay={0.8 + i * 0.2} duration={0.9}>
              <MomentImage m={m} className="aspect-square rounded-[24px]" />
            </MaskReveal>
          ))}
        </div>
      )}
    </Stage>
  );
}

/** One full-screen memory: the photo fills the screen and slowly zooms, with the story on top. */
function MemorySlide({ m, baby }: { m: WrappedSummary["moments"][number]; baby: Baby }) {
  const tm = useTranslations("moments");
  const tAge = useTranslations("age");
  const locale = useLocale();
  const title = useMomentTitleKey();
  const isMs = !!m.milestone;
  const when = new Date(m.t);
  return (
    <div className="relative h-full overflow-hidden bg-black text-white">
      <motion.div className="absolute inset-0" initial={{ scale: 1.02 }} animate={{ scale: 1.14 }} transition={{ duration: SLIDE_MS / 1000 + 1.5, ease: "linear" }}>
        <MomentImage m={m} className="absolute inset-0" />
      </motion.div>
      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,.78), rgba(0,0,0,.12) 55%, rgba(0,0,0,.28))" }} />
      <div className="absolute inset-x-0 bottom-0 px-8 pb-24">
        <motion.span initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-black">
          <Icon name={isMs ? "star" : "heart"} size={12} />
          {isMs ? tm("badgeMilestone") : tm("badgeMemory")}
        </motion.span>
        <h2 className="text-[38px] font-extrabold leading-[1.05] tracking-tight"><RevealText text={title(m)} delay={0.6} /></h2>
        {m.note && <Line delay={1.1} className="!text-base !font-medium text-white/85">{m.note}</Line>}
        <Line delay={1.3} className="!text-sm !font-semibold text-white/70">
          {when.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })} · {ageText(baby.birthDate, tAge, when)}
        </Line>
      </div>
    </div>
  );
}

/** A memory without a photo: the note becomes a big quote. */
function QuoteSlide({ m, baby, tone }: { m: WrappedSummary["moments"][number]; baby: Baby; tone: Tone }) {
  const tm = useTranslations("moments");
  const tAge = useTranslations("age");
  const locale = useLocale();
  const title = useMomentTitleKey();
  const when = new Date(m.t);
  return (
    <Stage tone={tone}>
      <Kicker icon="heart">{tm("badgeMemory")}</Kicker>
      <motion.span initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 0.25, scale: 1 }} transition={{ delay: 0.2, type: "spring" }} className="absolute left-7 top-32 text-[140px] font-extrabold leading-none">“</motion.span>
      <RevealText as="p" className="relative text-[32px] font-extrabold leading-[1.15] tracking-tight" text={m.note ?? ""} delay={0.4} />
      <Line delay={1.4} className="!text-lg">{title(m)}</Line>
      <Line delay={1.6} className="!mt-1 !text-sm !font-semibold opacity-60">
        {when.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })} · {ageText(baby.birthDate, tAge, when)}
      </Line>
    </Stage>
  );
}

/** All the milestones in order, like a little timeline. */
function MilestoneTimeline({ s, baby }: { s: WrappedSummary; baby: Baby }) {
  const t = useTranslations("wrapped");
  const tAge = useTranslations("age");
  const locale = useLocale();
  const title = useMomentTitleKey();
  const list = s.moments.filter((m) => m.milestone).slice(-6);
  return (
    <Stage tone="mint">
      <Kicker>{t("momentsSub", { n: list.length })}</Kicker>
      <h2 className="text-[34px] font-extrabold leading-[1.1] tracking-tight"><RevealText text={t("milestonesLead")} delay={0.2} /></h2>
      <div className="relative mt-8 space-y-5 border-l-2 border-ink/20 pl-6">
        {list.map((m, i) => (
          <motion.div key={m.id} className="relative" initial={{ clipPath: "inset(0 100% 0 0 round 16px)" }} animate={{ clipPath: "inset(0 0% 0 0 round 16px)" }} transition={{ delay: 0.6 + i * 0.3, duration: 0.8, ease: EASE }}>
            <span className="absolute -left-[33px] top-1.5 h-3.5 w-3.5 rounded-full bg-ink" />
            <p className="text-xl font-extrabold leading-tight">{title(m)}</p>
            <p className="text-sm font-semibold opacity-60">
              {new Date(m.t).toLocaleDateString(locale, { day: "numeric", month: "short" })} · {ageText(baby.birthDate, tAge, new Date(m.t))}
            </p>
          </motion.div>
        ))}
      </div>
    </Stage>
  );
}

function Outro({ baby, n, onDone, onReplay }: { baby: Baby; n: number; onDone: () => void; onReplay: () => void }) {
  const t = useTranslations("wrapped");
  return (
    <Stage tone="butter">
      <MaskReveal className="mb-8 w-fit" duration={1}>
        <span className="grid h-28 w-28 place-items-center rounded-full bg-surface text-butter-ink"><Icon name="heart" size={60} /></span>
      </MaskReveal>
      <h1 className="text-[40px] font-extrabold leading-[1.05] tracking-tight"><RevealText text={t("outroTitle")} delay={0.3} /></h1>
      <Line delay={0.9} className="!text-base !font-semibold opacity-70">{t("outroBody", { name: baby.name, n: n + 3 })}</Line>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }} className="mt-8 space-y-2" onClick={(e) => e.stopPropagation()}>
        <button className="pill-btn w-full" onClick={onDone}>{t("done")}</button>
        <button className="h-12 w-full text-[15px] font-bold opacity-70" onClick={onReplay}>{t("replay")}</button>
      </motion.div>
    </Stage>
  );
}

/* ---------------- the story ---------------- */
export function WrappedStory({ n, demo }: { n: number; demo?: WrappedSummary }) {
  const t = useTranslations("wrapped");
  const tc = useTranslations("common");
  const router = useRouter();
  const label = usePeriodLabel();
  const { authReady, user, baby, userDoc, patchUser } = useApp();
  const [summary, setSummary] = useState<WrappedSummary | null>(null);
  const [err, setErr] = useState(false);
  const [i, setI] = useState(0);
  const [layer, setLayer] = useState(1);
  const [origin, setOrigin] = useState("50% 100%");
  const units = userDoc?.units ?? "metric";
  const exit = () => router.replace(demo ? "/profile" : "/home");

  useEffect(() => {
    if (authReady && !user) router.replace("/");
  }, [authReady, user, router]);

  // Load the saved summary, or compute it once from the period's events and save it for next time
  const babyId = baby?.id;
  useEffect(() => {
    if (!baby) return;
    if (demo) {
      setSummary(demo);
      return;
    }
    let live = true;
    (async () => {
      const ref = doc(db, "babies", baby.id, "wraps", String(n));
      const snap = await getDoc(ref);
      if (snap.exists()) return live && setSummary(snap.data() as WrappedSummary);
      const { from, to } = periodBounds(baby.birthDate, n);
      const qs = await getDocs(query(collection(db, "babies", baby.id, "events"), where("start", ">=", from), where("start", "<", to), orderBy("start")));
      const events = qs.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<EventDoc, "id">) }));
      const s = computeWrapped(events, baby, n);
      void setDoc(ref, s).catch(() => {});
      if (live) setSummary(s);
    })().catch(() => live && setErr(true));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [babyId, n]);

  // Opening it counts as seen
  const seenSet = useRef(false);
  useEffect(() => {
    if (!summary || !baby || seenSet.current || demo) return;
    seenSet.current = true;
    void patchUser({ wrappedSeen: { [wrappedKey(baby.id, n)]: Date.now() } });
  }, [summary, baby, n, patchUser]);

  const slides = useMemo(() => {
    if (!summary || !baby) return [];
    const list: { id: string; node: React.ReactNode }[] = [{ id: "intro", node: <Intro s={summary} baby={baby} n={n} /> }];
    list.push({ id: "logs", node: <Logs s={summary} /> });
    if (summary.feeds.count) list.push({ id: "feed", node: <Feed s={summary} /> });
    if (summary.diapers.total) list.push({ id: "diapers", node: <Diapers s={summary} /> });
    if (summary.sleep.totalH > 1) list.push({ id: "sleep", node: <Sleep s={summary} /> });
    if (summary.sleep.totalH > 1 || summary.feeds.count) list.push({ id: "rhythm", node: <Rhythm s={summary} /> });
    if (summary.growth.end) list.push({ id: "growth", node: <Growth s={summary} baby={baby} units={units} /> });
    const ms = summary.moments;
    if (ms.length) {
      list.push({ id: "moments", node: <Moments s={summary} /> });
      spread(ms.filter(hasPhoto), 5).forEach((m) => list.push({ id: `mem-${m.id}`, node: <MemorySlide m={m} baby={baby} /> }));
      ms.filter((m) => !hasPhoto(m) && m.note).slice(-2).forEach((m, i) => list.push({ id: `quote-${m.id}`, node: <QuoteSlide m={m} baby={baby} tone={i ? "mint" : "peach"} /> }));
      if (ms.filter((m) => m.milestone).length >= 2) list.push({ id: "timeline", node: <MilestoneTimeline s={summary} baby={baby} /> });
    }
    list.push({ id: "outro", node: <Outro baby={baby} n={n} onDone={() => exit()} onReplay={() => go(0)} /> });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary, baby, n, units]);

  const last = slides.length - 1;
  const go = (to: number, x = 0.5) => {
    if (to < 0 || to > last) return;
    setOrigin(`${x * 100}% 50%`);
    setLayer((l) => l + 1);
    setI(to);
  };

  useEffect(() => {
    if (!slides.length || i >= last) return;
    const id = setTimeout(() => go(i + 1, 0.9), SLIDE_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, slides.length]);

  if (err) return <div className="grid min-h-dvh place-items-center bg-lavender p-8 text-center font-bold">{t("error")}<button className="pill-btn mt-6" onClick={() => exit()}>{t("close")}</button></div>;
  if (!summary || !baby) {
    return (
      <div className="grid min-h-dvh place-items-center bg-lavender text-center">
        <div>
          <span className="breathe mx-auto grid h-24 w-24 place-items-center rounded-full bg-surface text-lavender-ink"><Icon name="star" size={44} /></span>
          <p className="mt-6 font-bold">{t("loading")}</p>
        </div>
      </div>
    );
  }

  const onPhoto = !!slides[i]?.id.startsWith("mem-");

  return (
    <div className="fixed inset-0 z-50 mx-auto max-w-[520px] overflow-hidden bg-bg text-ink" onClick={(e) => { const x = e.clientX / window.innerWidth; go(x < 0.3 ? i - 1 : i + 1, x); }}>
      <div className="absolute inset-x-0 top-0 z-[200] flex items-center gap-3 px-4 safe-t" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-1 gap-1.5" aria-hidden>
          {slides.map((sl, idx) => (
            <div key={sl.id} className={`h-1.5 flex-1 overflow-hidden rounded-full ${onPhoto ? "bg-white/30" : "bg-ink/20"}`}>
              {idx < i && <div className={`h-full w-full rounded-full ${onPhoto ? "bg-white" : "bg-ink"}`} />}
              {idx === i && <motion.div key={`${i}-${layer}`} className={`h-full rounded-full ${onPhoto ? "bg-white" : "bg-ink"}`} initial={{ width: idx === last ? "100%" : "0%" }} animate={{ width: "100%" }} transition={{ duration: idx === last ? 0.6 : SLIDE_MS / 1000, ease: "linear" }} />}
            </div>
          ))}
        </div>
        {demo && <span className="on-ink rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider">Demo</span>}
        <button className="glass-btn !h-10 !w-10" aria-label={t("close")} onClick={() => exit()}><Icon name="close" size={18} /></button>
      </div>
      <p className="sr-only">{label(n)}</p>

      {/* back to the previous slide */}
      <AnimatePresence>
        {i > 0 && (
          <motion.button
            key="wrapped-back"
            aria-label={tc("back")}
            className="glass-btn absolute bottom-6 left-5 z-[200] !h-12 !w-12 shadow-[var(--shadow)]"
            style={{ marginBottom: "env(safe-area-inset-bottom)", color: onPhoto ? "#fff" : undefined, background: onPhoto ? "rgba(255,255,255,.22)" : undefined }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileTap={{ scale: 0.88 }}
            transition={{ type: "spring", stiffness: 420, damping: 26 }}
            onClick={(e) => {
              e.stopPropagation();
              go(i - 1, 0.08);
            }}
          >
            <Icon name="back" size={22} />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        <motion.section
          key={`${slides[i].id}-${layer}`}
          className="absolute inset-0"
          style={{ zIndex: layer }}
          initial={{ clipPath: `circle(0% at ${origin})` }}
          animate={{ clipPath: `circle(150% at ${origin})` }}
          exit={{ opacity: 1, transition: { duration: 1 } }}
          transition={{ duration: 0.95, ease: EASE }}
        >
          {slides[i].node}
        </motion.section>
      </AnimatePresence>
    </div>
  );
}
