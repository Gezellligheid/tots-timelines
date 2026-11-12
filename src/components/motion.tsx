"use client";
import { motion, useReducedMotion, type Transition } from "framer-motion";
import { useEffect, useState } from "react";

export const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Words slide up from behind a mask (overflow-hidden line box). */
export function RevealText({ text, className = "", delay = 0, as: Tag = "div" }: { text: string; className?: string; delay?: number; as?: "div" | "h1" | "h2" | "p" | "span" }) {
  const reduce = useReducedMotion();
  const words = text.split(" ");
  return (
    <Tag className={className} aria-label={text}>
      {words.map((w, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.12em] align-bottom" aria-hidden>
          <motion.span
            className="inline-block"
            initial={reduce ? { opacity: 0 } : { y: "110%" }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: delay + i * 0.05 }}
          >
            {w}
            {i < words.length - 1 ? " " : ""}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}

/** Circular clip-path reveal. `origin` is in % of the element. */
export function MaskReveal({ children, className = "", origin = "50% 50%", delay = 0, duration = 0.9 }: { children: React.ReactNode; className?: string; origin?: string; delay?: number; duration?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? { opacity: 0 } : { clipPath: `circle(0% at ${origin})` }}
      animate={reduce ? { opacity: 1 } : { clipPath: `circle(150% at ${origin})` }}
      transition={{ duration, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

/** Rounded-rect wipe that rises from the bottom (used for cards/lists). */
export function WipeIn({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? { opacity: 0 } : { clipPath: "inset(100% 0% 0% 0% round 28px)", y: 16 }}
      animate={reduce ? { opacity: 1 } : { clipPath: "inset(0% 0% 0% 0% round 28px)", y: 0 }}
      transition={{ duration: 0.8, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

export const spring: Transition = { type: "spring", stiffness: 420, damping: 32 };

/** Animated number counter */
export function CountUp({ value, decimals = 0, className }: { value: number; decimals?: number; className?: string }) {
  const [v, setV] = useState(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return setV(value);
    let raf = 0;
    const from = 0, t0 = performance.now(), dur = 900;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      setV(from + (value - from) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reduce]);
  return <span className={className}>{v.toFixed(decimals)}</span>;
}
