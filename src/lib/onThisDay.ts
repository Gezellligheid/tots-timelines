import { DAY, startOfDay } from "./stats";
import type { EventDoc } from "./types";

export type OnThisDay = { m: EventDoc; kind: "weeks" | "months" | "days"; n: number };

/** A moment from exactly 1-3 weeks, 1-36 months or 100 days ago today. Prefers one with a photo. */
export function onThisDay(moments: EventDoc[], now = new Date()): OnThisDay | null {
  const today = startOfDay(now.getTime());
  const found: (OnThisDay & { score: number })[] = [];
  for (const m of moments) {
    const d = new Date(m.start);
    const ago = Math.round((today - startOfDay(m.start)) / DAY);
    if (ago <= 0) continue;
    const score = (m.photoKey ? 2 : 0) + (m.data.milestone ? 1 : 0);
    if (ago === 100) found.push({ m, kind: "days", n: 100, score });
    else if (ago % 7 === 0 && ago / 7 <= 3) found.push({ m, kind: "weeks", n: ago / 7, score });
    else if (d.getDate() === now.getDate()) {
      const months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
      if (months >= 1 && months <= 36) found.push({ m, kind: "months", n: months, score });
    }
  }
  found.sort((a, b) => b.score - a.score || b.m.start - a.m.start);
  return found[0] ?? null;
}
