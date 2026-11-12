import type { EventDoc } from "./types";

export const MIN = 60000;
export const HOUR = 3600000;
export const DAY = 86400000;

export function startOfDay(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
export const dayKey = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const duration = (e: EventDoc, now = Date.now()) => Math.max(0, (e.end ?? now) - e.start);
export const isRunning = (e: EventDoc) => (e.type === "sleep" || (e.type === "feed" && e.data.method === "breast")) && !e.end;

export function fmtDur(ms: number) {
  const m = Math.round(ms / MIN);
  const h = Math.floor(m / 60);
  return h ? `${h}h ${String(m % 60).padStart(2, "0")}m` : `${m}m`;
}
export function fmtClock(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const mm = String(m).padStart(2, "0"), ss = String(sec).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
export function fmtAgo(ms: number) {
  const m = Math.floor(ms / MIN);
  if (m < 1) return "0m";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${String(m % 60).padStart(2, "0")}m`;
}

export function byDay(events: EventDoc[]) {
  const map = new Map<string, EventDoc[]>();
  for (const e of events) {
    const k = dayKey(e.start);
    (map.get(k) ?? map.set(k, []).get(k)!).push(e);
  }
  return map;
}

/** Minutes of sleep that overlap [from, to) */
export function sleepMs(events: EventDoc[], from: number, to: number, now = Date.now()) {
  let t = 0;
  for (const e of events) {
    if (e.type !== "sleep") continue;
    const s = Math.max(e.start, from), en = Math.min(e.end ?? now, to);
    if (en > s) t += en - s;
  }
  return t;
}

export function lastOf(events: EventDoc[], type: EventDoc["type"]) {
  return events.filter((e) => e.type === type).sort((a, b) => b.start - a.start)[0];
}

export function feedIntervals(feeds: EventDoc[]) {
  const s = [...feeds].sort((a, b) => a.start - b.start);
  const gaps: number[] = [];
  for (let i = 1; i < s.length; i++) gaps.push(s[i].start - s[i - 1].start);
  return gaps;
}

/** Longest sleep stretch in ms */
export function longestSleep(events: EventDoc[]) {
  return events.filter((e) => e.type === "sleep" && e.end).reduce((m, e) => Math.max(m, e.end! - e.start), 0);
}

/** Day = 07:00–19:00 local */
export function dayNightSleep(events: EventDoc[], now = Date.now()) {
  let day = 0, night = 0;
  for (const e of events) {
    if (e.type !== "sleep") continue;
    const end = e.end ?? now;
    for (let t = e.start; t < end; t += 10 * MIN) {
      const slice = Math.min(10 * MIN, end - t);
      const h = new Date(t).getHours();
      if (h >= 7 && h < 19) day += slice;
      else night += slice;
    }
  }
  return { day, night };
}
