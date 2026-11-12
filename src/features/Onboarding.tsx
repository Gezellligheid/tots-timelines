"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { collection, doc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useApp } from "@/providers/Providers";
import { Icon, type IconName } from "@/components/Icon";
import { EASE, RevealText } from "@/components/motion";
import { BackButton, Chip } from "@/components/ui";
import { ChoiceCard, LengthInput, Stepper, WeightInput } from "@/components/forms";
import { LangToggle } from "@/components/LangToggle";
import { DateField } from "@/components/DatePicker";
import { TakePhotoButton } from "@/components/CameraSheet";
import { uploadPhoto } from "@/lib/media";
import { defaultUnits } from "@/lib/units";
import { ACCENTS, type AccentName, type Baby, type FeedingType, type Role, type Sex, type Units, type UserDoc } from "@/lib/types";

export type Mode = "full" | "parent" | "baby";
type StepId = "name" | "role" | "coparent" | "babyName" | "sex" | "birth" | "term" | "weight" | "length" | "head" | "feeding" | "color" | "photo" | "prefs" | "finish";

const STEPS: { id: StepId; modes: Mode[] }[] = [
  { id: "name", modes: ["full", "parent"] },
  { id: "role", modes: ["full", "parent"] },
  { id: "coparent", modes: ["full"] },
  { id: "babyName", modes: ["full", "baby"] },
  { id: "sex", modes: ["full", "baby"] },
  { id: "birth", modes: ["full", "baby"] },
  { id: "term", modes: ["full", "baby"] },
  { id: "weight", modes: ["full", "baby"] },
  { id: "length", modes: ["full", "baby"] },
  { id: "head", modes: ["full", "baby"] },
  { id: "feeding", modes: ["full", "baby"] },
  { id: "color", modes: ["full", "baby"] },
  { id: "photo", modes: ["full", "baby"] },
  { id: "prefs", modes: ["full", "parent"] },
  { id: "finish", modes: ["full", "parent", "baby"] },
];

interface Draft {
  name: string; role?: Role; coParent: string;
  babyName: string; sex?: Sex; birthDate: string; term?: "early" | "onTime" | "late"; weeks: number;
  weightG?: number; lengthCm?: number; headCm?: number; feeding?: FeedingType; color: AccentName;
  units: Units;
}
const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export function Onboarding({ mode }: { mode: Mode }) {
  const t = useTranslations("onboarding");
  const tc = useTranslations("common");
  const locale = useLocale() as "en" | "nl";
  const router = useRouter();
  const { authReady, user, userDoc, patchUser } = useApp();
  const key = `tt-draft-${mode}`;

  const [draft, setDraft] = useState<Draft>({ name: "", coParent: "", babyName: "", birthDate: today(), weeks: 34, color: "lavender", units: "metric" });
  const [loaded, setLoaded] = useState(false);
  const [idx, setIdx] = useState(0);
  const [origin, setOrigin] = useState("50% 100%");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState<"idle" | "saving" | "done" | "error">("idle");
  const saveStarted = useRef(false);

  const steps = useMemo(() => STEPS.filter((s) => s.modes.includes(mode)), [mode]);
  const step = steps[idx];
  const isFinish = step.id === "finish";

  // Load draft (resumable) + sensible defaults once
  useEffect(() => {
    let saved: Partial<Draft> = {};
    try {
      saved = JSON.parse(localStorage.getItem(key) ?? "{}");
    } catch {}
    setDraft((d) => ({ ...d, units: defaultUnits(), ...saved }));
    setLoaded(true);
  }, [key]);
  useEffect(() => {
    if (!loaded) return;
    setDraft((d) => (d.name || !user?.displayName || mode === "baby" ? d : { ...d, name: user.displayName!.split(" ")[0] }));
  }, [loaded, user, mode]);
  useEffect(() => {
    if (loaded) try { localStorage.setItem(key, JSON.stringify(draft)); } catch {}
  }, [draft, loaded, key]);

  useEffect(() => {
    if (authReady && !user) router.replace("/");
    if (authReady && user && userDoc?.onboardingComplete && mode !== "baby" && saving === "idle") router.replace("/home");
  }, [authReady, user, userDoc, mode, router, saving]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const babyName = draft.babyName || "…";

  const canContinue = (() => {
    switch (step.id) {
      case "name": return draft.name.trim().length > 0;
      case "role": return !!draft.role;
      case "babyName": return draft.babyName.trim().length > 0;
      case "sex": return !!draft.sex;
      case "birth": return !!draft.birthDate && draft.birthDate <= today();
      case "term": return !!draft.term;
      case "feeding": return !!draft.feeding;
      default: return true;
    }
  })();
  const optional = ["coparent", "weight", "length", "head", "color", "photo"].includes(step.id);

  const next = (e?: React.MouseEvent) => {
    if (e) {
      const r = e.currentTarget.getBoundingClientRect();
      setOrigin(`${((r.left + r.width / 2) / window.innerWidth) * 100}% ${((r.top + r.height / 2) / window.innerHeight) * 100}%`);
    } else setOrigin("50% 100%");
    setIdx((i) => Math.min(i + 1, steps.length - 1));
  };
  const back = () => {
    if (idx === 0) return mode === "baby" ? router.replace("/profile") : undefined;
    setOrigin("6% 6%");
    setIdx((i) => i - 1);
  };

  const finish = async () => {
    if (saveStarted.current || !user) return;
    saveStarted.current = true;
    setSaving("saving");
    try {
      const uid = user.uid;
      const name = draft.name.trim() || userDoc?.displayName || user.displayName || "";
      let babyId: string | undefined;
      if (mode !== "parent") {
        const ref = doc(collection(db, "babies"));
        babyId = ref.id;
        const baby: Omit<Baby, "id"> = {
          name: draft.babyName.trim(),
          sex: draft.sex ?? "none",
          birthDate: draft.birthDate,
          ...(draft.term === "early" ? { gestationWeeks: draft.weeks } : {}),
          ...(draft.weightG ? { birthWeightG: draft.weightG } : {}),
          ...(draft.lengthCm ? { birthLengthCm: draft.lengthCm } : {}),
          ...(draft.headCm ? { birthHeadCm: draft.headCm } : {}),
          feedingType: draft.feeding ?? "both",
          color: draft.color,
          ownerUid: uid,
          memberUids: [uid],
          members: { [uid]: { name: name || "Parent", ...((draft.role ?? userDoc?.role) ? { role: (draft.role ?? userDoc?.role) as Role } : {}) } },
        };
        await setDoc(ref, baby);
        if (photo) {
          try {
            const photoKey = await uploadPhoto(photo, ref.id);
            await updateDoc(ref, { photoKey });
          } catch {
            /* photo is optional, can be re-added in Profile */
          }
        }
      }
      const patch: Partial<UserDoc> = mode === "baby" ? { activeBabyId: babyId } : {
        displayName: name,
        email: user.email ?? undefined,
        photoURL: user.photoURL ?? undefined,
        role: draft.role,
        ...(draft.coParent.trim() ? { coParentName: draft.coParent.trim() } : {}),
        units: draft.units,
        locale,
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        onboardingComplete: true,
        createdAt: Date.now(),
        ...(babyId ? { activeBabyId: babyId } : {}),
      };
      await patchUser(patch);
      try { localStorage.removeItem(key); } catch {}
      setSaving("done");
    } catch {
      saveStarted.current = false;
      setSaving("error");
    }
  };
  useEffect(() => {
    if (isFinish && saving === "idle") void finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFinish]);

  const leave = () => {
    let pending: string | null = null;
    try { pending = sessionStorage.getItem("pendingInvite"); } catch {}
    router.replace(mode === "parent" && pending ? `/join/${pending}` : mode === "baby" ? "/home" : "/home");
  };

  const pickPhoto = (f?: File | null) => {
    if (!f) return;
    setPhoto(f);
    setPhotoPreview(URL.createObjectURL(f));
  };

  const body = (() => {
    switch (step.id) {
      case "name":
        return <input autoFocus className="field" placeholder={t("name.ph")} value={draft.name} onChange={(e) => set("name", e.target.value)} onKeyDown={(e) => e.key === "Enter" && canContinue && next()} />;
      case "role":
        return (
          <div className="grid grid-cols-2 gap-3">
            {([["mom", "blush", "heart"], ["dad", "sky", "heart"], ["parent", "lavender", "heart"], ["guardian", "mint", "heart"], ["other", "butter", "star"]] as [Role, AccentName, IconName][]).map(([r, tone, icon]) => (
              <ChoiceCard key={r} compact selected={draft.role === r} onSelect={() => set("role", r)} tone={tone} icon={icon} label={t(`role.${r}`)} />
            ))}
          </div>
        );
      case "coparent":
        return <input autoFocus className="field" placeholder={t("coparent.ph")} value={draft.coParent} onChange={(e) => set("coParent", e.target.value)} onKeyDown={(e) => e.key === "Enter" && next()} />;
      case "babyName":
        return <input autoFocus className="field" placeholder={t("babyName.ph")} value={draft.babyName} onChange={(e) => set("babyName", e.target.value)} onKeyDown={(e) => e.key === "Enter" && canContinue && next()} />;
      case "sex":
        return (
          <div className="grid gap-3">
            <ChoiceCard selected={draft.sex === "boy"} onSelect={() => set("sex", "boy")} tone="sky" icon="baby" label={t("sex.boy")} />
            <ChoiceCard selected={draft.sex === "girl"} onSelect={() => set("sex", "girl")} tone="blush" icon="baby" label={t("sex.girl")} />
            <ChoiceCard selected={draft.sex === "none"} onSelect={() => set("sex", "none")} tone="mint" icon="star" label={t("sex.none")} />
          </div>
        );
      case "birth":
        return <DateField value={draft.birthDate} max={today()} onChange={(v) => set("birthDate", v)} />;
      case "term":
        return (
          <div className="grid gap-3">
            <ChoiceCard selected={draft.term === "early"} onSelect={() => set("term", "early")} tone="peach" icon="sprout" label={t("term.early")} />
            <AnimatePresence initial={false}>
              {draft.term === "early" && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <p className="mb-2 px-2 text-sm font-semibold text-soft">{t("term.weeks")}</p>
                  <Stepper value={draft.weeks} min={22} max={36} onChange={(v) => set("weeks", v)} format={(v) => `${v}`} />
                  <p className="mt-2 px-2 text-xs text-soft">{t("term.weeksHint")}</p>
                </motion.div>
              )}
            </AnimatePresence>
            <ChoiceCard selected={draft.term === "onTime"} onSelect={() => set("term", "onTime")} tone="mint" icon="check" label={t("term.onTime")} />
            <ChoiceCard selected={draft.term === "late"} onSelect={() => set("term", "late")} tone="lavender" icon="timeline" label={t("term.late")} />
          </div>
        );
      case "weight":
        return <WeightInput units={draft.units} valueG={draft.weightG} onChange={(g) => set("weightG", g)} />;
      case "length":
        return <LengthInput units={draft.units} valueCm={draft.lengthCm} kind="length" onChange={(v) => set("lengthCm", v)} />;
      case "head":
        return <LengthInput units={draft.units} valueCm={draft.headCm} kind="head" onChange={(v) => set("headCm", v)} />;
      case "feeding":
        return (
          <div className="grid grid-cols-2 gap-3">
            <ChoiceCard compact selected={draft.feeding === "breast"} onSelect={() => set("feeding", "breast")} tone="blush" icon="heart" label={t("feeding.breast")} />
            <ChoiceCard compact selected={draft.feeding === "bottle"} onSelect={() => set("feeding", "bottle")} tone="butter" icon="bottle" label={t("feeding.bottle")} />
            <ChoiceCard compact selected={draft.feeding === "both"} onSelect={() => set("feeding", "both")} tone="lavender" icon="swap" label={t("feeding.both")} />
            <ChoiceCard compact selected={draft.feeding === "solids"} onSelect={() => set("feeding", "solids")} tone="mint" icon="spoon" label={t("feeding.solids")} />
          </div>
        );
      case "color":
        return (
          <div className="flex flex-col items-center gap-8">
            <motion.div key={draft.color} initial={{ clipPath: "circle(0% at 50% 50%)" }} animate={{ clipPath: "circle(100% at 50% 50%)" }} transition={{ duration: 0.6, ease: EASE }} className={`grid h-32 w-32 place-items-center rounded-full bg-${draft.color} text-${draft.color}-ink`}>
              <Icon name="baby" size={72} />
            </motion.div>
            <div className="flex flex-wrap justify-center gap-4">
              {ACCENTS.map((c) => (
                <button key={c} aria-label={c} onClick={() => set("color", c)} className={`grid h-14 w-14 place-items-center rounded-full bg-${c} text-${c}-ink transition-transform ${draft.color === c ? "scale-110 ring-4 ring-ink" : ""}`}>
                  {draft.color === c && <Icon name="check" size={22} strokeWidth={3} />}
                </button>
              ))}
            </div>
          </div>
        );
      case "photo":
        return (
          <div className="flex flex-col items-center gap-6">
            <motion.div key={photoPreview ?? "none"} initial={{ clipPath: "circle(0% at 50% 50%)" }} animate={{ clipPath: "circle(100% at 50% 50%)" }} transition={{ duration: 0.8, ease: EASE }} className={`grid h-44 w-44 place-items-center overflow-hidden rounded-full bg-${draft.color} text-${draft.color}-ink`}>
              {photoPreview ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={photoPreview} alt="" className="h-full w-full object-cover" /> : <Icon name="camera" size={64} />}
            </motion.div>
            <div className="flex flex-wrap justify-center gap-3">
              <TakePhotoButton onCapture={pickPhoto} />
              <label className="ghost-btn cursor-pointer">
                <Icon name="image" size={20} />
                {photo ? t("photo.change") : t("photo.add")}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => pickPhoto(e.target.files?.[0])} />
              </label>
            </div>
          </div>
        );
      case "prefs":
        return (
          <div className="space-y-6">
            <div>
              <p className="mb-2 px-1 text-sm font-bold text-soft">{t("prefs.language")}</p>
              <LangToggle />
            </div>
            <div>
              <p className="mb-2 px-1 text-sm font-bold text-soft">{t("prefs.units")}</p>
              <div className="flex flex-wrap gap-2">
                <Chip active={draft.units === "metric"} onClick={() => set("units", "metric")}>{t("prefs.metric")}</Chip>
                <Chip active={draft.units === "imperial"} onClick={() => set("units", "imperial")}>{t("prefs.imperial")}</Chip>
              </div>
            </div>
            <div className="card flex gap-3 p-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-peach text-peach-ink"><Icon name="bell" size={22} /></span>
              <div>
                <p className="font-bold">{t("prefs.reminders")}</p>
                <p className="text-sm text-soft">{t("prefs.remindersHint")}</p>
              </div>
            </div>
          </div>
        );
      case "finish":
        return (
          <div className="relative flex flex-col items-center pt-6 text-center">
            {saving === "done" && <Confetti />}
            <motion.div initial={{ clipPath: "circle(0% at 50% 50%)" }} animate={{ clipPath: "circle(100% at 50% 50%)" }} transition={{ duration: 1.1, ease: EASE }} className={`grid h-48 w-48 place-items-center overflow-hidden rounded-full bg-${draft.color} text-${draft.color}-ink`}>
              {photoPreview ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={photoPreview} alt="" className="h-full w-full object-cover" /> : <Icon name="baby" size={104} />}
            </motion.div>
            <p className="mt-8 text-lg font-semibold text-soft">{saving === "error" ? t("finish.error") : saving === "done" ? t("finish.sub") : t("finish.saving")}</p>
            {saving === "error" && <button className="ghost-btn mt-4" onClick={() => void finish()}>{tc("continue")}</button>}
          </div>
        );
    }
  })();

  const title = isFinish
    ? mode === "parent" ? `${t("coparentJoin.welcome")}, ${draft.name || userDoc?.displayName || ""}!` : t("finish.title", { name: babyName })
    : t(`${step.id}.q`, { name: babyName });
  const hint = isFinish ? null : t.has(`${step.id}.hint`) ? t(`${step.id}.hint`) : null;
  const pct = ((idx + 1) / steps.length) * 100;

  return (
    <div className="relative mx-auto min-h-dvh w-full max-w-[520px] overflow-hidden">
      {/* persistent header: back + liquid progress */}
      <header className="absolute inset-x-0 top-0 z-30 flex items-center gap-4 px-5 safe-t">
        <div className="h-11 w-11">{(idx > 0 || mode === "baby") && !(isFinish && saving === "saving") && <BackButton onClick={back} />}</div>
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={Math.round(pct)}>
          <motion.div className="h-full rounded-full bg-ink" animate={{ width: `${pct}%` }} transition={{ duration: 0.9, ease: EASE }} />
        </div>
        <span className="w-12 text-right text-xs font-bold text-soft">{idx + 1}/{steps.length}</span>
      </header>

      <AnimatePresence initial={false}>
        <motion.section
          key={step.id}
          className="absolute inset-0 flex flex-col overflow-y-auto bg-bg px-6 pb-4 pt-24"
          style={{ zIndex: idx + 1 }}
          initial={{ clipPath: `circle(0% at ${origin})` }}
          animate={{ clipPath: `circle(150% at ${origin})` }}
          exit={{ opacity: 1, transition: { duration: 0.9 } }}
          transition={{ duration: 0.9, ease: EASE }}
        >
          <h1 className="text-[32px] font-extrabold leading-[1.1] tracking-tight">
            <RevealText text={title} delay={0.25} />
          </h1>
          {hint && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-3 text-[15px] text-soft">{hint}</motion.p>}
          <motion.div className="mt-8 flex-1" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.8, ease: EASE }}>
            {body}
          </motion.div>
          <div className="safe-b mt-6 space-y-2">
            {isFinish ? (
              <button className="pill-btn w-full" disabled={saving !== "done"} onClick={leave}>{t("finish.cta")}</button>
            ) : (
              <>
                <button className="pill-btn w-full" disabled={!canContinue} onClick={next}>{tc("continue")}</button>
                {optional && <button className="h-11 w-full text-[15px] font-semibold text-soft" onClick={() => next()}>{tc("skipForNow")}</button>}
              </>
            )}
          </div>
        </motion.section>
      </AnimatePresence>
    </div>
  );
}

function Confetti() {
  const bits = useMemo(
    () => Array.from({ length: 22 }, (_, i) => ({ a: (i / 22) * Math.PI * 2, r: 140 + Math.random() * 120, c: ACCENTS[i % 6], s: 10 + Math.random() * 14, round: i % 3 !== 0 })),
    [],
  );
  return (
    <div className="pointer-events-none absolute left-1/2 top-[110px]">
      {bits.map((b, i) => (
        <motion.span
          key={i}
          className={`absolute bg-${b.c}`}
          style={{ width: b.s, height: b.s, borderRadius: b.round ? 999 : 6, left: 0, top: 0 }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
          animate={{ x: Math.cos(b.a) * b.r, y: Math.sin(b.a) * b.r + 40, opacity: 0, scale: 1, rotate: 180 }}
          transition={{ duration: 1.6, ease: EASE, delay: 0.1 }}
        />
      ))}
    </div>
  );
}
