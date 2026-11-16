"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Icon } from "./Icon";
import { EASE } from "./motion";
import { useMomentTitle } from "./MomentCard";
import { PhotoImage } from "./ui";
import { useApp } from "@/providers/Providers";
import { dayKey } from "@/lib/stats";
import { onThisDay } from "@/lib/onThisDay";

/** "1 month ago today": a memory from the past, shown only on days when there is one, and easy to dismiss. */
export function OnThisDayCard() {
  const t = useTranslations("home");
  const { moments } = useApp();
  const title = useMomentTitle();
  const hit = useMemo(() => onThisDay(moments), [moments]);
  const key = `tt-otd-${dayKey(Date.now())}`;
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    try { setHidden(localStorage.getItem(key) === "1"); } catch { setHidden(false); }
  }, [key]);
  if (!hit || hidden) return null;

  const label = hit.kind === "days" ? t("onThisDay.days100") : t(`onThisDay.${hit.kind}`, { n: hit.n });
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }} className="relative">
      <Link href="/timeline" className="flex items-center gap-3 rounded-[24px] bg-surface p-3 pr-11 shadow-[var(--shadow)]">
        {hit.m.photoKey ? (
          <PhotoImage photoKey={hit.m.photoKey} className="h-16 w-16 shrink-0 rounded-[18px]" />
        ) : (
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-[18px] bg-sky text-sky-ink"><Icon name="star" size={26} /></span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-extrabold uppercase tracking-wide text-soft">{label}</span>
          <span className="block truncate font-bold">{title(hit.m)}</span>
          {hit.m.note && <span className="block truncate text-xs text-soft">{hit.m.note}</span>}
        </span>
      </Link>
      <button
        aria-label="Close"
        className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full text-soft"
        onClick={() => {
          setHidden(true);
          try { localStorage.setItem(key, "1"); } catch {}
        }}
      >
        <Icon name="close" size={16} />
      </button>
    </motion.div>
  );
}
