"use client";
import { useLocale, useTranslations } from "next-intl";
import { Icon } from "./Icon";
import { PhotoImage } from "./ui";
import { useApp } from "@/providers/Providers";
import { ageText } from "@/lib/format";
import type { EventDoc } from "@/lib/types";

export function useMomentTitle() {
  const tm = useTranslations("moments");
  return (e: EventDoc) => e.data.title || (e.data.milestone ? tm(`ms.${e.data.milestone}`) : tm("badgeMemory"));
}

export function useMomentTitleKey() {
  const tm = useTranslations("moments");
  return (m: { title?: string; milestone?: string }) => m.title || (m.milestone ? tm(`ms.${m.milestone}`) : tm("badgeMemory"));
}

/** Big card for a milestone or memory, with the photo on top when there is one. */
export function MomentCard({ e, onClick }: { e: EventDoc; onClick?: () => void }) {
  const tm = useTranslations("moments");
  const tAge = useTranslations("age");
  const locale = useLocale();
  const { baby } = useApp();
  const title = useMomentTitle()(e);
  const isMilestone = !!e.data.milestone || e.data.kind === "milestone";
  const when = new Date(e.start);
  const Tag = onClick ? "button" : "div";
  return (
    <Tag onClick={onClick} className="block w-full overflow-hidden rounded-[28px] bg-surface text-left shadow-[var(--shadow)]">
      {e.photoKey && <PhotoImage photoKey={e.photoKey} className="aspect-[4/3] w-full" />}
      <div className={`p-4 ${e.photoKey ? "" : "bg-sky"}`}>
        <div className="flex items-center gap-3">
          {!e.photoKey && (
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-surface text-sky-ink"><Icon name="star" size={24} /></span>
          )}
          <div className="min-w-0 flex-1">
            <span className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-sky px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-sky-ink">
              <Icon name={isMilestone ? "star" : "heart"} size={12} />
              {isMilestone ? tm("badgeMilestone") : tm("badgeMemory")}
            </span>
            <p className="text-xl font-extrabold leading-tight">{title}</p>
          </div>
        </div>
        {e.note && <p className="mt-2 text-[15px] leading-relaxed text-ink/80">{e.note}</p>}
        <p className="mt-2 text-xs font-semibold text-soft">
          {when.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })}
          {baby && ` · ${ageText(baby.birthDate, tAge, when)}`}
        </p>
      </div>
    </Tag>
  );
}
