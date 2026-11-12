"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { collection, doc, getDocs, onSnapshot, query, setDoc, updateDoc, where, writeBatch, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useApp } from "@/providers/Providers";
import { BabyAvatar, Chip, Sheet } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { RevealText, WipeIn } from "@/components/motion";
import { LangToggle } from "@/components/LangToggle";
import { Stepper } from "@/components/forms";
import { TakePhotoButton } from "@/components/CameraSheet";
import { DateField, TimeField } from "@/components/DatePicker";
import { api } from "@/lib/data";
import { uploadPhoto } from "@/lib/media";
import { nextWrappedAt, wrappedKey } from "@/lib/wrapped";
import { currentTheme, setTheme } from "@/lib/locale";
import { enablePush, pushState, type PushState } from "@/lib/push";
import { ACCENTS, type Baby, type FeedingType, type Reminder } from "@/lib/types";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <WipeIn>
      <section className="card space-y-4 p-5">
        <h2 className="text-lg font-extrabold">{title}</h2>
        {children}
      </section>
    </WipeIn>
  );
}
const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="font-semibold">{label}</span>
    {children}
  </div>
);
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button role="switch" aria-checked={on} onClick={() => onChange(!on)} className={`relative h-8 w-14 rounded-full transition-colors duration-300 ${on ? "bg-ink" : "bg-line"}`}>
      <span className="absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all duration-300" style={{ left: on ? 28 : 4 }} />
    </button>
  );
}

export default function ProfilePage() {
  const t = useTranslations("profile");
  const tc = useTranslations("common");
  const tOn = useTranslations("onboarding");
  const locale = useLocale();
  const { user, userDoc, babies, baby, setActiveBaby, patchUser, signOut, toast, standalone, canInstall, promptInstall } = useApp();
  const [ios, setIos] = useState(false);
  useEffect(() => setIos(/iphone|ipad|ipod/i.test(navigator.userAgent)), []);
  const [theme, setThemeState] = useState<"light" | "dark" | "auto">("auto");
  const [push, setPush] = useState<PushState>("unsupported");
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [edit, setEdit] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [invite, setInvite] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setThemeState(currentTheme()); pushState().then(setPush); }, []);
  const uid = user?.uid;
  const babyId = baby?.id;
  useEffect(() => {
    if (!uid || !babyId) return;
    return onSnapshot(query(collection(db, "reminders"), where("ownerUid", "==", uid), where("babyId", "==", babyId)), (s) =>
      setReminders(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Reminder, "id">) }))),
      (e) => console.warn(`[tots] Firestore listener "reminders" failed: ${e.code}`),
    );
  }, [uid, babyId]);

  if (!baby || !userDoc || !uid) return null;
  const units = userDoc.units;
  const isOwner = baby.ownerUid === uid;
  const feedRem = reminders.find((r) => r.type === "feed");
  const dailyRem = reminders.find((r) => r.type === "daily");

  const saveRem = (type: "feed" | "daily", patch: Partial<Reminder>) => {
    const id = `${uid}_${baby.id}_${type}`;
    const base: Partial<Reminder> = type === "feed" ? { intervalHours: 3 } : { time: "09:00", label: t("dailyLabel") };
    void setDoc(doc(db, "reminders", id), { ownerUid: uid, babyId: baby.id, type, enabled: true, ...base, ...(reminders.find((r) => r.id === id) ?? {}), ...patch, id: undefined }, { merge: true });
  };

  const turnOnPush = async () => {
    try {
      const ok = await enablePush(locale);
      setPush(await pushState());
      if (!ok) toast(t("remindersBlocked"));
    } catch {
      toast(tc("error"));
    }
  };
  const testPush = async () => {
    try { await api("/api/push/test", {}); } catch { toast(tc("error")); }
  };

  const createInvite = async () => {
    try {
      const { token } = await api<{ token: string }>("/api/invites", { babyId: baby.id });
      const link = `${location.origin}/join/${token}`;
      setInvite(link);
      if (navigator.share) navigator.share({ url: link, title: "Tots & Timelines" }).catch(() => {});
    } catch { toast(tc("error")); }
  };

  const exportData = async () => {
    const snap = await getDocs(collection(db, "babies", baby.id, "events"));
    const blob = new Blob([JSON.stringify({ baby, events: snap.docs.map((d) => ({ id: d.id, ...d.data() })) }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${baby.name}-export.json`;
    a.click();
  };

  const deleteBaby = async () => {
    setBusy(true);
    try {
      const snap = await getDocs(collection(db, "babies", baby.id, "events"));
      for (let i = 0; i < snap.docs.length; i += 400) {
        const b = writeBatch(db);
        snap.docs.slice(i, i + 400).forEach((d) => b.delete(d.ref));
        await b.commit();
      }
      await deleteDoc(doc(db, "babies", baby.id));
      setConfirmDel(false);
    } catch { toast(tc("error")); }
    setBusy(false);
  };

  return (
    <div className="space-y-5 pt-2">
      <h1 className="text-3xl font-extrabold"><RevealText text={t("title")} /></h1>

      <Section title={t("wrappedTitle")}>
        {(baby.wrappedAvailable ?? []).length ? (
          <div className="space-y-2">
            {[...(baby.wrappedAvailable ?? [])].sort((a, b) => b - a).map((n) => {
              const unseen = !userDoc.wrappedSeen?.[wrappedKey(baby.id, n)];
              return (
                <Link key={n} href={`/wrapped/${n}`} className="flex items-center gap-3 rounded-[22px] bg-butter p-3 pr-4">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-surface text-butter-ink"><Icon name="star" size={22} /></span>
                  <span className="flex-1 font-bold">{n === 3 ? t("wrappedFirst", { n }) : t("wrappedRange", { from: n - 2, to: n })}</span>
                  {unseen && <span className="on-ink rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider">New</span>}
                  <Icon name="chevR" size={18} />
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="text-sm font-medium text-soft">{t("wrappedEmpty", { name: baby.name })}</p>
        )}
      </Section>

      <Section title={t("install")}>
        {standalone ? (
          <p className="flex items-center gap-2 rounded-[18px] bg-mint p-3 px-4 text-sm font-bold text-mint-ink"><Icon name="check" size={18} />{t("installed")}</p>
        ) : canInstall ? (
          <>
            <p className="text-sm text-soft">{t("installHint")}</p>
            <button className="pill-btn w-full" onClick={() => void promptInstall()}><Icon name="download" size={20} />{t("installBtn")}</button>
          </>
        ) : (
          <p className="text-sm font-medium text-soft">{ios ? t("installIos") : t("installAndroid")}</p>
        )}
      </Section>

      <Section title={t("babies")}>
        <div className="space-y-2">
          {babies!.map((b) => (
            <button key={b.id} onClick={() => setActiveBaby(b.id)} className={`flex w-full items-center gap-3 rounded-[22px] p-2 pr-4 text-left transition-colors ${b.id === baby.id ? "bg-accent" : "bg-surface2"}`}>
              <BabyAvatar photoKey={b.photoKey} color={b.color} size={48} />
              <span className="flex-1 font-bold">{b.name}</span>
              {b.id === baby.id && <Icon name="check" size={20} />}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button className="ghost-btn flex-1" onClick={() => setEdit(true)}><Icon name="edit" size={18} />{t("editBaby")}</button>
          <Link href="/onboarding/baby" className="ghost-btn flex-1"><Icon name="plus" size={18} />{t("addBaby")}</Link>
        </div>
      </Section>

      <Section title={t("family")}>
        <div className="space-y-2">
          {Object.entries(baby.members ?? {}).map(([id, m]) => (
            <div key={id} className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-lavender text-lavender-ink"><Icon name="user" size={20} /></span>
              <span className="flex-1 font-semibold">{m.name}{id === uid ? ` (${t("you")})` : ""}</span>
              {id === baby.ownerUid && <span className="rounded-full bg-butter px-3 py-1 text-xs font-bold text-butter-ink">{t("owner")}</span>}
            </div>
          ))}
        </div>
        {isOwner && (
          <>
            <button className="pill-btn w-full" onClick={createInvite}><Icon name="link" size={20} />{t("invite")}</button>
            {invite && (
              <div className="rounded-[20px] bg-surface2 p-4">
                <p className="mb-2 text-sm text-soft">{t("inviteHint")}</p>
                <p className="break-all text-sm font-bold">{invite}</p>
                <button className="ghost-btn mt-3 w-full" onClick={() => navigator.clipboard.writeText(invite).then(() => toast(tc("copied")))}><Icon name="copy" size={18} />{tc("copy")}</button>
              </div>
            )}
          </>
        )}
      </Section>

      <Section title={t("reminders")}>
        {push === "ios-install" && <p className="rounded-[18px] bg-peach p-4 text-sm font-semibold">{t("remindersIos")}</p>}
        {push === "unsupported" && <p className="text-sm text-soft">{t("remindersUnsupported")}</p>}
        {push === "blocked" && <p className="text-sm font-semibold text-blush-ink">{t("remindersBlocked")}</p>}
        {push === "ready" && <button className="pill-btn w-full" onClick={turnOnPush}><Icon name="bell" size={20} />{t("remindersOn")}</button>}
        {push === "enabled" && (
          <>
            <div className="flex items-center justify-between rounded-[18px] bg-mint p-3 px-4 text-sm font-bold text-mint-ink">
              <span className="flex items-center gap-2"><Icon name="check" size={18} />{t("enabled")}</span>
              <button className="underline" onClick={testPush}>{t("testPush")}</button>
            </div>
            <Row label={t("feedReminder")}><Toggle on={!!feedRem?.enabled} onChange={(v) => saveRem("feed", { enabled: v })} /></Row>
            {feedRem?.enabled && (
              <div>
                <p className="mb-2 text-sm text-soft">{t("feedReminderHint", { h: feedRem.intervalHours ?? 3 })}</p>
                <Stepper value={feedRem.intervalHours ?? 3} min={1} max={8} step={0.5} onChange={(v) => saveRem("feed", { intervalHours: v })} format={(v) => `${v} h`} />
              </div>
            )}
            <Row label={t("dailyReminder")}><Toggle on={!!dailyRem?.enabled} onChange={(v) => saveRem("daily", { enabled: v })} /></Row>
            {dailyRem?.enabled && (
              <div className="flex items-center gap-2">
                <input className="field !py-3 !text-base" value={dailyRem.label ?? ""} onChange={(e) => saveRem("daily", { label: e.target.value })} />
                <span className="text-sm font-semibold text-soft">{t("dailyAt")}</span>
                <div className="w-36 shrink-0"><TimeField value={dailyRem.time ?? "09:00"} onChange={(v) => saveRem("daily", { time: v })} /></div>
              </div>
            )}
            <Row label={t("quiet")}>
              <Toggle on={!!userDoc.quiet?.enabled} onChange={(v) => patchUser({ quiet: { enabled: v, start: "22:00", end: "07:00" } })} />
            </Row>
          </>
        )}
      </Section>

      <Section title={t("you")}>
        <Row label={t("language")}><LangToggle onChange={(l) => void patchUser({ locale: l })} /></Row>
        <Row label={t("units")}>
          <div className="flex gap-2">
            <Chip active={units === "metric"} onClick={() => patchUser({ units: "metric" })}>{t("metric")}</Chip>
            <Chip active={units === "imperial"} onClick={() => patchUser({ units: "imperial" })}>{t("imperial")}</Chip>
          </div>
        </Row>
        <Row label={t("theme")}>
          <div className="flex gap-2">
            {(["light", "dark", "auto"] as const).map((x) => (
              <Chip key={x} active={theme === x} onClick={() => { setTheme(x); setThemeState(x); }}>{t(x)}</Chip>
            ))}
          </div>
        </Row>
        <button className="ghost-btn w-full" onClick={exportData}><Icon name="download" size={18} />{t("export")}</button>
        <button className="ghost-btn w-full" onClick={() => signOut()}><Icon name="logout" size={18} />{t("signOut")}</button>
        {isOwner && <button className="w-full py-2 text-sm font-bold text-blush-ink" onClick={() => setConfirmDel(true)}>{t("deleteBaby")}</button>}
      </Section>

      <p className="px-2 pb-4 text-center text-xs leading-relaxed text-soft">{t("disclaimer")}</p>

      <EditBaby open={edit} onClose={() => setEdit(false)} baby={baby} />

      <Sheet open={confirmDel} onClose={() => setConfirmDel(false)}>
        <div className="space-y-4 text-center">
          <p className="font-bold">{t("deleteConfirm", { name: baby.name })}</p>
          <div className="flex gap-3">
            <button className="ghost-btn flex-1" onClick={() => setConfirmDel(false)}>{tc("cancel")}</button>
            <button className="pill-btn flex-1" disabled={busy} onClick={deleteBaby}>{tc("delete")}</button>
          </div>
        </div>
      </Sheet>
      <span className="hidden">{tOn("units.kg")}</span>
    </div>
  );
}

function EditBaby({ open, onClose, baby }: { open: boolean; onClose: () => void; baby: Baby }) {
  const t = useTranslations("profile");
  const tc = useTranslations("common");
  const to = useTranslations("onboarding");
  const { toast } = useApp();
  const [name, setName] = useState(baby.name);
  const [feeding, setFeeding] = useState<FeedingType>(baby.feedingType);
  const [birth, setBirth] = useState(baby.birthDate);
  const [color, setColor] = useState(baby.color);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setName(baby.name); setFeeding(baby.feedingType); setBirth(baby.birthDate); setColor(baby.color); setFile(null); } }, [open, baby]);

  const save = async () => {
    setBusy(true);
    try {
      const patch: Partial<Baby> = { name: name.trim() || baby.name, feedingType: feeding, birthDate: birth, color };
      if (birth !== baby.birthDate) patch.nextWrappedAt = nextWrappedAt(birth, baby.wrappedCheckedN ?? 0);
      if (file) patch.photoKey = await uploadPhoto(file, baby.id);
      await updateDoc(doc(db, "babies", baby.id), patch);
      toast(t("saved"));
      onClose();
    } catch { toast(tc("error")); }
    setBusy(false);
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <BabyAvatar photoKey={baby.photoKey} color={color} size={72} />
          <div className="flex flex-col gap-2">
            <TakePhotoButton className="ghost-btn !h-11" onCapture={setFile} />
            <label className="ghost-btn cursor-pointer !h-11"><Icon name="image" size={18} />{file ? file.name.slice(0, 14) : t("photo")}<input type="file" accept="image/*" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
          </div>
        </div>
        <input className="field !py-3 !text-base" value={name} onChange={(e) => setName(e.target.value)} aria-label={t("name")} />
        <DateField value={birth} max={new Date().toISOString().slice(0, 10)} onChange={setBirth} />
        <div className="flex flex-wrap gap-2">
          {(["breast", "bottle", "both", "solids"] as FeedingType[]).map((f) => <Chip key={f} active={feeding === f} onClick={() => setFeeding(f)}>{to(`feeding.${f}`)}</Chip>)}
        </div>
        <div className="flex gap-3">
          {ACCENTS.map((c) => (
            <button key={c} aria-label={c} onClick={() => setColor(c)} className={`grid h-10 w-10 place-items-center rounded-full bg-${c} text-${c}-ink ${color === c ? "ring-4 ring-ink" : ""}`}>{color === c && <Icon name="check" size={16} strokeWidth={3} />}</button>
          ))}
        </div>
        <button className="pill-btn w-full" disabled={busy} onClick={save}>{tc("save")}</button>
      </div>
    </Sheet>
  );
}
