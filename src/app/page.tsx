"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useApp } from "@/providers/Providers";
import { Icon, GoogleG, type IconName } from "@/components/Icon";
import { EASE, MaskReveal, RevealText } from "@/components/motion";
import { LangToggle } from "@/components/LangToggle";

const FLOATERS: { icon: IconName; tone: string; x: string; y: string; d: number; size: number }[] = [
  { icon: "bottle", tone: "butter", x: "8%", y: "14%", d: 0, size: 64 },
  { icon: "moon", tone: "blush", x: "70%", y: "8%", d: 0.4, size: 72 },
  { icon: "sprout", tone: "mint", x: "74%", y: "58%", d: 0.8, size: 60 },
  { icon: "diaper", tone: "lavender", x: "4%", y: "58%", d: 1.2, size: 68 },
];

export default function LoginPage() {
  const t = useTranslations("login");
  const router = useRouter();
  const { authReady, user, userDoc, signIn } = useApp();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [invited, setInvited] = useState(false);

  useEffect(() => {
    try {
      setInvited(!!sessionStorage.getItem("pendingInvite"));
    } catch {}
  }, []);

  useEffect(() => {
    if (!authReady || !user || userDoc === undefined) return;
    let pending: string | null = null;
    try {
      pending = sessionStorage.getItem("pendingInvite");
    } catch {}
    if (userDoc?.onboardingComplete) router.replace(pending ? `/join/${pending}` : "/home");
    else router.replace("/onboarding");
  }, [authReady, user, userDoc, router]);

  const go = async () => {
    setBusy(true);
    setErr(null);
    try {
      await signIn();
    } catch (e) {
      setErr((e as { code?: string }).code ?? "unknown");
      setBusy(false);
    }
  };

  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-[520px] flex-col overflow-hidden px-6 safe-t safe-b">
      <div className="relative z-10 flex items-center justify-between pt-2">
        <MaskReveal origin="0% 50%" duration={0.8}>
          <div className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-butter text-butter-ink">
              <Icon name="baby" size={22} />
            </span>
            Tots &amp; Timelines
          </div>
        </MaskReveal>
        <LangToggle />
      </div>

      {/* Hero art: pastel blobs + floating icon bubbles revealed through a circular mask */}
      <MaskReveal className="relative mt-6 flex-1" origin="50% 100%" duration={1.2}>
        <div className="absolute inset-0 min-h-[320px]">
          <motion.div className="absolute left-1/2 top-[8%] h-[78%] aspect-square -translate-x-1/2 rounded-full bg-lavender" animate={{ scale: [1, 1.04, 1] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} />
          <motion.div className="absolute left-[14%] top-[30%] h-[46%] aspect-square rounded-[46%_54%_60%_40%] bg-blush" animate={{ rotate: [0, 12, 0] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }} />
          <motion.div className="absolute right-[10%] top-[40%] h-[38%] aspect-square rounded-[60%_40%_46%_54%] bg-mint" animate={{ rotate: [0, -14, 0] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} />
          <div className="absolute left-1/2 top-[44%] grid h-28 w-28 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-surface shadow-[var(--shadow)]">
            <Icon name="baby" size={64} className="text-lavender-ink" />
          </div>
          {FLOATERS.map((f) => (
            <motion.div
              key={f.icon}
              className={`absolute grid place-items-center rounded-full bg-${f.tone} text-${f.tone}-ink shadow-[var(--shadow)]`}
              style={{ left: f.x, top: f.y, width: f.size, height: f.size }}
              initial={{ scale: 0 }}
              animate={{ scale: 1, y: [0, -10, 0] }}
              transition={{ scale: { delay: 0.6 + f.d * 0.3, type: "spring", stiffness: 300, damping: 18 }, y: { delay: f.d, duration: 4, repeat: Infinity, ease: "easeInOut" } }}
            >
              <Icon name={f.icon} size={f.size * 0.5} />
            </motion.div>
          ))}
        </div>
      </MaskReveal>

      <div className="relative z-10 pb-4 pt-8">
        <h1 className="text-[38px] font-extrabold leading-[1.05] tracking-tight">
          <RevealText text={t("line1")} delay={0.5} />
          <RevealText text={t("line2")} delay={0.7} />
        </h1>
        <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1, duration: 0.7, ease: EASE }} className="mt-3 text-[15px] leading-relaxed text-soft">
          {invited ? t("invited") : t("sub")}
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2, duration: 0.7, ease: EASE }} className="mt-6">
          <button className="pill-btn w-full" onClick={go} disabled={busy || !authReady}>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-white"><GoogleG size={18} /></span>
            {busy ? t("signing") : t("google")}
          </button>
          {err && (
            <p className="mt-3 text-center text-sm font-semibold text-blush-ink">
              {t("error")}
              <span className="mt-0.5 block text-xs font-medium opacity-70">{err}</span>
            </p>
          )}
          <p className="mt-4 text-center text-xs text-soft">{t("legal")}</p>
          <p className="mt-1 text-center text-xs text-soft">{t("disclaimer")}</p>
        </motion.div>
      </div>
    </main>
  );
}
