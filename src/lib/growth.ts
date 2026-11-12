import type { Sex } from "./types";

export type GrowthMetric = "weight" | "length" | "head";
type LMS = [number, number, number, number]; // month, L, M, S
type Table = Record<GrowthMetric, Record<"boy" | "girl", LMS[]>>;

let cache: Promise<Table> | null = null;
export function loadGrowth(): Promise<Table> {
  if (!cache) cache = fetch("/who/growth.json").then((r) => r.json());
  return cache;
}

export const Z = { p3: -1.8808, p15: -1.0364, p50: 0, p85: 1.0364, p97: 1.8808 };

function lmsAt(rows: LMS[], month: number) {
  const m = Math.min(Math.max(month, 0), rows[rows.length - 1][0]);
  const i = Math.min(Math.floor(m), rows.length - 2);
  const a = rows[i], b = rows[i + 1];
  const t = (m - a[0]) / (b[0] - a[0]);
  return { L: a[1] + (b[1] - a[1]) * t, M: a[2] + (b[2] - a[2]) * t, S: a[3] + (b[3] - a[3]) * t };
}

export function valueAtZ(rows: LMS[], month: number, z: number) {
  const { L, M, S } = lmsAt(rows, month);
  return L === 0 ? M * Math.exp(S * z) : M * Math.pow(1 + L * S * z, 1 / L);
}

export function zScore(rows: LMS[], month: number, x: number) {
  const { L, M, S } = lmsAt(rows, month);
  return L === 0 ? Math.log(x / M) / S : (Math.pow(x / M, L) - 1) / (L * S);
}

function erf(x: number) {
  const s = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return s * y;
}
export const percentileOf = (z: number) => Math.round(50 * (1 + erf(z / Math.SQRT2)) * 10) / 10;

/** Age in months, corrected for prematurity (40 weeks = term). */
export function ageMonths(birthDate: string, at: number, gestationWeeks?: number) {
  const born = new Date(birthDate + "T12:00:00").getTime();
  let days = (at - born) / 86400000;
  if (gestationWeeks && gestationWeeks < 37) days -= (40 - gestationWeeks) * 7;
  return Math.max(0, days / 30.4375);
}

export const sexKey = (s: Sex): "boy" | "girl" => (s === "girl" ? "girl" : "boy");
