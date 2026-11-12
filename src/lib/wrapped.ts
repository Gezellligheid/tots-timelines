import { addMonths, differenceInMonths } from "date-fns";
import { DAY, HOUR, MIN, dayKey, dayNightSleep } from "./stats";
import type { Baby, EventDoc } from "./types";

/** A Wrapped covers 3 baby-months: n = 3, 6, 9, 12 … covering months (n-2)…n. */
export const WRAPPED_STEP = 3;

export const birthMidnight = (birthDate: string) => new Date(birthDate + "T00:00:00");

export function periodBounds(birthDate: string, n: number) {
  const b = birthMidnight(birthDate);
  return { from: addMonths(b, n - WRAPPED_STEP).getTime(), to: addMonths(b, n).getTime() };
}

/** Latest completed period (3, 6, 9 …) or 0 when the baby is under 3 months. */
export function dueN(birthDate: string, now = Date.now()) {
  const n = Math.floor(differenceInMonths(now, birthMidnight(birthDate)) / WRAPPED_STEP) * WRAPPED_STEP;
  return n >= WRAPPED_STEP ? n : 0;
}

export const nextWrappedAt = (birthDate: string, checkedN = 0) => addMonths(birthMidnight(birthDate), checkedN + WRAPPED_STEP).getTime();

export const wrappedKey = (babyId: string, n: number) => `${babyId}_${n}`;

export interface GrowthPoint {
  t: number;
  weightG?: number;
  lengthCm?: number;
  headCm?: number;
}

export interface WrappedSummary {
  n: number;
  from: number;
  to: number;
  days: number;
  logs: number;
  feeds: { count: number; perDay: number; bottleMl: number; breastMin: number; peakHour: number | null; hourly: number[] };
  diapers: { total: number; wet: number; dirty: number };
  sleep: { totalH: number; perDayH: number; longestFirstMs: number; longestLastMs: number; nightPct: number; naps: number; hourly: number[] };
  growth: { start?: GrowthPoint; end?: GrowthPoint };
  moments: { id: string; t: number; title?: string; milestone?: string; photoKey?: string; note?: string }[];
  milestones: number;
  createdAt: number;
}

const strip = <T extends object>(o: T): T => JSON.parse(JSON.stringify(o));

export function computeWrapped(all: EventDoc[], baby: Baby, n: number): WrappedSummary {
  const { from, to } = periodBounds(baby.birthDate, n);
  const events = all.filter((e) => e.start >= from && e.start < to);
  const days = Math.max(1, new Set(events.map((e) => dayKey(e.start))).size);

  const feedEvents = events.filter((e) => e.type === "feed" && e.data.method !== "pump");
  const feedHourly = new Array(24).fill(0);
  feedEvents.forEach((e) => feedHourly[new Date(e.start).getHours()]++);
  const peak = Math.max(...feedHourly);
  const breastMin = feedEvents
    .filter((e) => e.data.method === "breast" && e.end)
    .reduce((a, e) => a + Math.min(90, (e.end! - e.start) / MIN), 0);

  const diapers = events.filter((e) => e.type === "diaper");
  const wet = diapers.filter((e) => e.data.kind !== "dirty").length;
  const dirty = diapers.filter((e) => e.data.kind !== "wet").length;

  const sleeps = events.filter((e) => e.type === "sleep" && e.end);
  const sleepMs = sleeps.reduce((a, e) => a + (e.end! - e.start), 0);
  const sleepHourly = new Array(24).fill(0);
  for (const e of sleeps) {
    for (let t = e.start; t < e.end!; t += 10 * MIN) sleepHourly[new Date(t).getHours()] += Math.min(10 * MIN, e.end! - t) / MIN;
  }
  const longest = (a: number, b: number) => sleeps.filter((e) => e.start >= a && e.start < b).reduce((m, e) => Math.max(m, e.end! - e.start), 0);
  const dn = dayNightSleep(sleeps);

  const g = events.filter((e) => e.type === "growth").sort((a, b) => a.start - b.start);
  const pt = (e: EventDoc): GrowthPoint => ({ t: e.start, weightG: e.data.weightG, lengthCm: e.data.lengthCm, headCm: e.data.headCm });
  let start: GrowthPoint | undefined = g[0] ? pt(g[0]) : undefined;
  if (n === WRAPPED_STEP && (baby.birthWeightG || baby.birthLengthCm || baby.birthHeadCm)) {
    start = { t: birthMidnight(baby.birthDate).getTime(), weightG: baby.birthWeightG, lengthCm: baby.birthLengthCm, headCm: baby.birthHeadCm };
  }
  const lastG = g[g.length - 1];
  const end = lastG && (!start || lastG.start > start.t) ? pt(lastG) : undefined;

  const moments = events.filter((e) => e.type === "moment").sort((a, b) => a.start - b.start);

  return strip({
    n,
    from,
    to,
    days,
    logs: events.length,
    feeds: { count: feedEvents.length, perDay: feedEvents.length / days, bottleMl: feedEvents.filter((e) => e.data.method === "bottle").reduce((a, e) => a + (e.data.ml ?? 0), 0), breastMin, peakHour: feedEvents.length ? feedHourly.indexOf(peak) : null, hourly: feedHourly },
    diapers: { total: diapers.length, wet, dirty },
    sleep: {
      totalH: sleepMs / HOUR,
      perDayH: sleepMs / HOUR / days,
      longestFirstMs: longest(from, from + 14 * DAY),
      longestLastMs: longest(to - 14 * DAY, to),
      nightPct: dn.day + dn.night ? Math.round((dn.night / (dn.day + dn.night)) * 100) : 0,
      naps: sleeps.filter((e) => e.data.kind !== "night").length,
      hourly: sleepHourly.map((m) => Math.min(1, m / (days * 60))),
    },
    growth: { start, end },
    moments: moments.slice(-12).map((e) => ({ id: e.id, t: e.start, title: e.data.title, milestone: e.data.milestone, photoKey: e.photoKey, note: e.note })),
    milestones: moments.filter((e) => e.data.milestone).length,
    createdAt: Date.now(),
  });
}
