"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { api } from "@/lib/data";
import { useApp } from "@/providers/Providers";
import { Icon } from "./Icon";
import { EASE, RevealText } from "./motion";
import { BabyAvatar } from "./ui";
import { dueN, nextWrappedAt, wrappedKey } from "@/lib/wrapped";
import { ACCENTS, type Baby } from "@/lib/types";

export function useWrappedReady() {
  const { baby, userDoc } = useApp();
  const n = baby?.wrappedReadyN ?? 0;
  const ready = !!(baby && n && !userDoc?.wrappedSeen?.[wrappedKey(baby.id, n)]);
  return { ready, n, baby };
}

export function usePeriodLabel() {
  const t = useTranslations("wrapped");
  return (n: number) => (n === 3 ? t("periodFirst", { n }) : t("periodRange", { from: n - 2, to: n }));
}

const SESSION_FLAG = "tt-wrapped-gate";

/** The full-screen "your Wrapped is ready" screen (presentational, also used by the localhost demo). */
export function WrappedReadyScreen({ baby, n, onSee, onSkip }: { baby: Baby; n: number; onSee: () => void; onSkip: () => void }) {
  const t = useTranslations("wrapped");
  const label = usePeriodLabel();
  const bits = useMemo(() => Array.from({ length: 18 }, (_, i) => ({ a: (i / 18) * Math.PI * 2, r: 120 + (i % 5) * 45, c: ACCENTS[i % 6], s: 10 + (i % 4) * 5, round: i % 3 !== 0 })), []);
  return (
    <motion.div
      role="dialog"
      aria-label={t("readyTitle", { name: baby.name })}
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center overflow-hidden bg-lavender px-8 text-center"
      initial={{ clipPath: "circle(0% at 50% 62%)" }}
      animate={{ clipPath: "circle(150% at 50% 62%)" }}
      exit={{ clipPath: "circle(0% at 50% 62%)", transition: { duration: 0.6, ease: EASE } }}
      transition={{ duration: 1.1, ease: EASE }}
    >
      <motion.span className="breathe absolute -left-24 top-10 h-72 w-72 rounded-full bg-blush" />
      <motion.span className="absolute -right-20 bottom-24 h-64 w-64 rounded-full bg-mint" animate={{ y: [0, -14, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} />
      <div className="pointer-events-none absolute left-1/2 top-[34%]">
        {bits.map((b, i) => (
          <motion.span
            key={i}
            className={`absolute bg-${b.c}`}
            style={{ width: b.s, height: b.s, borderRadius: b.round ? 999 : 6 }}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
            animate={{ x: Math.cos(b.a) * b.r, y: Math.sin(b.a) * b.r, opacity: [0, 1, 0.9], scale: 1, rotate: 160 }}
            transition={{ duration: 1.8, ease: EASE, delay: 0.5 }}
          />
        ))}
      </div>

      <div className="relative z-10 flex w-full max-w-[420px] flex-col items-center">
        <motion.div initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 220, damping: 18, delay: 0.5 }} className="rounded-full bg-surface p-2 shadow-[var(--shadow)]">
          <BabyAvatar photoKey={baby.photoKey} color={baby.color} size={120} />
        </motion.div>
        <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-surface px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-wider text-lavender-ink">
          <Icon name="star" size={14} /> {t("title")}
        </motion.span>
        <h1 className="mt-4 text-[34px] font-extrabold leading-[1.08] tracking-tight">
          <RevealText text={t("readyTitle", { name: baby.name })} delay={0.9} />
        </h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }} className="mt-3 text-base font-semibold text-ink/70">
          {label(n)}
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5, duration: 0.7, ease: EASE }} className="mt-10 w-full space-y-2">
          <button className="pill-btn w-full" onClick={onSee}>{t("see")}</button>
          <button className="h-12 w-full text-[15px] font-bold text-ink/70" onClick={onSkip}>{t("skip")}</button>
        </motion.div>
      </div>
    </motion.div>
  );
}

/** Mounted once in the app shell: asks the server whether a Wrapped is due, and shows the full-screen "ready" screen on app open. */
export function WrappedGate() {
  const router = useRouter();
  const { ready, n, baby } = useWrappedReady();
  const [show, setShow] = useState(false);
  const checked = useRef(new Set<string>());

  // Ask the server (once per baby + period) whether the latest finished period has a Wrapped
  useEffect(() => {
    if (!baby) return;
    if (baby.nextWrappedAt == null) {
      void updateDoc(doc(db, "babies", baby.id), { nextWrappedAt: nextWrappedAt(baby.birthDate, baby.wrappedCheckedN ?? 0) }).catch(() => {});
    }
    const due = dueN(baby.birthDate);
    const key = `${baby.id}_${due}`;
    if (due && (baby.wrappedCheckedN ?? 0) < due && !checked.current.has(key)) {
      checked.current.add(key);
      api("/api/wrapped/check", { babyId: baby.id }).catch(() => checked.current.delete(key));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baby?.id, baby?.birthDate, baby?.wrappedCheckedN, baby?.nextWrappedAt]);

  // Show the full-screen screen once per app open while a Wrapped is waiting
  useEffect(() => {
    if (!ready || !baby) return setShow(false);
    let done = false;
    try { done = sessionStorage.getItem(`${SESSION_FLAG}-${baby.id}-${n}`) === "1"; } catch {}
    setShow(!done);
  }, [ready, baby, n]);

  const dismiss = () => {
    try { if (baby) sessionStorage.setItem(`${SESSION_FLAG}-${baby.id}-${n}`, "1"); } catch {}
    setShow(false);
  };

  if (!baby) return null;
  return (
    <AnimatePresence>
      {show && (
        <WrappedReadyScreen
          key="wrapped-gate"
          baby={baby}
          n={n}
          onSee={() => {
            dismiss();
            router.push(`/wrapped/${n}`);
          }}
          onSkip={dismiss}
        />
      )}
    </AnimatePresence>
  );
}

/** Card for Home (same spot as the install card) while a Wrapped is waiting. */
export function WrappedCard() {
  const t = useTranslations("wrapped");
  const label = usePeriodLabel();
  const { ready, n, baby } = useWrappedReady();
  if (!ready || !baby) return null;
  return (
    <motion.div initial={{ clipPath: "inset(0 100% 0 0 round 30px)" }} animate={{ clipPath: "inset(0 0% 0 0 round 30px)" }} transition={{ duration: 0.9, ease: EASE }}>
      <Link href={`/wrapped/${n}`} className="relative block overflow-hidden rounded-[30px] bg-butter p-5">
        <span className="breathe absolute -right-8 -top-10 h-36 w-36 rounded-full bg-blush" />
        <span className="absolute -bottom-12 right-16 h-28 w-28 rounded-full bg-mint opacity-80" />
        <div className="relative flex items-center gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-surface text-butter-ink"><Icon name="star" size={30} strokeWidth={1.8} /></span>
          <div className="min-w-0 flex-1">
            <span className="on-ink inline-block rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider">{t("newBadge")}</span>
            <p className="mt-1 text-lg font-extrabold leading-tight">{t("readyTitle", { name: baby.name })}</p>
            <p className="text-xs font-semibold text-ink/60">{label(n)}</p>
          </div>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface"><Icon name="arrowUR" size={20} /></span>
        </div>
      </Link>
    </motion.div>
  );
}
