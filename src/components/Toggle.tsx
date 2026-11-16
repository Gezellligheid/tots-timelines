"use client";

/** iOS-style on/off switch. */
export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={`relative h-8 w-14 shrink-0 rounded-full transition-colors duration-300 ${on ? "bg-ink" : "bg-line"}`}>
      <span className="absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all duration-300" style={{ left: on ? 28 : 4 }} />
    </button>
  );
}
