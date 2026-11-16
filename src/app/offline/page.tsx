"use client";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/Icon";
import { MaskReveal, RevealText } from "@/components/motion";

/** Shown by the service worker when a page was never opened before and there is no connection. */
export default function OfflinePage() {
  const t = useTranslations("offline");
  return (
    <main className="mx-auto grid min-h-dvh max-w-[520px] place-items-center px-8 text-center">
      <div>
        <MaskReveal className="mx-auto w-fit">
          <span className="grid h-32 w-32 place-items-center rounded-full bg-butter text-butter-ink"><Icon name="cloudOff" size={64} strokeWidth={1.6} /></span>
        </MaskReveal>
        <h1 className="mt-8 text-3xl font-extrabold tracking-tight"><RevealText text={t("pageTitle")} delay={0.2} /></h1>
        <p className="mt-3 text-[15px] leading-relaxed text-soft">{t("pageBody")}</p>
        <button className="pill-btn mt-8" onClick={() => location.reload()}>{t("retry")}</button>
      </div>
    </main>
  );
}
