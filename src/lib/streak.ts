import { DAY, dayKey, startOfDay } from "./stats";
import type { EventDoc } from "./types";

/** Consecutive days with at least one log. Today only counts once something is logged, but never breaks the streak early. */
export function computeStreak(all: EventDoc[], now = Date.now()) {
  const days = new Set(all.map((e) => dayKey(e.start)));
  let d = startOfDay(now);
  const loggedToday = days.has(dayKey(d));
  if (!loggedToday) d -= DAY;
  let n = 0;
  while (n < 400 && days.has(dayKey(d))) {
    n++;
    d -= DAY;
  }
  return { days: n, loggedToday };
}

export const STREAK_BADGES = [7, 14, 30] as const;
