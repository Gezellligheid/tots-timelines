"use client";
import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { useApp } from "@/providers/Providers";
import { Chip, Sheet } from "@/components/ui";
import { EventRow } from "@/components/EventRow";
import { Icon } from "@/components/Icon";
import { MomentCard } from "@/components/MomentCard";
import { EASE, RevealText } from "@/components/motion";
import { removeEvent, restoreEvent } from "@/lib/data";
import { byDay, startOfDay, DAY } from "@/lib/stats";
import type { EventDoc, EventType } from "@/lib/types";

type Filter = "all" | EventType;

export default function TimelinePage() {
  const t = useTranslations("timeline");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { baby, events, growth, moments, userDoc, toast, eventsReady } = useApp();
  const [filter, setFilter] = useState<Filter>("all");
  const [sel, setSel] = useState<EventDoc | null>(null);
  const units = userDoc?.units ?? "metric";

  const all = useMemo(() => [...events, ...growth, ...moments].sort((a, b) => b.start - a.start), [events, growth, moments]);
  const list = useMemo(() => (filter === "all" ? all : all.filter((e) => e.type === filter)), [all, filter]);
  const groups = useMemo(() => [...byDay(list).entries()], [list]);
  if (!baby) return null;

  const label = (key: string) => {
    const d = new Date(key + "T12:00:00");
    const diff = Math.round((startOfDay(Date.now()) - startOfDay(d.getTime())) / DAY);
    if (diff === 0) return tc("today");
    if (diff === 1) return tc("yesterday");
    return d.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" });
  };

  const del = () => {
    if (!sel) return;
    const e = sel;
    removeEvent(baby.id, e.id);
    setSel(null);
    toast(t("deleted"), { label: tc("undo"), run: () => restoreEvent(baby.id, e) });
  };

  return (
    <div className="space-y-5 pt-2">
      <h1 className="text-3xl font-extrabold"><RevealText text={t("title")} /></h1>
      <div className="-mx-5 flex gap-2 overflow-x-auto px-5">
        {(["all", "feed", "sleep", "diaper", "growth", "moment"] as Filter[]).map((f) => (
          <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>{t(f)}</Chip>
        ))}
      </div>

      {!eventsReady ? (
        <div className="shimmer h-24 rounded-[24px]" />
      ) : (
        <div className="relative space-y-7">
          <AnimatePresence mode="popLayout" initial={false}>
            {groups.map(([key, items]) => (
              <motion.section key={filter + key} initial={{ clipPath: "inset(0 0 100% 0 round 24px)" }} animate={{ clipPath: "inset(0 0 0% 0 round 24px)" }} transition={{ duration: 0.7, ease: EASE }}>
                <h2 className="mb-3 px-1 text-sm font-extrabold uppercase tracking-wide text-soft">{label(key)}</h2>
                <div className="space-y-3">
                  {items.map((e) => (e.type === "moment" ? <MomentCard key={e.id} e={e} onClick={() => setSel(e)} /> : <EventRow key={e.id} e={e} units={units} onClick={() => setSel(e)} />))}
                </div>
              </motion.section>
            ))}
          </AnimatePresence>
          {!groups.length && <p className="card p-6 text-center text-soft">{t("empty")}</p>}
          <div className="flex items-center gap-3 rounded-[24px] bg-butter p-4">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-surface text-butter-ink"><Icon name="star" size={24} /></span>
            <div>
              <p className="font-bold">{t("born", { name: baby.name })}</p>
              <p className="text-sm text-ink/60">{new Date(baby.birthDate + "T12:00:00").toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })}</p>
            </div>
          </div>
        </div>
      )}

      <Sheet open={!!sel} onClose={() => setSel(null)}>
        {sel && (
          <div className="space-y-4">
            {sel.type === "moment" ? <MomentCard e={sel} /> : <EventRow e={sel} units={units} />}
            <p className="text-center font-semibold">{t("deleteQ")}</p>
            <div className="flex gap-3">
              <button className="ghost-btn flex-1" onClick={() => setSel(null)}>{tc("cancel")}</button>
              <button className="pill-btn flex-1" onClick={del}><Icon name="trash" size={20} />{tc("delete")}</button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}
