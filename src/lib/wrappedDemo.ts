import { periodBounds, type WrappedSummary } from "./wrapped";
import type { Baby } from "./types";

/** Localhost-only sample data so the whole Wrapped can be previewed without months of real logs. */

const scene = (a: string, b: string, c: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="400" height="500" fill="url(#g)"/><circle cx="110" cy="130" r="120" fill="${c}" opacity=".55"/><circle cx="330" cy="420" r="160" fill="#fff" opacity=".3"/><circle cx="200" cy="270" r="88" fill="#fbe9a6"/><circle cx="172" cy="258" r="9" fill="#17171a"/><circle cx="228" cy="258" r="9" fill="#17171a"/><circle cx="150" cy="292" r="14" fill="#f08f86" opacity=".55"/><circle cx="250" cy="292" r="14" fill="#f08f86" opacity=".55"/><path d="M170 292c16 22 44 22 60 0" fill="none" stroke="#17171a" stroke-width="9" stroke-linecap="round"/></svg>`,
  )}`;

const SCENES = [
  scene("#cfd3f8", "#f4d6d2", "#cde8e0"),
  scene("#fbe9a6", "#fad9be", "#f4d6d2"),
  scene("#cde8e0", "#cfe6f4", "#cfd3f8"),
  scene("#f4d6d2", "#cfd3f8", "#fbe9a6"),
  scene("#cfe6f4", "#cde8e0", "#fad9be"),
];

export function buildDemoSummary(baby: Baby, n: number, withPhotos = true): WrappedSummary {
  const { from, to } = periodBounds(baby.birthDate, n);
  const span = to - from;
  const at = (f: number) => from + span * f;
  const img = (i: number) => (withPhotos ? SCENES[i % SCENES.length] : undefined);

  const sleepHourly = Array.from({ length: 24 }, (_, h) => (h >= 20 || h < 6 ? 0.82 : h === 10 || h === 14 ? 0.5 : h === 11 || h === 15 ? 0.35 : 0.12));
  const feedHourly = Array.from({ length: 24 }, (_, h) => ([2, 5, 8, 11, 14, 17, 20, 23].includes(h) ? 40 + ((h * 7) % 25) : 4 + (h % 5)));
  const feedCount = feedHourly.reduce((a, b) => a + b, 0);

  const w0 = baby.birthWeightG ?? (n === 3 ? 3400 : 5600);
  const l0 = baby.birthLengthCm ?? (n === 3 ? 50 : 60);
  const h0 = baby.birthHeadCm ?? (n === 3 ? 34.5 : 40);

  return {
    n,
    from,
    to,
    days: 81,
    logs: 612,
    feeds: { count: feedCount, perDay: feedCount / 81, bottleMl: 41200, breastMin: 2980, peakHour: 5, hourly: feedHourly },
    diapers: { total: 388, wet: 262, dirty: 164 },
    sleep: { totalH: 1124, perDayH: 13.9, longestFirstMs: 3.4 * 3600000, longestLastMs: 7.1 * 3600000, nightPct: 64, naps: 301, hourly: sleepHourly },
    growth: {
      start: { t: from, weightG: w0, lengthCm: l0, headCm: h0 },
      end: { t: to - 3 * 86400000, weightG: Math.round(w0 * 1.75), lengthCm: Math.round((l0 + 8.5) * 10) / 10, headCm: Math.round((h0 + 4.2) * 10) / 10 },
    },
    moments: [
      { id: "d1", t: at(0.05), milestone: "homecoming", photoKey: undefined, img: img(0), note: "The first night at home. We hardly slept and didn't mind at all." },
      { id: "d2", t: at(0.16), milestone: "firstBath", img: undefined, note: undefined },
      { id: "d3", t: at(0.27), title: "Grandma's first cuddle", img: img(1), note: "Nobody wanted to give you back." },
      { id: "d4", t: at(0.4), milestone: "firstSmile", img: img(2), note: "6:12 in the morning, and it melted us completely." },
      { id: "d5", t: at(0.52), title: "Sunday morning snuggles", img: undefined, note: "Slow mornings, warm blankets, nowhere to be. These are the days we'll miss." },
      { id: "d6", t: at(0.63), milestone: "headUp", img: undefined },
      { id: "d7", t: at(0.74), milestone: "firstLaugh", img: img(3), note: "Giggling at the dog. We replayed it twenty times." },
      { id: "d8", t: at(0.86), milestone: "sleepsThrough", img: undefined },
      { id: "d9", t: at(0.95), milestone: "rollsOver", img: img(4), note: "Right off the changing mat! Nobody panic." },
    ].map((m) => ({ ...m, photoKey: undefined })),
    milestones: 6,
    createdAt: Date.now(),
  };
}
