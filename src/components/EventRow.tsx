"use client";
import { useLocale, useTranslations } from "next-intl";
import { Icon } from "./Icon";
import { TYPE_META } from "@/lib/meta";
import { useMomentTitle } from "./MomentCard";
import { MemberAvatar, useMultiParent } from "./MemberAvatar";
import { clock } from "@/lib/format";
import { fmtDur, duration } from "@/lib/stats";
import { fmtLength, fmtVolume, fmtWeight } from "@/lib/units";
import { fmtTemp } from "@/lib/temp";
import type { EventDoc, Units } from "@/lib/types";

export function useDescribe(units: Units) {
  const tt = useTranslations("timeline");
  const tl = useTranslations("log");
  const momentTitle = useMomentTitle();
  return (e: EventDoc): { title: string; sub: string } => {
    const d = e.data;
    switch (e.type) {
      case "feed": {
        const m = d.method ?? "bottle";
        const title = tt(({ breast: "feedBreast", bottle: "feedBottle", pump: "feedPump", solid: "feedSolid" } as const)[m]);
        const parts: string[] = [];
        if (m === "breast") {
          if (d.side) parts.push(tl(d.side));
          parts.push(e.end ? fmtDur(duration(e)) : tt("running"));
        }
        if (d.ml) parts.push(fmtVolume(d.ml, units));
        if (m === "bottle" && d.milk) parts.push(tl(d.milk === "formula" ? "formula" : "breastMilk"));
        if (d.food) parts.push(d.food);
        return { title, sub: parts.join(" · ") };
      }
      case "sleep":
        return { title: tt(d.kind === "night" ? "sleepNight" : "sleepNap"), sub: e.end ? fmtDur(duration(e)) : tt("running") };
      case "diaper": {
        const title = tt(d.kind === "dirty" ? "diaperDirty" : d.kind === "mixed" ? "diaperMixed" : "diaperWet");
        return { title, sub: d.color ? tl(`color.${d.color}`) : "" };
      }
      case "supplement":
        return { title: d.title || tl("vitaminDefault"), sub: "" };
      case "temperature":
        return { title: tt("tempTitle"), sub: [fmtTemp(d.tempC, units), d.tempMethod ? tl(`temp.${d.tempMethod}`) : ""].filter(Boolean).join(" · ") };
      case "moment":
        return { title: momentTitle(e), sub: e.note ?? "" };
      default:
        return {
          title: tt("growthTitle"),
          sub: [d.weightG ? fmtWeight(d.weightG, units) : "", d.lengthCm ? fmtLength(d.lengthCm, units) : "", d.headCm ? fmtLength(d.headCm, units) : ""].filter(Boolean).join(" · "),
        };
    }
  };
}

export function EventRow({ e, units, onClick }: { e: EventDoc; units: Units; onClick?: () => void }) {
  const locale = useLocale();
  const describe = useDescribe(units);
  const multi = useMultiParent();
  const { title, sub } = describe(e);
  const meta = TYPE_META[e.type];
  const Tag = onClick ? "button" : "div";
  return (
    <Tag onClick={onClick} className="flex w-full items-center gap-3 rounded-[24px] bg-surface p-3 pr-5 text-left shadow-[var(--shadow)]">
      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full bg-${meta.tone} text-${meta.tone}-ink`}>
        <Icon name={meta.icon} size={24} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold">{title}</span>
        {sub && <span className="block truncate text-sm text-soft">{sub}</span>}
        {e.note && <span className="block truncate text-xs italic text-soft">“{e.note}”</span>}
      </span>
      <span className="flex items-center gap-2">
        {e.pending && <Icon name="cloudOff" size={14} className="text-soft" aria-label="Waiting to sync" />}
        {multi && <MemberAvatar uid={e.createdBy} size={22} />}
        <span className="text-sm font-semibold text-soft tabular-nums">{clock(e.start, locale)}</span>
      </span>
    </Tag>
  );
}
