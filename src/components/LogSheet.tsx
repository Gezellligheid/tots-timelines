"use client";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { Sheet, Chip } from "./ui";
import { Icon } from "./Icon";
import { ChoiceCard, LengthInput, Stepper, WeightInput } from "./forms";
import { useApp } from "@/providers/Providers";
import { addEvent } from "@/lib/data";
import { uploadPhoto } from "@/lib/media";
import { MILESTONES } from "@/lib/milestones";
import { TakePhotoButton } from "./CameraSheet";
import { TYPE_META } from "@/lib/meta";
import { DateTimeField } from "./DatePicker";
import { MIN } from "@/lib/stats";
import { mlToOz } from "@/lib/units";
import { loadGrowth, ageMonths, percentileOf, sexKey, zScore, type GrowthMetric } from "@/lib/growth";
import type { EventData, EventType } from "@/lib/types";

type Method = NonNullable<EventData["method"]>;

export function LogSheet({ type, origin, onClose }: { type: EventType | null; origin: { x: number; y: number } | null; onClose: () => void }) {
  // keep last type mounted while the closing mask animation plays
  const [shown, setShown] = useState<EventType>("feed");
  useEffect(() => {
    if (type) setShown(type);
  }, [type]);
  return (
    <Sheet open={!!type} onClose={onClose} origin={origin} title={shown}>
      {type && <Body key={type} type={type} onClose={onClose} />}
    </Sheet>
  );
}

function Body({ type, onClose }: { type: EventType; onClose: () => void }) {
  const t = useTranslations("log");
  const tc = useTranslations("common");
  const tm = useTranslations("moments");
  const { baby, userDoc, toast, moments } = useApp();
  const units = userDoc?.units ?? "metric";
  const meta = TYPE_META[type];
  const [when, setWhen] = useState(() => Date.now());
  const [touched, setTouched] = useState(false);
  const [quick, setQuick] = useState<number | null>(0); // which time shortcut is selected (0 = now), null = custom time
  const [note, setNote] = useState("");

  // feed
  const methods: Method[] = useMemo(() => {
    switch (baby?.feedingType) {
      case "breast": return ["breast", "pump", "bottle"];
      case "bottle": return ["bottle"];
      case "solids": return ["solid", "bottle", "breast"];
      default: return ["breast", "bottle", "pump"];
    }
  }, [baby?.feedingType]);
  const [method, setMethod] = useState<Method>(methods[0]);
  const [side, setSide] = useState<"left" | "right" | "both">("left");
  const [ml, setMl] = useState(90);
  const [milk, setMilk] = useState<"breast" | "formula">(baby?.feedingType === "bottle" ? "formula" : "breast");
  const [food, setFood] = useState("");
  const [dur, setDur] = useState(15);

  // sleep
  const hour = new Date().getHours();
  const [kind, setKind] = useState<"nap" | "night">(hour >= 19 || hour < 6 ? "night" : "nap");
  const [sleepEnd, setSleepEnd] = useState<number | null>(null);

  // diaper
  const [dkind, setDkind] = useState<"wet" | "dirty" | "mixed" | null>(null);
  const [stool, setStool] = useState<string | undefined>();

  // growth
  const [wG, setWG] = useState<number | undefined>();
  const [lCm, setLCm] = useState<number | undefined>();
  const [hCm, setHCm] = useState<number | undefined>();
  const [pcts, setPcts] = useState<Partial<Record<GrowthMetric, number>>>({});

  // moment
  const [mmode, setMmode] = useState<"milestone" | "memory">("milestone");
  const [msKey, setMsKey] = useState<string | null>(null);
  const [mTitle, setMTitle] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const sorted = useMemo(() => {
    const done = new Set(moments.map((m) => m.data.milestone).filter(Boolean));
    const age = baby ? ageMonths(baby.birthDate, Date.now(), baby.gestationWeeks) : 0;
    return MILESTONES.filter((m) => !done.has(m.key)).sort((a, b) => Math.abs(a.month - age) - Math.abs(b.month - age));
  }, [moments, baby]);
  const suggestions = showAll ? sorted : sorted.slice(0, 6);
  const pickPhoto = (f?: File | null) => {
    if (!f) return;
    setFile(f);
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(f);
    });
  };

  useEffect(() => {
    if (type !== "growth" || !baby) return;
    let live = true;
    loadGrowth().then((tbl) => {
      if (!live) return;
      const m = ageMonths(baby.birthDate, when, baby.gestationWeeks);
      const sx = sexKey(baby.sex);
      const out: Partial<Record<GrowthMetric, number>> = {};
      if (wG) out.weight = percentileOf(zScore(tbl.weight[sx], m, wG / 1000));
      if (lCm) out.length = percentileOf(zScore(tbl.length[sx], m, lCm));
      if (hCm) out.head = percentileOf(zScore(tbl.head[sx], m, hCm));
      setPcts(out);
    });
    return () => {
      live = false;
    };
  }, [type, baby, when, wG, lCm, hCm]);

  if (!baby) return null;
  const done = () => {
    toast(t("saved"));
    onClose();
  };
  const trimNote = note.trim() || undefined;

  const saveFeed = (timer: boolean) => {
    if (method === "breast") {
      if (timer) addEvent(baby.id, { type: "feed", start: Date.now(), end: null, data: { method, side }, note: trimNote });
      else addEvent(baby.id, { type: "feed", start: when, end: when + dur * MIN, data: { method, side }, note: trimNote });
    } else if (method === "bottle") addEvent(baby.id, { type: "feed", start: when, end: when, data: { method, ml, milk }, note: trimNote });
    else if (method === "pump") addEvent(baby.id, { type: "feed", start: when, end: when, data: { method, ml, side }, note: trimNote });
    else addEvent(baby.id, { type: "feed", start: when, end: when, data: { method, food: food.trim() || undefined }, note: trimNote });
    done();
  };
  const saveSleep = (timer: boolean) => {
    if (timer) addEvent(baby.id, { type: "sleep", start: Date.now(), end: null, data: { kind } , note: trimNote });
    else addEvent(baby.id, { type: "sleep", start: when, end: sleepEnd ?? null, data: { kind }, note: trimNote });
    done();
  };
  const saveDiaper = (k: "wet" | "dirty" | "mixed") => {
    addEvent(baby.id, { type: "diaper", start: when, end: when, data: { kind: k, color: k === "wet" ? undefined : stool }, note: trimNote });
    done();
  };
  const saveGrowth = () => {
    if (!wG && !lCm && !hCm) return toast(t("needOne"));
    addEvent(baby.id, { type: "growth", start: when, end: when, data: { weightG: wG, lengthCm: lCm, headCm: hCm }, note: trimNote });
    done();
  };

  const saveMoment = async () => {
    const isMs = mmode === "milestone";
    const title = mTitle.trim();
    if (isMs ? !msKey && !title : !title && !note.trim() && !file) return toast(tm("need"));
    setBusy(true);
    try {
      const photoKey = file ? await uploadPhoto(file, baby.id) : undefined;
      addEvent(baby.id, {
        type: "moment",
        start: when,
        end: when,
        data: { kind: mmode, ...(isMs && msKey ? { milestone: msKey } : {}), ...(title ? { title } : {}) },
        note: trimNote,
        photoKey,
      });
      done();
    } catch {
      toast(tc("error"));
      setBusy(false);
    }
  };

  const mlStep = units === "imperial" ? 29.5735 / 2 : 10;
  const mlFmt = (v: number) => (units === "imperial" ? `${mlToOz(v).toFixed(1)} oz` : `${Math.round(v)} ml`);

  const timePicker = (
    <div>
      <p className="mb-2 px-1 text-sm font-bold text-soft">{t("when")}</p>
      <DateTimeField value={when} max={Date.now() + MIN} onChange={(v) => { if (v) { setWhen(v); setTouched(true); setQuick(null); } }} />
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        <Chip active={quick === 0} onClick={() => { setWhen(Date.now()); setTouched(false); setQuick(0); }}>{tc("now")}</Chip>
        {[5, 15, 30, 60].map((m) => (
          <Chip key={m} active={quick === m} onClick={() => { setWhen(Date.now() - m * MIN); setTouched(true); setQuick(m); }}>{m === 60 ? "−1h" : `−${m}m`}</Chip>
        ))}
      </div>
    </div>
  );

  const noteField = (
    <input className="field !py-3 !text-base" placeholder={t("notePh")} value={note} onChange={(e) => setNote(e.target.value)} />
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className={`grid h-12 w-12 place-items-center rounded-full bg-${meta.tone} text-${meta.tone}-ink`}>
          <Icon name={meta.icon} size={26} />
        </span>
        <h2 className="text-2xl font-extrabold">{t(type)}</h2>
      </div>

      {type === "feed" && (
        <>
          {methods.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {methods.map((m) => (
                <Chip key={m} active={method === m} onClick={() => setMethod(m)}>{t(m)}</Chip>
              ))}
            </div>
          )}
          {(method === "breast" || method === "pump") && (
            <div>
              <p className="mb-2 px-1 text-sm font-bold text-soft">{t("side")}</p>
              <div className="flex gap-2">
                {(["left", "right", "both"] as const).map((s) => (
                  <Chip key={s} active={side === s} onClick={() => setSide(s)}>{t(s)}</Chip>
                ))}
              </div>
            </div>
          )}
          {(method === "bottle" || method === "pump") && (
            <div>
              <p className="mb-2 px-1 text-sm font-bold text-soft">{t("amount")}</p>
              <Stepper value={ml} min={10} max={400} step={mlStep} onChange={setMl} format={mlFmt} />
            </div>
          )}
          {method === "bottle" && (
            <div className="flex gap-2">
              <Chip active={milk === "breast"} onClick={() => setMilk("breast")}>{t("breastMilk")}</Chip>
              <Chip active={milk === "formula"} onClick={() => setMilk("formula")}>{t("formula")}</Chip>
            </div>
          )}
          {method === "solid" && <input className="field !py-3 !text-base" placeholder={t("foodPh")} value={food} onChange={(e) => setFood(e.target.value)} />}
          {method === "breast" && (
            <button className="pill-btn w-full" onClick={() => saveFeed(true)}>
              <Icon name="timeline" size={22} /> {t("startTimer")}
            </button>
          )}
          {method === "breast" && <p className="text-center text-sm font-semibold text-soft">{t("orManual")}</p>}
          {timePicker}
          {method === "breast" && (
            <div>
              <p className="mb-2 px-1 text-sm font-bold text-soft">{t("duration")}</p>
              <Stepper value={dur} min={1} max={90} step={1} onChange={setDur} format={(v) => t("minutes", { m: v })} />
            </div>
          )}
          {noteField}
          <button className={method === "breast" ? "ghost-btn w-full" : "pill-btn w-full"} onClick={() => saveFeed(false)}>{tc("save")}</button>
        </>
      )}

      {type === "sleep" && (
        <>
          <div className="flex gap-2">
            <Chip active={kind === "nap"} onClick={() => setKind("nap")}>{t("nap")}</Chip>
            <Chip active={kind === "night"} onClick={() => setKind("night")}>{t("night")}</Chip>
          </div>
          <button className="pill-btn w-full" onClick={() => saveSleep(true)}>
            <Icon name="moon" size={22} /> {t("startSleep")}
          </button>
          <p className="text-center text-sm font-semibold text-soft">{t("orManual")}</p>
          {timePicker}
          <div>
            <p className="mb-2 px-1 text-sm font-bold text-soft">{t("to")}</p>
            <DateTimeField value={sleepEnd} clearable placeholder={t("ongoing")} onChange={setSleepEnd} />
          </div>
          {noteField}
          <button className="ghost-btn w-full" disabled={!!sleepEnd && sleepEnd <= when} onClick={() => saveSleep(false)}>{tc("save")}</button>
        </>
      )}

      {type === "diaper" && (
        <>
          <div className="grid gap-3">
            {(["wet", "dirty", "mixed"] as const).map((k) => (
              <ChoiceCard
                key={k}
                selected={dkind === k}
                tone={k === "wet" ? "sky" : k === "dirty" ? "peach" : "lavender"}
                icon={k === "wet" ? "drop" : "diaper"}
                label={t(k)}
                onSelect={() => {
                  setDkind(k);
                }}
              />
            ))}
          </div>
          <AnimatePresence initial={false}>
            {(dkind === "dirty" || dkind === "mixed") && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <p className="mb-2 px-1 text-sm font-bold text-soft">{t("stoolColor")}</p>
                <div className="flex flex-wrap gap-2">
                  {["yellow", "green", "brown", "black", "red", "white"].map((c) => (
                    <Chip key={c} active={stool === c} onClick={() => setStool(stool === c ? undefined : c)}>{t(`color.${c}`)}</Chip>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {timePicker}
          {noteField}
          <button className="pill-btn w-full" disabled={!dkind} onClick={() => dkind && saveDiaper(dkind)}>{tc("save")}</button>
        </>
      )}

      {type === "growth" && (
        <>
          {([
            ["weight", <WeightInput key="w" units={units} onChange={setWG} />],
            ["length", <LengthInput key="l" units={units} kind="length" onChange={setLCm} />],
            ["head", <LengthInput key="h" units={units} kind="head" onChange={setHCm} />],
          ] as [GrowthMetric, React.ReactNode][]).map(([m, input]) => (
            <div key={m}>
              <div className="mb-2 flex items-center justify-between px-1">
                <p className="text-sm font-bold text-soft">{t(m)}</p>
                {pcts[m] != null && <span className="rounded-full bg-mint px-3 py-1 text-xs font-bold text-mint-ink">{t("percentile", { n: Math.round(pcts[m]!) })}</span>}
              </div>
              {input}
            </div>
          ))}
          {timePicker}
          {noteField}
          <button className="pill-btn w-full" onClick={saveGrowth}>{tc("save")}</button>
        </>
      )}

      {type === "moment" && (
        <>
          <div className="flex gap-2">
            <Chip active={mmode === "milestone"} onClick={() => setMmode("milestone")}>{tm("milestone")}</Chip>
            <Chip active={mmode === "memory"} onClick={() => setMmode("memory")}>{tm("memory")}</Chip>
          </div>
          {mmode === "milestone" && (
            <>
              <p className="px-1 text-sm font-bold text-soft">{tm("pick")}</p>
              <div className="grid grid-cols-2 gap-2.5">
                {suggestions.map((m) => (
                  <ChoiceCard key={m.key} compact selected={msKey === m.key} tone="sky" icon="star" label={tm(`ms.${m.key}`)} onSelect={() => { setMsKey(msKey === m.key ? null : m.key); setMTitle(""); }} />
                ))}
              </div>
              {!showAll && sorted.length > suggestions.length && (
                <button type="button" className="w-full text-sm font-bold text-soft underline underline-offset-4" onClick={() => setShowAll(true)}>{tm("showAll")}</button>
              )}
            </>
          )}
          <input className="field !py-3 !text-base" placeholder={mmode === "milestone" ? tm("other") : tm("titlePh")} value={mTitle} onChange={(e) => { setMTitle(e.target.value); if (e.target.value) setMsKey(null); }} />
          <textarea className="field !py-3 !text-base min-h-[96px] resize-none" placeholder={tm("notePh")} value={note} onChange={(e) => setNote(e.target.value)} />
          <div>
            <p className="mb-2 px-1 text-sm font-bold text-soft">{tm("photo")}</p>
            {preview && (
              <div className="relative mb-3 overflow-hidden rounded-[24px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="" className="aspect-[4/3] w-full object-cover" />
                <button type="button" aria-label="Remove" className="glass-btn absolute right-3 top-3" onClick={() => { setFile(null); setPreview(null); }}><Icon name="close" size={18} /></button>
              </div>
            )}
            <div className="flex gap-2">
              <TakePhotoButton className="ghost-btn flex-1 !px-3" onCapture={pickPhoto} />
              <label className="ghost-btn flex-1 cursor-pointer !px-3"><Icon name="image" size={20} />{tc("add")}<input type="file" accept="image/*" hidden onChange={(e) => pickPhoto(e.target.files?.[0])} /></label>
            </div>
          </div>
          {timePicker}
          <button className="pill-btn w-full" disabled={busy} onClick={saveMoment}>{busy ? tm("saving") : tc("save")}</button>
        </>
      )}
    </div>
  );
}
