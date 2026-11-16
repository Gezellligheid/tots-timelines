"use client";
import { useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "./Icon";
import { useApp } from "@/providers/Providers";
import { STREAK_BADGES, computeStreak } from "@/lib/streak";

/** A small, gentle "5 days in a row" chip (from 3 days), with a one-time cheer at 7, 14 and 30. Never nags when it breaks. */
export function StreakPill() {
  const t = useTranslations("home");
  const { baby, events, moments, growth, toast } = useApp();
  const s = useMemo(() => computeStreak([...events, ...moments, ...growth]), [events, moments, growth]);

  useEffect(() => {
    if (!baby) return;
    const key = `tt-streak-${baby.id}`;
    let seen = 0;
    try { seen = Number(localStorage.getItem(key) ?? 0); } catch {}
    const hit = [...STREAK_BADGES].reverse().find((b) => s.days >= b);
    if (hit && hit > seen) {
      try { localStorage.setItem(key, String(hit)); } catch {}
      toast(t(`streak.badge${hit}`));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.days, baby?.id]);

  if (s.days < 3) return null;
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-butter px-2.5 py-1 text-[11px] font-extrabold text-butter-ink">
      <Icon name="star" size={12} /> {t("streak.days", { n: s.days >= 35 ? "35+" : s.days })}
    </span>
  );
}
