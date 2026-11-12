import { differenceInCalendarDays, differenceInMonths, differenceInWeeks } from "date-fns";

type T = (key: string, values?: Record<string, string | number>) => string;

/** "5 days" / "3 weeks" / "4 months" using the age.* messages */
export function ageText(birthDate: string, tAge: T, at: Date = new Date()) {
  const born = new Date(birthDate + "T12:00:00");
  const now = at;
  const days = Math.max(0, differenceInCalendarDays(now, born));
  if (days < 14) return tAge("days", { n: days });
  if (days < 70) return tAge("weeks", { n: differenceInWeeks(now, born) });
  return tAge("months", { n: differenceInMonths(now, born) });
}

export const clock = (ts: number, locale: string) =>
  new Date(ts).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });

export function toLocalInput(ts: number) {
  const d = new Date(ts - new Date(ts).getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 16);
}
export const fromLocalInput = (v: string) => new Date(v).getTime();
