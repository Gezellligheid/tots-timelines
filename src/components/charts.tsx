"use client";
import { motion } from "framer-motion";
import { useId, useMemo } from "react";
import { EASE } from "./motion";
import { valueAtZ, Z } from "@/lib/growth";
import { HOUR, MIN, startOfDay } from "@/lib/stats";
import type { EventDoc } from "@/lib/types";

/* ---------- Donut with a sweeping mask reveal ---------- */
export function Donut({ segments, big, small, size = 156 }: { segments: { value: number; color: string }[]; big: string; small: string; size?: number }) {
  const id = useId();
  const r = 54, sw = 18, C = 2 * Math.PI * r;
  const total = segments.reduce((a, s) => a + s.value, 0);
  let acc = 0;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 140 140" width={size} height={size}>
        <mask id={id}>
          <motion.circle cx="70" cy="70" r={r} fill="none" stroke="#fff" strokeWidth={40} pathLength={1} strokeDasharray="1" initial={{ strokeDashoffset: 1 }} animate={{ strokeDashoffset: 0 }} transition={{ duration: 1.3, ease: EASE }} transform="rotate(-90 70 70)" />
        </mask>
        <circle cx="70" cy="70" r={r} fill="none" stroke="var(--line)" strokeWidth={sw} />
        <g mask={`url(#${id})`}>
          {total > 0 &&
            segments.filter((s) => s.value > 0).map((s, i) => {
              const len = Math.max(0.1, (s.value / total) * C - sw - 4);
              const start = acc + (sw + 4) / 2;
              acc += (s.value / total) * C;
              return <circle key={i} cx="70" cy="70" r={r} fill="none" stroke={s.color} strokeWidth={sw} strokeLinecap="round" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-start} transform="rotate(-90 70 70)" />;
            })}
        </g>
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-3xl font-extrabold leading-none">{big}</div>
          <div className="mt-1 text-xs font-semibold text-soft">{small}</div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Stacked rounded bars, revealed by a rising mask ---------- */
export function Bars({ data, height = 140, unit }: { data: { label: string; parts: { v: number; color: string }[]; hint?: string }[]; height?: number; unit?: string }) {
  const max = Math.max(1, ...data.map((d) => d.parts.reduce((a, p) => a + p.v, 0)));
  return (
    <div className="flex items-end gap-1.5" style={{ height: height + 24 }}>
      {data.map((d, i) => {
        const total = d.parts.reduce((a, p) => a + p.v, 0);
        return (
          <div key={i} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1.5" title={`${d.label}: ${+total.toFixed(1)}${unit ?? ""}`}>
            <motion.div
              className="flex w-full flex-col-reverse overflow-hidden rounded-[10px]"
              style={{ height: Math.max(total > 0 ? 6 : 0, (total / max) * height) }}
              initial={{ clipPath: "inset(100% 0 0 0 round 10px)" }}
              animate={{ clipPath: "inset(0% 0 0 0 round 10px)" }}
              transition={{ duration: 0.9, ease: EASE, delay: Math.min(i, 30) * 0.025 }}
            >
              {d.parts.map((p, j) => (
                <div key={j} style={{ flexGrow: p.v, background: p.color }} />
              ))}
            </motion.div>
            <span className="h-4 w-full truncate text-center text-[10px] font-semibold text-soft">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- 24 h rhythm ring ---------- */
const polar = (cx: number, cy: number, r: number, a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
const hourAngle = (ms: number, day0: number) => ((ms - day0) / (24 * HOUR)) * Math.PI * 2 - Math.PI / 2;

export function RhythmRing({ events, now = Date.now() }: { events: EventDoc[]; now?: number }) {
  const id = useId();
  const day0 = startOfDay(now);
  const cx = 100, cy = 100;
  const arcs = useMemo(() => {
    return events
      .filter((e) => e.type === "sleep")
      .map((e) => {
        const s = Math.max(e.start, day0), en = Math.min(e.end ?? now, day0 + 24 * HOUR);
        if (en <= s) return null;
        const a0 = hourAngle(s, day0), a1 = hourAngle(en, day0);
        const [x0, y0] = polar(cx, cy, 74, a0), [x1, y1] = polar(cx, cy, 74, a1);
        return `M${x0} ${y0} A74 74 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1} ${y1}`;
      })
      .filter(Boolean) as string[];
  }, [events, day0, now]);
  const dots = (type: EventDoc["type"], r: number) =>
    events.filter((e) => e.type === type && e.start >= day0).map((e) => polar(cx, cy, r, hourAngle(e.start, day0)));
  const nowA = hourAngle(now, day0);
  const [nx, ny] = polar(cx, cy, 74, nowA);
  return (
    <svg viewBox="0 0 200 200" className="mx-auto w-full max-w-[260px]">
      <mask id={id}>
        <motion.circle cx={cx} cy={cy} r={50} fill="none" stroke="#fff" strokeWidth={120} pathLength={1} strokeDasharray="1" initial={{ strokeDashoffset: 1 }} animate={{ strokeDashoffset: 0 }} transition={{ duration: 1.6, ease: EASE }} transform={`rotate(-90 ${cx} ${cy})`} />
      </mask>
      <circle cx={cx} cy={cy} r={74} fill="none" stroke="var(--line)" strokeWidth={18} />
      {[0, 6, 12, 18].map((h) => {
        const [tx, ty] = polar(cx, cy, 94, (h / 24) * Math.PI * 2 - Math.PI / 2);
        return <text key={h} x={tx} y={ty + 3} textAnchor="middle" fontSize="8" fontWeight="700" fill="var(--soft)">{h}</text>;
      })}
      <g mask={`url(#${id})`}>
        {arcs.map((d, i) => <path key={i} d={d} fill="none" stroke="var(--blush-ink)" strokeWidth={18} strokeLinecap="round" opacity={0.85} />)}
        {dots("feed", 54).map(([x, y], i) => <circle key={`f${i}`} cx={x} cy={y} r={5} fill="var(--butter-ink)" />)}
        {dots("diaper", 38).map(([x, y], i) => <circle key={`d${i}`} cx={x} cy={y} r={4} fill="var(--lavender-ink)" />)}
      </g>
      <circle cx={nx} cy={ny} r={4.5} fill="var(--ink)" stroke="var(--surface)" strokeWidth={2} />
    </svg>
  );
}

/* ---------- WHO growth chart ---------- */
export function GrowthChart({ rows, points, maxMonth, convert = (v: number) => v, unit }: { rows: [number, number, number, number][]; points: { month: number; value: number }[]; maxMonth: number; convert?: (v: number) => number; unit: string }) {
  const id = useId();
  const W = 320, H = 200, pl = 34, pr = 10, pt = 22, pb = 26;
  const months = Array.from({ length: Math.ceil(maxMonth * 2) + 1 }, (_, i) => i / 2);
  const band = (z: number) => months.map((m) => convert(valueAtZ(rows, m, z)));
  const lo = band(Z.p3), hi = band(Z.p97), l15 = band(Z.p15), h85 = band(Z.p85), mid = band(Z.p50);
  const ys = [...lo, ...hi, ...points.map((p) => convert(p.value))];
  const yMin = Math.floor(Math.min(...ys) * 0.97), yMax = Math.ceil(Math.max(...ys) * 1.03);
  const x = (m: number) => pl + (m / maxMonth) * (W - pl - pr);
  const y = (v: number) => pt + (1 - (v - yMin) / (yMax - yMin || 1)) * (H - pt - pb);
  const line = (a: number[]) => a.map((v, i) => `${i ? "L" : "M"}${x(months[i])} ${y(v)}`).join(" ");
  const area = (a: number[], b: number[]) => `${line(a)} ${b.map((v, i) => `L${x(months[months.length - 1 - i])} ${y(b[b.length - 1 - i])}`).join(" ")} Z`;
  const ticks = [0, 1, 2, 3].map((i) => yMin + ((yMax - yMin) * i) / 3);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <defs>
        <clipPath id={id}>
          <motion.rect x={0} y={0} height={H} initial={{ width: 0 }} animate={{ width: W }} transition={{ duration: 1.4, ease: EASE }} />
        </clipPath>
      </defs>
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={pl} x2={W - pr} y1={y(t)} y2={y(t)} stroke="var(--line)" />
          <text x={pl - 6} y={y(t) + 3} textAnchor="end" fontSize="8" fontWeight="600" fill="var(--soft)">{+t.toFixed(1)}</text>
        </g>
      ))}
      {Array.from({ length: Math.floor(maxMonth / 3) + 1 }, (_, i) => i * 3).map((m) => (
        <text key={m} x={x(m)} y={H - 8} textAnchor="middle" fontSize="8" fontWeight="600" fill="var(--soft)">{m}</text>
      ))}
      <text x={pl - 6} y={9} textAnchor="end" fontSize="8" fontWeight="700" fill="var(--soft)">{unit}</text>
      <g clipPath={`url(#${id})`}>
        <path d={area(lo, hi)} fill="var(--mint)" opacity={0.55} />
        <path d={area(l15, h85)} fill="var(--mint)" />
        <path d={line(mid)} fill="none" stroke="var(--mint-ink)" strokeWidth={1.2} strokeDasharray="3 3" />
        {points.length > 1 && <path d={points.map((p, i) => `${i ? "L" : "M"}${x(p.month)} ${y(convert(p.value))}`).join(" ")} fill="none" stroke="var(--ink)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />}
        {points.map((p, i) => <circle key={i} cx={x(p.month)} cy={y(convert(p.value))} r={4.5} fill="var(--ink)" stroke="var(--surface)" strokeWidth={2} />)}
      </g>
    </svg>
  );
}

export const MIN_MS = MIN;
