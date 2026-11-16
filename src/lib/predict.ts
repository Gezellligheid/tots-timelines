import { DAY, HOUR, MIN, isRunning } from "./stats";
import type { EventDoc } from "./types";

/** Estimates from the baby's own recent pattern. Guidance only. */

const median = (a: number[]) => {
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Typical awake time between naps by age (minutes), used until there is enough data of the baby's own. */
const WAKE_WINDOWS: [number, number][] = [[1, 50], [2, 70], [3, 85], [4, 100], [6, 120], [9, 150], [12, 180], [99, 210]];
const wakeWindowForAge = (months: number) => (WAKE_WINDOWS.find(([max]) => months < max) ?? WAKE_WINDOWS[WAKE_WINDOWS.length - 1])[1] * MIN;

/** When the next feed is likely: last feed + the typical gap of the last week. Null when there is not enough pattern. */
export function predictFeed(events: EventDoc[], now: number): { at: number } | null {
  const feeds = events.filter((e) => e.type === "feed" && e.data.method !== "pump" && e.start >= now - 7 * DAY).sort((a, b) => a.start - b.start);
  if (feeds.length < 6) return null;
  const gaps: number[] = [];
  for (let i = 1; i < feeds.length; i++) {
    const g = feeds[i].start - feeds[i - 1].start;
    if (g >= 30 * MIN && g <= 6 * HOUR) gaps.push(g);
  }
  if (gaps.length < 5) return null;
  const at = feeds[feeds.length - 1].start + median(gaps.slice(-14));
  return now - at > 90 * MIN ? null : { at }; // long overdue: the pattern is off, say nothing
}

/** When the next daytime nap window opens: last wake-up + the baby's typical awake time (or the age norm). */
export function predictNap(events: EventDoc[], now: number, ageMonths: number): { at: number } | null {
  if (events.some((e) => e.type === "sleep" && isRunning(e))) return null;
  const hour = new Date(now).getHours();
  if (hour >= 19 || hour < 6) return null;
  const sleeps = events.filter((e) => e.type === "sleep" && e.end && e.start >= now - 7 * DAY).sort((a, b) => a.start - b.start);
  const last = sleeps[sleeps.length - 1];
  if (!last) return null;
  const gaps: number[] = [];
  for (let i = 1; i < sleeps.length; i++) {
    const g = sleeps[i].start - sleeps[i - 1].end!;
    const h = new Date(sleeps[i].start).getHours();
    if (g >= 20 * MIN && g <= 5 * HOUR && h >= 6 && h < 19) gaps.push(g);
  }
  const window = gaps.length >= 5 ? median(gaps.slice(-14)) : wakeWindowForAge(ageMonths);
  const at = last.end! + window;
  return now - at > 60 * MIN ? null : { at };
}
