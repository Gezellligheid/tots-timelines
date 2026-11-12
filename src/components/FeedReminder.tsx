"use client";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useApp } from "@/providers/Providers";
import { Chip, Sheet } from "./ui";
import { Stepper } from "./forms";
import { Icon } from "./Icon";
import { clock } from "@/lib/format";
import { enablePush, pushState } from "@/lib/push";
import { MIN, isRunning } from "@/lib/stats";

const QUICK = [2, 2.5, 3, 3.5, 4];

/** Pick how long after a feed to be reminded. Used for the first-feed prompt and for editing from Home. */
function ReminderSheet({ open, onClose, origin }: { open: boolean; onClose: () => void; origin?: { x: number; y: number } | null }) {
  const t = useTranslations("feedReminder");
  const tc = useTranslations("common");
  const tp = useTranslations("profile");
  const locale = useLocale();
  const { user, baby, feedReminder, patchUser, toast } = useApp();
  const [h, setH] = useState(3);
  const [ios, setIos] = useState(false);
  const [busy, setBusy] = useState(false);
  const editing = !!feedReminder?.enabled;

  useEffect(() => {
    if (!open) return;
    setH(feedReminder?.intervalHours ?? 3);
    pushState().then((s) => setIos(s === "ios-install"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!user || !baby) return null;

  const write = (enabled: boolean) => {
    void setDoc(doc(db, "reminders", `${user.uid}_${baby.id}_feed`), { ownerUid: user.uid, babyId: baby.id, type: "feed", enabled, intervalHours: h }, { merge: true });
    void patchUser({ feedReminderAsked: true });
  };

  const save = async () => {
    setBusy(true);
    // Ask for notification permission straight from the tap (iOS needs a user gesture)
    const push = !ios && "Notification" in window && Notification.permission !== "denied" ? enablePush(locale).catch(() => false) : Promise.resolve(true);
    write(true);
    const ok = await push;
    toast(ok ? t("saved") : tp("remindersBlocked"));
    setBusy(false);
    onClose();
  };
  const turnOff = () => {
    write(false);
    toast(t("off"));
    onClose();
  };
  const decline = () => {
    void patchUser({ feedReminderAsked: true });
    onClose();
  };

  const next = baby.lastFeedAt ? baby.lastFeedAt + h * 3600000 : 0;

  return (
    <Sheet open={open} onClose={editing ? onClose : decline} origin={origin} title={t("title")}>
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-butter text-butter-ink"><Icon name="bell" size={26} /></span>
          <h2 className="text-2xl font-extrabold leading-tight">{t("title")}</h2>
        </div>
        <p className="text-sm font-medium leading-relaxed text-soft">{t("body")}</p>

        <div className="flex flex-wrap gap-2">
          {QUICK.map((q) => (
            <Chip key={q} active={h === q} onClick={() => setH(q)}>{t("hours", { h: q })}</Chip>
          ))}
        </div>
        <Stepper value={h} min={1} max={8} step={0.5} onChange={setH} format={(v) => `${t("every")} ${t("hours", { h: v })}`} />
        {next > Date.now() && <p className="text-center text-sm font-bold text-soft">{t("nextAt", { time: clock(next, locale) })}</p>}
        {ios && <p className="rounded-[18px] bg-peach p-3 text-sm font-semibold">{t("iosNote")}</p>}

        <div className="space-y-2">
          <button className="pill-btn w-full" disabled={busy} onClick={save}>{editing ? t("update") : t("save")}</button>
          {editing ? (
            <button className="h-11 w-full text-sm font-bold text-blush-ink" onClick={turnOff}>{t("turnOff")}</button>
          ) : (
            <button className="h-11 w-full text-[15px] font-bold text-soft" onClick={decline}>{t("no")}</button>
          )}
        </div>
      </div>
    </Sheet>
  );
}

/** After the user's first logged feed, ask once when the next-feed reminder should fire. */
export function FeedReminderPrompt() {
  const { user, userDoc, baby, events, feedReminder } = useApp();
  const [open, setOpen] = useState(false);
  const shown = useRef(false);

  useEffect(() => {
    if (shown.current || !user || !baby || userDoc === undefined || userDoc?.feedReminderAsked || feedReminder !== null) return;
    const recent = events.find(
      (e) => e.type === "feed" && e.data.method !== "pump" && e.createdBy === user.uid && !isRunning(e) && (e.end ?? e.start) > Date.now() - 15 * MIN,
    );
    if (!recent) return;
    const id = setTimeout(() => {
      shown.current = true;
      setOpen(true);
    }, 1400); // let the log sheet finish closing first
    return () => clearTimeout(id);
  }, [user, userDoc, baby, events, feedReminder]);

  return <ReminderSheet open={open} onClose={() => setOpen(false)} />;
}

/** Small pill on Home: shows the current interval and opens the same sheet to change it. */
export function FeedReminderPill() {
  const t = useTranslations("feedReminder");
  const { feedReminder } = useApp();
  const [open, setOpen] = useState(false);
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  if (feedReminder === undefined) return null;
  const on = !!feedReminder?.enabled;
  return (
    <>
      <button
        type="button"
        className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-surface/70 px-3 py-1.5 text-xs font-bold"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setOrigin({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
          setOpen(true);
        }}
      >
        <Icon name="bell" size={14} />
        {on ? t("pill", { h: feedReminder?.intervalHours ?? 3 }) : t("pillOff")}
      </button>
      <ReminderSheet open={open} onClose={() => setOpen(false)} origin={origin} />
    </>
  );
}
