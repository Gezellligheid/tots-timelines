"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { collection, getDocs, limit, orderBy, query, startAfter, where, type QueryDocumentSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
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

/** Entries shown per step. More are revealed as you scroll, and older ones are fetched from the database. */
const PAGE = 20;
/** The app keeps this many days in memory; anything older is fetched page by page. */
const WINDOW_DAYS = 35;

function LoadingDots() {
  return (
    <div className="flex items-center justify-center gap-2" role="status" aria-label="Loading">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-2.5 w-2.5 rounded-full bg-accent-ink"
          animate={{ y: [0, -8, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

export default function TimelinePage() {
  const t = useTranslations("timeline");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { baby, events, growth, moments, userDoc, toast, eventsReady } = useApp();
  const [filter, setFilter] = useState<Filter>("all");
  const [sel, setSel] = useState<EventDoc | null>(null);
  const units = userDoc?.units ?? "metric";

  // paging
  const [visible, setVisible] = useState(PAGE);
  const [older, setOlder] = useState<EventDoc[]>([]);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [inView, setInView] = useState(false);
  const lastDoc = useRef<QueryDocumentSnapshot | null>(null);
  const windowStart = useRef(Date.now() - WINDOW_DAYS * DAY);
  const babyRef = useRef<string | undefined>(baby?.id);
  const sentinel = useRef<HTMLDivElement>(null);

  // a different baby starts from scratch
  useEffect(() => {
    babyRef.current = baby?.id;
    setOlder([]);
    setDone(false);
    setBusy(false);
    lastDoc.current = null;
    windowStart.current = Date.now() - WINDOW_DAYS * DAY;
    setVisible(PAGE);
  }, [baby?.id]);
  useEffect(() => setVisible(PAGE), [filter]);

  const all = useMemo(() => {
    const map = new Map<string, EventDoc>();
    for (const e of [...older, ...events, ...growth, ...moments]) map.set(e.id, e);
    return [...map.values()].sort((a, b) => b.start - a.start);
  }, [older, events, growth, moments]);
  const list = useMemo(() => (filter === "all" ? all : all.filter((e) => e.type === filter)), [all, filter]);
  // growth entries and moments are always fully loaded, so those filters never need the database
  const complete = filter === "growth" || filter === "moment";
  const shown = useMemo(() => list.slice(0, visible), [list, visible]);
  const groups = useMemo(() => [...byDay(shown).entries()], [shown]);
  const hasMore = visible < list.length || (!complete && !done);

  const fetchOlder = useCallback(async () => {
    const id = babyRef.current;
    if (!id) return;
    setBusy(true);
    try {
      const col = collection(db, "babies", id, "events");
      const q = lastDoc.current
        ? query(col, orderBy("start", "desc"), startAfter(lastDoc.current), limit(PAGE))
        : query(col, where("start", "<", windowStart.current), orderBy("start", "desc"), limit(PAGE));
      const snap = await getDocs(q);
      if (babyRef.current !== id) return;
      if (snap.docs.length) lastDoc.current = snap.docs[snap.docs.length - 1];
      setOlder((prev) => [...prev, ...snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<EventDoc, "id">) }))]);
      if (snap.docs.length < PAGE) setDone(true);
    } catch {
      setDone(true);
    }
    setBusy(false);
  }, []);

  // is the bottom of the list near the screen?
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: "300px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [eventsReady, hasMore]);

  // Near the bottom: reveal the next 20, or fetch older ones once everything loaded is shown.
  // After every render the real position is re-measured, so it loads just enough to fill the
  // screen and stops. (A stale "in view" flag would keep loading page after page.)
  useEffect(() => {
    if (!eventsReady) return;
    const el = sentinel.current;
    if (!el || el.getBoundingClientRect().top > window.innerHeight + 300) return;
    if (visible < list.length) setVisible((v) => v + PAGE);
    else if (!complete && !done && !busy) void fetchOlder();
  }, [inView, visible, list.length, complete, done, busy, eventsReady, fetchOlder]);

  if (!baby) return null;

  const label = (key: string) => {
    const d = new Date(key + "T12:00:00");
    const diff = Math.round((startOfDay(Date.now()) - startOfDay(d.getTime())) / DAY);
    if (diff === 0) return tc("today");
    if (diff === 1) return tc("yesterday");
    return d.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", ...(new Date(key).getFullYear() !== new Date().getFullYear() ? { year: "numeric" } : {}) });
  };

  const del = () => {
    if (!sel) return;
    const e = sel;
    removeEvent(baby.id, e.id);
    setOlder((prev) => prev.filter((x) => x.id !== e.id));
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
              <motion.section key={filter + key} initial={{ clipPath: "inset(0 0 100% 0 round 24px)" }} animate={{ clipPath: "inset(0 0 0% 0 round 24px)" }} transition={{ duration: 0.5, ease: EASE }}>
                <h2 className="mb-3 px-1 text-sm font-extrabold uppercase tracking-wide text-soft">{label(key)}</h2>
                <div className="space-y-3">
                  {items.map((e) => (e.type === "moment" ? <MomentCard key={e.id} e={e} onClick={() => setSel(e)} /> : <EventRow key={e.id} e={e} units={units} onClick={() => setSel(e)} />))}
                </div>
              </motion.section>
            ))}
          </AnimatePresence>
          {!groups.length && !hasMore && <p className="card p-6 text-center text-soft">{t("empty")}</p>}

          {hasMore ? (
            // sentinel: reaching it loads the next page
            <div ref={sentinel} className="flex h-16 items-center justify-center">
              {(busy || visible < list.length || inView) && <LoadingDots />}
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-[24px] bg-butter p-4">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-surface text-butter-ink"><Icon name="star" size={24} /></span>
              <div>
                <p className="font-bold">{t("born", { name: baby.name })}</p>
                <p className="text-sm text-ink/60">{new Date(baby.birthDate + "T12:00:00").toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })}</p>
              </div>
            </div>
          )}
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
