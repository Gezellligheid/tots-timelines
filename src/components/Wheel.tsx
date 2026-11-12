"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

const ROW = 44;

/** iOS-style snapping wheel. `onUser` fires only for user-driven changes (not the initial positioning). */
export function WheelColumn({ items, index, onChange, dim }: { items: string[]; index: number; onChange: (i: number) => void; dim?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const ready = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTop = index * ROW;
    const id = setTimeout(() => (ready.current = true), 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative h-[176px] flex-1">
      <div className={`pointer-events-none absolute inset-x-0 top-[66px] h-11 rounded-full transition-colors duration-500 ${dim ? "bg-line" : "bg-accent"}`} />
      <div
        ref={ref}
        className="relative h-full snap-y snap-mandatory overflow-y-auto overscroll-contain py-[66px]"
        style={{ maskImage: "linear-gradient(transparent, #000 32%, #000 68%, transparent)", WebkitMaskImage: "linear-gradient(transparent, #000 32%, #000 68%, transparent)" }}
        onScroll={(e) => {
          if (!ready.current) return;
          const el = e.currentTarget;
          cancelAnimationFrame(raf.current);
          raf.current = requestAnimationFrame(() => {
            const i = Math.min(items.length - 1, Math.max(0, Math.round(el.scrollTop / ROW)));
            if (i !== index) onChange(i);
          });
        }}
      >
        {items.map((label, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              ready.current = true;
              ref.current?.scrollTo({ top: i * ROW, behavior: "smooth" });
              onChange(i);
            }}
            className={`block h-11 w-full snap-center text-xl font-extrabold tabular-nums transition-opacity ${i === index && !dim ? "" : "opacity-40"}`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

const RANGE = {
  length: { metric: [30, 100, 50], imperial: [12, 40, 20] },
  head: { metric: [25, 55, 35], imperial: [10, 22, 14] },
} as const;

/** Whole units + tenths wheels (cm or in). Value stays undefined until the user scrolls. */
export function MeasureWheel({ valueCm, onChange, units, kind }: { valueCm?: number; onChange: (cm?: number) => void; units: "metric" | "imperial"; kind: "length" | "head" }) {
  const tc = useTranslations("common");
  const [min, max, def] = RANGE[kind][units];
  const imp = units === "imperial";
  const startVal = valueCm != null ? (imp ? valueCm / 2.54 : valueCm) : def;
  const startInt = Math.min(max, Math.max(min, Math.floor(startVal + 1e-6)));
  const [whole, setWhole] = useState(startInt - min);
  const [tenth, setTenth] = useState(valueCm != null ? Math.min(9, Math.round((startVal - Math.floor(startVal + 1e-6)) * 10)) : 0);
  const [touched, setTouched] = useState(valueCm != null);

  const emit = (w: number, t: number) => {
    const v = min + w + t / 10;
    onChange(imp ? Math.round(v * 2.54 * 10) / 10 : Math.round(v * 10) / 10);
  };
  const ints = Array.from({ length: max - min + 1 }, (_, i) => String(min + i));
  const tenths = Array.from({ length: 10 }, (_, i) => String(i));

  return (
    <div>
      <div className={`flex items-center gap-1 rounded-[28px] bg-surface p-2 shadow-[var(--shadow)] transition-opacity duration-500 ${touched ? "" : "opacity-70"}`}>
        <WheelColumn items={ints} index={whole} dim={!touched} onChange={(i) => { setWhole(i); setTouched(true); emit(i, tenth); }} />
        <span className="pb-1 text-2xl font-extrabold">.</span>
        <WheelColumn items={tenths} index={tenth} dim={!touched} onChange={(i) => { setTenth(i); setTouched(true); emit(whole, i); }} />
        <span className="w-12 text-center text-lg font-bold text-soft">{imp ? "in" : "cm"}</span>
      </div>
      <div className="mt-2 flex h-8 items-center justify-center">
        {touched ? (
          <button type="button" className="text-sm font-bold text-soft underline underline-offset-4" onClick={() => { setTouched(false); onChange(undefined); }}>{tc("clear")}</button>
        ) : (
          <span className="text-sm font-semibold text-soft">{tc("scrollToSet")}</span>
        )}
      </div>
    </div>
  );
}
