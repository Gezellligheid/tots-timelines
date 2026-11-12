"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useApp } from "@/providers/Providers";
import { Icon, type IconName } from "@/components/Icon";
import { EASE } from "@/components/motion";
import { Skeleton } from "@/components/ui";
import { WrappedGate } from "@/components/WrappedGate";
import { FeedReminderPrompt } from "@/components/FeedReminder";
import { DailyReminderAuto } from "@/components/DailyReminderAuto";

const TABS: { href: string; icon: IconName; key: "home" | "insights" | "timeline" | "profile" }[] = [
  { href: "/home", icon: "home", key: "home" },
  { href: "/insights", icon: "chart", key: "insights" },
  { href: "/timeline", icon: "timeline", key: "timeline" },
  { href: "/profile", icon: "user", key: "profile" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("nav");
  const router = useRouter();
  const path = usePathname();
  const { authReady, user, userDoc, babies, baby } = useApp();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (!authReady) return;
    if (!user) return router.replace("/");
    if (userDoc === undefined || babies === null) return;
    if (!userDoc?.onboardingComplete || !babies.length) router.replace("/onboarding");
  }, [authReady, user, userDoc, babies, router]);

  const ready = hydrated && authReady && user && userDoc && babies && baby;

  return (
    <div className="mx-auto min-h-dvh w-full max-w-[520px]">
      {ready ? (
        <>
          <motion.main key={path} initial={{ clipPath: "inset(0 0 100% 0)", opacity: 0.6 }} animate={{ clipPath: "inset(0 0 0% 0)", opacity: 1 }} transition={{ duration: 0.7, ease: EASE }} className="px-5 pb-36 safe-t">
            {children}
          </motion.main>
          <WrappedGate />
          <FeedReminderPrompt />
          <DailyReminderAuto />
          <nav className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-w-[520px] justify-center px-5 safe-b">
            <div className="relative flex w-full items-center justify-between rounded-full bg-ink p-2 shadow-2xl">
              {TABS.map((tab) => {
                const active = path.startsWith(tab.href);
                return (
                  <Link key={tab.href} href={tab.href} aria-label={t(tab.key)} className="relative flex h-14 flex-1 items-center justify-center gap-2 rounded-full" style={{ color: "var(--bg)" }}>
                    {active && <motion.span layoutId="tab" className="absolute inset-0 rounded-full bg-accent" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
                    <span className={`relative flex items-center gap-2 ${active ? "text-ink" : "opacity-70"}`}>
                      <Icon name={tab.icon} size={22} />
                      <AnimatePresence initial={false}>
                        {active && (
                          <motion.span initial={{ width: 0, opacity: 0 }} animate={{ width: "auto", opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="overflow-hidden whitespace-nowrap text-sm font-bold">
                            {t(tab.key)}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </span>
                  </Link>
                );
              })}
            </div>
          </nav>
        </>
      ) : (
        <div className="space-y-4 p-5 safe-t">
          <Skeleton className="h-16" />
          <Skeleton className="h-44" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
          </div>
        </div>
      )}
    </div>
  );
}
