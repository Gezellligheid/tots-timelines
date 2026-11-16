"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Icon } from "./Icon";
import { EASE } from "./motion";
import { useApp } from "@/providers/Providers";

/**
 * A slim strip at the top, only when it has something to say:
 * offline (everything is kept on the device), syncing N changes, and a brief "All synced".
 */
export function SyncStatus() {
  const t = useTranslations("offline");
  const { online, pendingCount } = useApp();
  const [flash, setFlash] = useState(false);
  const prev = useRef(0);

  useEffect(() => {
    const was = prev.current;
    prev.current = pendingCount;
    if (was > 0 && pendingCount === 0 && online) {
      setFlash(true);
      const id = setTimeout(() => setFlash(false), 2600);
      return () => clearTimeout(id);
    }
  }, [pendingCount, online]);

  const mode = !online ? "offline" : pendingCount > 0 ? "syncing" : flash ? "synced" : null;
  const tone = { offline: "bg-butter text-butter-ink", syncing: "bg-lavender text-lavender-ink", synced: "bg-mint text-mint-ink" };

  return (
    <div className="sticky top-0 z-[65]" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <AnimatePresence initial={false}>
        {mode && (
          <motion.div
            key={mode}
            role="status"
            aria-live="polite"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 34, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.45, ease: EASE }}
            className={`overflow-hidden rounded-b-[18px] ${tone[mode]}`}
          >
            <div className="flex h-[34px] items-center justify-center gap-2 text-xs font-extrabold">
              {mode === "offline" && <Icon name="cloudOff" size={15} />}
              {mode === "syncing" && (
                <motion.span animate={{ rotate: 360 }} transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }} className="inline-flex">
                  <Icon name="swap" size={15} />
                </motion.span>
              )}
              {mode === "synced" && <Icon name="check" size={15} strokeWidth={3} />}
              <span>
                {mode === "offline" && (pendingCount > 0 ? `${t("offline")} · ${t("waiting", { n: pendingCount })}` : `${t("offline")} · ${t("saved")}`)}
                {mode === "syncing" && t("syncing", { n: pendingCount })}
                {mode === "synced" && t("synced")}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
