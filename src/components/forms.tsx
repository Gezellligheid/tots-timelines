"use client";
import { motion } from "framer-motion";
import { useState } from "react";
import { Icon, type IconName } from "./Icon";
import { EASE } from "./motion";
import { MeasureWheel } from "./Wheel";
import { splitLbOz } from "@/lib/units";
import type { AccentName, Units } from "@/lib/types";

/** Big pastel choice card. On select its colour floods in from the tap point (radial mask). */
export function ChoiceCard({ selected, onSelect, tone, icon, label, sub, compact }: { selected: boolean; onSelect: () => void; tone: AccentName; icon?: IconName; label: string; sub?: string; compact?: boolean }) {
  const [pt, setPt] = useState({ x: 50, y: 50 });
  return (
    <button
      type="button"
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setPt({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
        onSelect();
      }}
      className={`relative overflow-hidden rounded-[28px] bg-surface text-left shadow-[var(--shadow)] transition-transform active:scale-[.97] ${compact ? "p-4" : "p-5"}`}
      aria-pressed={selected}
    >
      <motion.span
        aria-hidden
        className={`absolute inset-0 bg-${tone}`}
        initial={false}
        animate={{ clipPath: selected ? `circle(150% at ${pt.x}% ${pt.y}%)` : `circle(0% at ${pt.x}% ${pt.y}%)` }}
        transition={{ duration: 0.7, ease: EASE }}
      />
      <span className="relative flex items-center gap-3">
        {icon && (
          <span className={`grid h-11 w-11 place-items-center rounded-full bg-${tone} text-${tone}-ink`}>
            <Icon name={icon} size={24} />
          </span>
        )}
        <span className="flex-1">
          <span className="block text-[17px] font-bold leading-tight">{label}</span>
          {sub && <span className="mt-0.5 block text-sm text-soft">{sub}</span>}
        </span>
        <motion.span
          className="grid h-7 w-7 place-items-center rounded-full on-ink"
          initial={false}
          animate={{ scale: selected ? 1 : 0, opacity: selected ? 1 : 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 26 }}
        >
          <Icon name="check" size={16} strokeWidth={3} />
        </motion.span>
      </span>
    </button>
  );
}

export function Stepper({ value, min, max, step = 1, onChange, format }: { value: number; min: number; max: number; step?: number; onChange: (v: number) => void; format?: (v: number) => string }) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, +(v).toFixed(2))));
  return (
    <div className="flex items-center justify-between rounded-full bg-surface p-1.5 shadow-[var(--shadow)]">
      <button type="button" className="glass-btn !h-12 !w-12 text-2xl font-bold" onClick={() => set(value - step)} aria-label="−">−</button>
      <span className="text-xl font-extrabold tabular-nums">{format ? format(value) : value}</span>
      <button type="button" className="glass-btn !h-12 !w-12 text-2xl font-bold" onClick={() => set(value + step)} aria-label="+">+</button>
    </div>
  );
}

function NumField({ value, onChange, suffix, ph, step = "0.01" }: { value: string; onChange: (v: string) => void; suffix: string; ph?: string; step?: string }) {
  return (
    <label className="relative block flex-1">
      <input className="field pr-14" inputMode="decimal" type="number" step={step} min="0" placeholder={ph} value={value} onChange={(e) => onChange(e.target.value)} />
      <span className="absolute right-5 top-1/2 -translate-y-1/2 font-semibold text-soft">{suffix}</span>
    </label>
  );
}

export function WeightInput({ valueG, onChange, units }: { valueG?: number; onChange: (g?: number) => void; units: Units }) {
  const init = valueG != null ? (units === "imperial" ? splitLbOz(valueG) : null) : null;
  const [kg, setKg] = useState(valueG != null && units === "metric" ? String(+(valueG / 1000).toFixed(3)) : "");
  const [lb, setLb] = useState(init ? String(init.lb) : "");
  const [oz, setOz] = useState(init ? String(init.oz) : "");
  if (units === "metric") {
    return (
      <NumField
        value={kg}
        suffix="kg"
        ph="3.40"
        onChange={(v) => {
          setKg(v);
          onChange(v === "" ? undefined : Math.round(parseFloat(v) * 1000));
        }}
      />
    );
  }
  const emit = (l: string, o: string) => {
    if (l === "" && o === "") return onChange(undefined);
    onChange(Math.round(((parseFloat(l) || 0) * 16 + (parseFloat(o) || 0)) * 28.349523));
  };
  return (
    <div className="flex gap-3">
      <NumField value={lb} suffix="lb" ph="7" step="1" onChange={(v) => { setLb(v); emit(v, oz); }} />
      <NumField value={oz} suffix="oz" ph="8" step="0.1" onChange={(v) => { setOz(v); emit(lb, v); }} />
    </div>
  );
}

export function LengthInput({ valueCm, onChange, units, kind = "length" }: { valueCm?: number; onChange: (cm?: number) => void; units: Units; kind?: "length" | "head" }) {
  return <MeasureWheel valueCm={valueCm} onChange={onChange} units={units} kind={kind} />;
}
