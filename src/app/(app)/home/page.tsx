"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useApp } from "@/providers/Providers";
import { Icon } from "@/components/Icon";
import { EASE, RevealText, WipeIn } from "@/components/motion";
import { BabyAvatar, useNow } from "@/components/ui";
import { LogSheet } from "@/components/LogSheet";
import { EventRow, useDescribe } from "@/components/EventRow";
import { Donut } from "@/components/charts";
import { ageText } from "@/lib/format";
import { patchEvent } from "@/lib/data";
import { TYPE_META } from "@/lib/meta";
import { DAY, dayNightSleep, feedIntervals, fmtAgo, fmtClock, fmtDur, isRunning, longestSleep, sleepMs, startOfDay } from "@/lib/stats";
import type { EventType } from "@/lib/types";

const TILES: EventType[] = ["sleep", "feed", "growth", "diaper"];

export default function HomePage() {
  const t = useTranslations("home");
  const tAge = useTranslations("age");
  const { baby, babies, userDoc, events, moments, eventsReady, setActiveBaby } = useApp();
  const tm = useTranslations("moments");
  const [sheet, setSheet] = useState<{ type: EventType; origin: { x: number; y: number } } | null>(null);
  const [closing, setClosing] = useState(false);
  const units = userDoc?.units ?? "metric";
  const describe = useDescribe(units);

  const running = useMemo(() => events.filter(isRunning), [events]);
  const now = useNow(running.length > 0 || true, running.length ? 1000 : 30000);

  const stats = useMemo(() => {
    const d0 = startOfDay(now);
    const today = events.filter((e) => e.start >= d0);
    const feeds = today.filter((e) => e.type === "feed" && e.data.method !== "pump");
    const diapers = today.filter((e) => e.type === "diaper");
    const sleepToday = sleepMs(events, d0, d0 + DAY, now);
    const lastFeed = events.filter((e) => e.type === "feed" && e.data.method !== "pump").sort((a, b) => b.start - a.start)[0];
    const lastSleep = events.filter((e) => e.type === "sleep" && e.end).sort((a, b) => b.end! - a.end!)[0];
    const week = events.filter((e) => e.start >= now - 7 * DAY);
    const gaps = feedIntervals(week.filter((e) => e.type === "feed" && e.data.method !== "pump"));
    const dn = dayNightSleep(week, now);
    return {
      todayCount: today.length,
      feeds: feeds.length,
      diapers: diapers.length,
      sleepToday,
      lastFeed,
      lastSleep,
      avgGap: gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0,
      longest: longestSleep(week),
      nightPct: dn.day + dn.night ? Math.round((dn.night / (dn.day + dn.night)) * 100) : 0,
    };
  }, [events, now]);

  if (!baby) return null;
  const sleeping = running.find((e) => e.type === "sleep");

  const status = sleeping
    ? t("sleeping", { dur: fmtAgo(now - sleeping.start) })
    : stats.lastFeed
      ? t("lastFed", { ago: fmtAgo(now - (stats.lastFeed.end ?? stats.lastFeed.start)) })
      : t("noFeeds");
  const status2 = !sleeping && stats.lastSleep ? t("awake", { dur: fmtAgo(now - stats.lastSleep.end!) }) : null;

  const insight = stats.longest
    ? t("insight.longestSleep", { dur: fmtDur(stats.longest) })
    : stats.avgGap
      ? t("insight.feedGap", { dur: fmtDur(stats.avgGap) })
      : t("insight.welcome", { name: baby.name });
  const insight2 = stats.longest && stats.nightPct ? t("insight.dayNight", { pct: stats.nightPct }) : null;

  const open = (type: EventType, e: React.MouseEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    setClosing(false);
    setSheet({ type, origin: { x: r.left + r.width / 2, y: r.top + r.height / 2 } });
  };

  const recent = [...events, ...moments].sort((a, b) => b.start - a.start).slice(0, 5);

  return (
    <div className="space-y-6 pt-2">
      <header className="flex items-center gap-3">
        <Link href="/profile"><BabyAvatar photoKey={baby.photoKey} color={baby.color} size={56} /></Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-extrabold leading-tight">
            <RevealText text={t("greeting", { name: userDoc?.displayName ?? "" })} />
          </h1>
          <p className="text-sm font-medium text-soft">{t("babySub", { name: baby.name, age: ageText(baby.birthDate, tAge) })}</p>
        </div>
      </header>

      {babies && babies.length > 1 && (
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5">
          {babies.map((b) => (
            <button key={b.id} onClick={() => setActiveBaby(b.id)} className={`flex shrink-0 items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 text-sm font-bold transition-colors ${b.id === baby.id ? "on-ink" : "bg-surface"}`}>
              <BabyAvatar photoKey={b.photoKey} color={b.color} size={30} />
              {b.name}
            </button>
          ))}
        </div>
      )}

      {/* status hero */}
      <WipeIn>
        <div className="relative overflow-hidden rounded-[32px] bg-accent p-6">
          <motion.div className="breathe absolute -right-10 -top-10 h-44 w-44 rounded-full bg-surface/50" />
          <motion.div className="absolute -bottom-12 right-10 h-32 w-32 rounded-full bg-surface/30" animate={{ y: [0, -8, 0] }} transition={{ duration: 5, repeat: Infinity }} />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full bg-surface/70 px-3 py-1 text-xs font-bold text-accent-ink">
              <Icon name="heart" size={14} /> {baby.name}
            </span>
            <p className="mt-3 max-w-[16ch] text-[26px] font-extrabold leading-tight text-ink">{status}</p>
            {status2 && <p className="mt-1 text-sm font-semibold text-ink/70">{status2}</p>}
          </div>
        </div>
      </WipeIn>

      {/* running timers */}
      {running.map((e) => {
        const meta = TYPE_META[e.type];
        return (
          <motion.div key={e.id} layout initial={{ clipPath: "inset(0 100% 0 0 round 28px)" }} animate={{ clipPath: "inset(0 0% 0 0 round 28px)" }} transition={{ duration: 0.8, ease: EASE }} className={`relative overflow-hidden rounded-[28px] bg-${meta.tone} p-4`}>
            <span className={`breathe absolute -left-6 top-1/2 h-28 w-28 -translate-y-1/2 rounded-full bg-surface/50`} />
            <div className="relative flex items-center gap-4">
              <span className={`grid h-14 w-14 place-items-center rounded-full bg-surface text-${meta.tone}-ink`}><Icon name={meta.icon} size={28} /></span>
              <div className="flex-1">
                <p className="text-sm font-bold text-ink/70">{t(`running.${e.type === "sleep" ? "sleep" : "feed"}`)} · {describe(e).title}</p>
                <p className="text-3xl font-extrabold tabular-nums text-ink">{fmtClock(now - e.start)}</p>
              </div>
              <button className="pill-btn !h-12 !px-5" onClick={() => patchEvent(baby.id, e.id, { end: Date.now() }, e.type)}>
                {t("running.sleep") && "■"}
              </button>
            </div>
          </motion.div>
        );
      })}

      {/* quick actions */}
      <section className="grid grid-cols-2 gap-4">
        {TILES.map((type, i) => {
          const meta = TYPE_META[type];
          return (
            <motion.button
              key={type}
              onClick={(e) => open(type, e)}
              initial={{ clipPath: "circle(0% at 50% 100%)" }}
              animate={{ clipPath: "circle(150% at 50% 100%)" }}
              transition={{ duration: 0.9, ease: EASE, delay: 0.1 + i * 0.08 }}
              whileTap={{ scale: 0.96 }}
              className={`relative aspect-[1/0.95] overflow-hidden rounded-[30px] bg-${meta.tone} p-5 text-left`}
            >
              <span className="block text-xl font-extrabold">{t(`tile.${type}`)}</span>
              <span className="block text-xs font-semibold text-ink/60">{t(`tileHint.${type}`)}</span>
              <motion.span className={`absolute bottom-4 left-4 text-${meta.tone}-ink`} whileTap={{ rotate: -14, scale: 1.15 }}>
                <Icon name={meta.icon} size={62} strokeWidth={1.6} />
              </motion.span>
              <span className="absolute bottom-4 right-4 grid h-11 w-11 place-items-center rounded-full bg-surface/80 text-ink">
                <Icon name="arrowUR" size={20} />
              </span>
            </motion.button>
          );
        })}
      </section>

      <motion.button
        onClick={(e) => open("moment", e)}
        initial={{ clipPath: "circle(0% at 50% 100%)" }}
        animate={{ clipPath: "circle(150% at 50% 100%)" }}
        transition={{ duration: 0.9, ease: EASE, delay: 0.45 }}
        whileTap={{ scale: 0.98 }}
        className="relative flex w-full items-center gap-4 overflow-hidden rounded-[30px] bg-sky p-4 pr-5 text-left"
      >
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-surface text-sky-ink"><Icon name="star" size={30} strokeWidth={1.8} /></span>
        <span className="flex-1">
          <span className="block text-xl font-extrabold">{tm("tile")}</span>
          <span className="block text-xs font-semibold text-ink/60">{tm("tileHint")}</span>
        </span>
        <span className="grid h-11 w-11 place-items-center rounded-full bg-surface/80"><Icon name="arrowUR" size={20} /></span>
      </motion.button>

      {/* today */}
      <section>
        <h2 className="mb-3 text-lg font-extrabold">{t("today")}</h2>
        <div className="card flex items-center gap-5 p-5">
          <Donut
            segments={[
              { value: stats.feeds, color: "var(--butter-ink)" },
              { value: events.filter((e) => e.type === "sleep" && e.start >= startOfDay(now)).length, color: "var(--blush-ink)" },
              { value: stats.diapers, color: "var(--lavender-ink)" },
            ]}
            big={String(stats.todayCount)}
            small={t("logs", { n: stats.todayCount }).replace(/^\d+\s*/, "")}
            size={136}
          />
          <div className="flex-1 space-y-3">
            {[
              { l: t("feeds"), v: String(stats.feeds), c: "var(--butter-ink)" },
              { l: t("sleep"), v: fmtDur(stats.sleepToday), c: "var(--blush-ink)" },
              { l: t("diapers"), v: String(stats.diapers), c: "var(--lavender-ink)" },
            ].map((r) => (
              <div key={r.l} className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full" style={{ background: r.c }} />
                <span className="flex-1 text-sm font-semibold text-soft">{r.l}</span>
                <span className="font-extrabold tabular-nums">{r.v}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <WipeIn delay={0.1}>
        <div className="flex gap-3 rounded-[28px] bg-mint p-5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface text-mint-ink"><Icon name="star" size={22} /></span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-mint-ink">{t("insightTitle")}</p>
            <p className="font-bold leading-snug">{insight}</p>
            {insight2 && <p className="mt-1 text-sm font-medium text-ink/70">{insight2}</p>}
          </div>
        </div>
      </WipeIn>

      {/* recent */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-extrabold">{t("recent")}</h2>
          <Link href="/timeline" className="text-sm font-bold text-soft">{t("seeAll")}</Link>
        </div>
        {!eventsReady ? (
          <div className="shimmer h-20 rounded-[24px]" />
        ) : recent.length ? (
          <div className="space-y-3">{recent.map((e) => <EventRow key={e.id} e={e} units={units} />)}</div>
        ) : (
          <p className="card p-5 text-center text-sm font-medium text-soft">{t("empty")}</p>
        )}
      </section>

      <LogSheet type={closing ? null : sheet?.type ?? null} origin={sheet?.origin ?? null} onClose={() => setClosing(true)} />
    </div>
  );
}
