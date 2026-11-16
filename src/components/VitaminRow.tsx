"use client";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { Icon } from "./Icon";
import { MemberAvatar, useMultiParent } from "./MemberAvatar";
import { EASE } from "./motion";
import { useNow } from "./ui";
import { useApp } from "@/providers/Providers";
import { addEvent, removeEvent } from "@/lib/data";
import { clock } from "@/lib/format";
import { startOfDay } from "@/lib/stats";

/**
 * One slim line on Home, only when the daily vitamin is switched on in Profile.
 * Both parents see whether it has been given today (and by whom), so it never gets doubled or forgotten.
 */
export function VitaminRow() {
  const t = useTranslations("vitamin");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { baby, events, toast } = useApp();
  const multi = useMultiParent();
  const now = useNow(true, 60000);
  if (!baby?.vitamin?.enabled) return null;

  const name = baby.vitamin.name?.trim() || t("defaultName");
  const d0 = startOfDay(now);
  const given = events.filter((e) => e.type === "supplement" && e.start >= d0).sort((a, b) => b.start - a.start)[0];

  if (given) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }} className="flex items-center gap-3 rounded-[24px] bg-mint p-3 pr-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface text-mint-ink"><Icon name="check" size={20} strokeWidth={3} /></span>
        <p className="flex-1 text-sm font-bold">{t("given", { name, time: clock(given.start, locale) })}</p>
        {multi && <MemberAvatar uid={given.createdBy} size={24} />}
        <button className="text-xs font-bold text-mint-ink underline underline-offset-4" onClick={() => removeEvent(baby.id, given.id, "supplement")}>{tc("undo")}</button>
      </motion.div>
    );
  }

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      whileTap={{ scale: 0.98 }}
      className="flex w-full items-center gap-3 rounded-[24px] bg-surface p-3 pr-4 text-left shadow-[var(--shadow)]"
      onClick={() => {
        const id = addEvent(baby.id, { type: "supplement", start: Date.now(), end: Date.now(), data: { title: name } });
        toast(t("marked", { name }), { label: tc("undo"), run: () => removeEvent(baby.id, id, "supplement") });
      }}
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-dashed border-mint-ink/50 text-mint-ink"><Icon name="pill" size={18} /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-extrabold">{t("markBtn", { name })}</span>
        <span className="block text-xs font-medium text-soft">{t("markHint")}</span>
      </span>
      <Icon name="check" size={20} className="shrink-0 text-soft opacity-40" />
    </motion.button>
  );
}
