"use client";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { Sheet } from "./ui";
import { Icon } from "./Icon";
import { EASE } from "./motion";
import { WheelColumn } from "./Wheel";

/* ---------- helpers ---------- */
const pad = (n: number) => String(n).padStart(2, "0");
export const parseYmd = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};
export const toYmd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const sameDay = (a: Date, b: Date) => startOfDay(a) === startOfDay(b);

/* ---------- time wheels ---------- */
const HOURS = Array.from({ length: 24 }, (_, i) => pad(i));
const MINUTES = Array.from({ length: 60 }, (_, i) => pad(i));

function TimeWheels({ h, m, setH, setM }: { h: number; m: number; setH: (v: number) => void; setM: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2 rounded-[28px] bg-surface p-2 shadow-[var(--shadow)]">
      <WheelColumn items={HOURS} index={h} onChange={setH} />
      <span className="text-2xl font-extrabold">:</span>
      <WheelColumn items={MINUTES} index={m} onChange={setM} />
    </div>
  );
}

/* ---------- calendar sheet ---------- */
type Mode = "date" | "datetime" | "time";

function PickerSheet({ open, onClose, origin, mode, value, min, max, onPick }: { open: boolean; onClose: () => void; origin: { x: number; y: number } | null; mode: Mode; value: Date; min?: Date; max?: Date; onPick: (d: Date) => void }) {
  const locale = useLocale();
  const tc = useTranslations("common");
  const [view, setView] = useState({ y: value.getFullYear(), m: value.getMonth() });
  const [level, setLevel] = useState<"days" | "months" | "years">("days");
  const [dir, setDir] = useState(1);
  const [sel, setSel] = useState(value);
  const [h, setH] = useState(value.getHours());
  const [mi, setMi] = useState(value.getMinutes());

  useEffect(() => {
    if (open) {
      setSel(value);
      setView({ y: value.getFullYear(), m: value.getMonth() });
      setLevel("days");
      setH(value.getHours());
      setMi(value.getMinutes());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const first = locale.startsWith("nl") ? 1 : 0; // Monday-first in NL
  const weekdays = useMemo(() => {
    const base = new Date(2023, 0, 1); // a Sunday
    return Array.from({ length: 7 }, (_, i) => new Date(base.getFullYear(), 0, 1 + ((i + first) % 7)).toLocaleDateString(locale, { weekday: "narrow" }));
  }, [locale, first]);

  const monthLabel = new Date(view.y, view.m, 1).toLocaleDateString(locale, { month: "long", year: "numeric" });
  const lead = (new Date(view.y, view.m, 1).getDay() - first + 7) % 7;
  const daysIn = new Date(view.y, view.m + 1, 0).getDate();
  const today = new Date();
  const blocked = (d: Date) => (max && startOfDay(d) > startOfDay(max)) || (min && startOfDay(d) < startOfDay(min));
  const nav = (delta: number) => {
    setDir(delta);
    const d = new Date(view.y, view.m + delta, 1);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  };
  const canNext = !max || new Date(view.y, view.m + 1, 1).getTime() <= max.getTime();
  const yearStart = Math.floor(view.y / 12) * 12;

  const finish = (d: Date) => {
    const out = new Date(d.getFullYear(), d.getMonth(), d.getDate(), mode === "date" ? 12 : h, mode === "date" ? 0 : mi);
    onPick(max && out > max ? max : out);
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} origin={origin}>
      <div className="space-y-4">
        {mode !== "time" && (
          <>
            <div className="flex items-center justify-between">
              <button className="glass-btn" onClick={() => (level === "days" ? nav(-1) : setView((v) => ({ ...v, y: v.y - (level === "years" ? 12 : 1) })))} aria-label="Previous"><Icon name="back" size={20} /></button>
              <button className="rounded-full px-4 py-2 text-lg font-extrabold capitalize transition-colors hover:bg-surface" onClick={() => setLevel(level === "days" ? "months" : level === "months" ? "years" : "days")}>
                {level === "years" ? `${yearStart} – ${yearStart + 11}` : level === "months" ? view.y : monthLabel}
              </button>
              <button className="glass-btn disabled:opacity-30" disabled={level === "days" && !canNext} onClick={() => (level === "days" ? nav(1) : setView((v) => ({ ...v, y: v.y + (level === "years" ? 12 : 1) })))} aria-label="Next"><Icon name="chevR" size={20} /></button>
            </div>

            <div className="relative h-[300px] overflow-hidden">
              <AnimatePresence initial={false} custom={dir} mode="popLayout">
                {level === "days" && (
                  <motion.div
                    key={`d${view.y}-${view.m}`}
                    custom={dir}
                    className="absolute inset-0"
                    initial={{ clipPath: dir > 0 ? "inset(0 0 0 100% round 24px)" : "inset(0 100% 0 0 round 24px)", opacity: 0.4 }}
                    animate={{ clipPath: "inset(0 0% 0 0% round 24px)", opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.55, ease: EASE }}
                  >
                    <div className="mb-1 grid grid-cols-7 text-center text-xs font-bold uppercase text-soft">
                      {weekdays.map((w, i) => <span key={i} className="py-2">{w}</span>)}
                    </div>
                    <div className="grid grid-cols-7 gap-y-1">
                      {Array.from({ length: lead }, (_, i) => <span key={`b${i}`} />)}
                      {Array.from({ length: daysIn }, (_, i) => {
                        const d = new Date(view.y, view.m, i + 1);
                        const isSel = sameDay(d, sel);
                        const off = !!blocked(d);
                        return (
                          <button
                            key={i}
                            type="button"
                            disabled={off}
                            onClick={() => (mode === "date" ? finish(d) : setSel(d))}
                            className={`mx-auto grid h-11 w-11 place-items-center rounded-full text-[15px] font-bold transition-all duration-300 active:scale-90 disabled:opacity-25 ${isSel ? "on-ink scale-105" : sameDay(d, today) ? "bg-accent" : "hover:bg-surface"}`}
                          >
                            {i + 1}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
                {level === "months" && (
                  <motion.div key="m" className="absolute inset-0 grid grid-cols-3 gap-3 pt-2" initial={{ clipPath: "circle(0% at 50% 20%)" }} animate={{ clipPath: "circle(150% at 50% 20%)" }} transition={{ duration: 0.6, ease: EASE }}>
                    {Array.from({ length: 12 }, (_, i) => {
                      const dis = max && new Date(view.y, i, 1) > max;
                      return (
                        <button key={i} disabled={!!dis} onClick={() => { setView({ y: view.y, m: i }); setLevel("days"); }} className={`h-14 rounded-full text-[15px] font-bold capitalize disabled:opacity-25 ${i === view.m && view.y === sel.getFullYear() ? "on-ink" : "bg-surface"}`}>
                          {new Date(2000, i, 1).toLocaleDateString(locale, { month: "short" })}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
                {level === "years" && (
                  <motion.div key="y" className="absolute inset-0 grid grid-cols-3 gap-3 pt-2" initial={{ clipPath: "circle(0% at 50% 20%)" }} animate={{ clipPath: "circle(150% at 50% 20%)" }} transition={{ duration: 0.6, ease: EASE }}>
                    {Array.from({ length: 12 }, (_, i) => {
                      const y = yearStart + i;
                      const dis = (max && y > max.getFullYear()) || (min && y < min.getFullYear());
                      return (
                        <button key={y} disabled={!!dis} onClick={() => { setView({ y, m: view.m }); setLevel("months"); }} className={`h-14 rounded-full text-[15px] font-bold disabled:opacity-25 ${y === sel.getFullYear() ? "on-ink" : "bg-surface"}`}>{y}</button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}

        {mode !== "date" && <TimeWheels h={h} m={mi} setH={setH} setM={setMi} />}

        {mode !== "date" && (
          <div className="flex gap-3">
            {max && <button className="ghost-btn" onClick={() => { const n = new Date(); onPick(n); onClose(); }}>{tc("now")}</button>}
            <button className="pill-btn flex-1" onClick={() => finish(sel)}>{tc("done")}</button>
          </div>
        )}
      </div>
    </Sheet>
  );
}

/* ---------- field triggers ---------- */
function Trigger({ label, empty, onClick, icon = "calendar", onClear }: { label: string; empty?: boolean; onClick: (e: React.MouseEvent<HTMLButtonElement>) => void; icon?: "calendar" | "timeline"; onClear?: () => void }) {
  return (
    <div className="relative">
      <button type="button" onClick={onClick} className="field flex items-center gap-3 !py-3 !text-base text-left">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-accent-ink"><Icon name={icon} size={18} /></span>
        <span className={`flex-1 truncate ${empty ? "text-soft" : ""}`}>{label}</span>
      </button>
      {onClear && !empty && (
        <button type="button" aria-label="Clear" onClick={onClear} className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-surface2"><Icon name="close" size={14} /></button>
      )}
    </div>
  );
}

function useOrigin() {
  const [open, setOpen] = useState(false);
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const show = (e: React.MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setOrigin({ x: r.left + 40, y: r.top + r.height / 2 });
    setOpen(true);
  };
  return { open, origin, show, close: () => setOpen(false) };
}

/** yyyy-MM-dd date field */
export function DateField({ value, onChange, max, min }: { value: string; onChange: (v: string) => void; max?: string; min?: string }) {
  const locale = useLocale();
  const p = useOrigin();
  const d = value ? parseYmd(value) : new Date();
  return (
    <>
      <Trigger onClick={p.show} label={value ? d.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "long", year: "numeric" }) : "—"} empty={!value} />
      <PickerSheet open={p.open} onClose={p.close} origin={p.origin} mode="date" value={d} max={max ? parseYmd(max) : undefined} min={min ? parseYmd(min) : undefined} onPick={(x) => onChange(toYmd(x))} />
    </>
  );
}

/** Date + time (epoch ms). `null` = not set. */
export function DateTimeField({ value, onChange, max, clearable, placeholder }: { value: number | null; onChange: (v: number | null) => void; max?: number; clearable?: boolean; placeholder?: string }) {
  const locale = useLocale();
  const p = useOrigin();
  const d = new Date(value ?? Date.now());
  const label = value == null ? placeholder ?? "—" : d.toLocaleString(locale, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  return (
    <>
      <Trigger onClick={p.show} label={label} empty={value == null} onClear={clearable ? () => onChange(null) : undefined} />
      <PickerSheet open={p.open} onClose={p.close} origin={p.origin} mode="datetime" value={d} max={max ? new Date(max) : undefined} onPick={(x) => onChange(x.getTime())} />
    </>
  );
}

/** HH:mm field */
export function TimeField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const p = useOrigin();
  const [h, m] = value.split(":").map(Number);
  const d = new Date(2000, 0, 1, h || 0, m || 0);
  return (
    <>
      <Trigger icon="timeline" onClick={p.show} label={value} />
      <PickerSheet open={p.open} onClose={p.close} origin={p.origin} mode="time" value={d} onPick={(x) => onChange(`${pad(x.getHours())}:${pad(x.getMinutes())}`)} />
    </>
  );
}
