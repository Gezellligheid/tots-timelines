"use client";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useApp } from "@/providers/Providers";
import { ensureDailyReminder } from "@/lib/dailyReminder";
import { pushState } from "@/lib/push";

/** On devices that already have notifications on, make sure the daily reminder exists for the active baby. */
export function DailyReminderAuto() {
  const t = useTranslations("profile");
  const { user, baby, userDoc } = useApp();
  const done = useRef(new Set<string>());
  const ready = userDoc !== undefined;

  useEffect(() => {
    if (!user || !baby || !ready) return;
    const key = `${user.uid}_${baby.id}`;
    if (done.current.has(key)) return;
    let live = true;
    pushState().then((s) => {
      if (!live || s !== "enabled") return;
      done.current.add(key);
      void ensureDailyReminder(user.uid, baby.id, t("dailyLabel"));
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, baby?.id, ready]);

  return null;
}
