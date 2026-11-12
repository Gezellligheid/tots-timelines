"use client";
import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useApp } from "@/providers/Providers";
import { api } from "@/lib/data";
import { Icon } from "@/components/Icon";
import { MaskReveal } from "@/components/motion";

export default function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const t = useTranslations("join");
  const router = useRouter();
  const { authReady, user, userDoc, patchUser } = useApp();
  const [state, setState] = useState<"working" | "ok" | "bad">("working");
  const started = useRef(false);

  useEffect(() => {
    if (!authReady || started.current) return;
    try { sessionStorage.setItem("pendingInvite", token); } catch {}
    if (!user) return void router.replace("/");
    if (userDoc === undefined) return;
    if (!userDoc?.onboardingComplete) return void router.replace("/onboarding");
    started.current = true;
    api<{ babyId: string }>("/api/invites/accept", { token })
      .then(async ({ babyId }) => {
        await patchUser({ activeBabyId: babyId });
        try { sessionStorage.removeItem("pendingInvite"); } catch {}
        setState("ok");
      })
      .catch(() => {
        try { sessionStorage.removeItem("pendingInvite"); } catch {}
        setState("bad");
      });
  }, [authReady, user, userDoc, token, router, patchUser]);

  return (
    <main className="mx-auto grid min-h-dvh max-w-[520px] place-items-center p-8 text-center">
      <MaskReveal>
        <div className="space-y-6">
          <span className={`mx-auto grid h-28 w-28 place-items-center rounded-full ${state === "bad" ? "bg-blush text-blush-ink" : "bg-mint text-mint-ink"}`}>
            <Icon name={state === "bad" ? "close" : state === "ok" ? "check" : "heart"} size={56} />
          </span>
          <h1 className="text-3xl font-extrabold">{state === "ok" ? t("success") : state === "bad" ? t("invalid") : t("title")}</h1>
          {state !== "working" && <button className="pill-btn" onClick={() => router.replace("/home")}>{t("go")}</button>}
        </div>
      </MaskReveal>
    </main>
  );
}
