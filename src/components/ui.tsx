"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Icon";
import { EASE } from "./motion";
import { photoUrl } from "@/lib/media";
import type { AccentName } from "@/lib/types";

// Stack of open sheets: only the top-most reacts to Escape, scroll lock is ref-counted
const sheetStack: symbol[] = [];

export function useNow(active = true, every = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const i = setInterval(() => setNow(Date.now()), every);
    return () => clearInterval(i);
  }, [active, every]);
  return now;
}

export function Chip({ active, onClick, children, tone }: { active?: boolean; onClick?: () => void; children: React.ReactNode; tone?: AccentName }) {
  return (
    <button
      onClick={onClick}
      className={`h-11 shrink-0 whitespace-nowrap rounded-full px-5 text-[15px] font-semibold leading-none transition-all duration-300 ${
        active ? "on-ink" : tone ? `bg-${tone}` : "bg-surface border border-line"
      }`}
    >
      {children}
    </button>
  );
}

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="relative flex rounded-full bg-surface p-1 shadow-[var(--shadow)]">
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)} className="relative z-10 h-10 flex-1 rounded-full text-sm font-semibold">
          {value === o.value && (
            <motion.span layoutId="seg" className="absolute inset-0 rounded-full bg-accent" transition={{ type: "spring", stiffness: 400, damping: 34 }} />
          )}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

/** Bottom sheet that opens with a circular mask from `origin` (viewport px). */
export function Sheet({ open, onClose, origin, children, title }: { open: boolean; onClose: () => void; origin?: { x: number; y: number } | null; children: React.ReactNode; title?: string }) {
  const [mounted, setMounted] = useState(false);
  const openedAt = useRef(0);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    openedAt.current = Date.now();
    const me = Symbol("sheet");
    sheetStack.push(me);
    const k = (e: KeyboardEvent) => e.key === "Escape" && sheetStack[sheetStack.length - 1] === me && onClose();
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", k);
    return () => {
      sheetStack.splice(sheetStack.indexOf(me), 1);
      if (!sheetStack.length) document.body.style.overflow = "";
      window.removeEventListener("keydown", k);
    };
  }, [open, onClose]);
  if (!mounted) return null;
  const o = origin ?? { x: window.innerWidth / 2, y: window.innerHeight };
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center">
          <motion.div className="absolute inset-0 bg-black/35" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { if (Date.now() - openedAt.current > 700) onClose(); }} />
          <motion.div
            role="dialog"
            aria-label={title}
            className="relative max-h-[92dvh] w-full max-w-[520px] overflow-y-auto rounded-t-[36px] bg-bg p-5 pb-8 safe-b"
            initial={{ clipPath: `circle(0px at ${o.x}px ${o.y}px)` }}
            animate={{ clipPath: `circle(2000px at ${o.x}px ${o.y}px)` }}
            exit={{ clipPath: `circle(0px at ${o.x}px ${o.y}px)`, transition: { duration: 0.4, ease: EASE } }}
            transition={{ duration: 0.9, ease: EASE }}
          >
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-line" />
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="glass-btn" onClick={onClick} aria-label="Back">
      <Icon name="back" size={20} />
    </button>
  );
}

/** Private R2 photo via short-lived signed URL, with fallback avatar */
export function BabyAvatar({ photoKey, color, size = 48, className = "" }: { photoKey?: string; color: AccentName; size?: number; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    setUrl(null);
    if (photoKey) photoUrl(photoKey).then((u) => live && setUrl(u)).catch(() => {});
    return () => {
      live = false;
    };
  }, [photoKey]);
  return (
    <span className={`relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-${color} text-${color}-ink ${className}`} style={{ width: size, height: size }}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <Icon name="baby" size={size * 0.58} />
      )}
    </span>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`shimmer rounded-[28px] ${className}`} />;
}

/** Private R2 photo that opens with a circular mask reveal once loaded */
export function PhotoImage({ photoKey, className = "" }: { photoKey: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let live = true;
    photoUrl(photoKey).then((u) => live && setUrl(u)).catch(() => {});
    return () => {
      live = false;
    };
  }, [photoKey]);
  return (
    <div className={`relative overflow-hidden bg-surface2 ${className}`}>
      {!loaded && <div className="shimmer absolute inset-0" />}
      {url && (
        <motion.img
          src={url}
          alt=""
          onLoad={() => setLoaded(true)}
          className="absolute inset-0 h-full w-full object-cover"
          initial={{ clipPath: "circle(0% at 50% 50%)" }}
          animate={{ clipPath: loaded ? "circle(100% at 50% 50%)" : "circle(0% at 50% 50%)" }}
          transition={{ duration: 0.9, ease: EASE }}
        />
      )}
    </div>
  );
}
