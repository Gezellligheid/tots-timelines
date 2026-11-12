"use client";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { setLocaleCookie, type AppLocale } from "@/lib/locale";

export function LangToggle({ onChange }: { onChange?: (l: AppLocale) => void }) {
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  return (
    <div className="flex rounded-full bg-surface p-1 text-sm font-bold shadow-[var(--shadow)]">
      {(["en", "nl"] as const).map((l) => (
        <button
          key={l}
          onClick={() => {
            setLocaleCookie(l);
            onChange?.(l);
            router.refresh();
          }}
          className={`h-9 rounded-full px-4 uppercase transition-colors ${locale === l ? "on-ink" : "text-soft"}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
