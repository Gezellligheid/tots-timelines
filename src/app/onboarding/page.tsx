"use client";
import { useEffect, useState } from "react";
import { Onboarding, type Mode } from "@/features/Onboarding";

export default function OnboardingPage() {
  const [mode, setMode] = useState<Mode | null>(null);
  useEffect(() => {
    let pending = false;
    try {
      pending = !!sessionStorage.getItem("pendingInvite");
    } catch {}
    setMode(pending ? "parent" : "full");
  }, []);
  if (!mode) return null;
  return <Onboarding mode={mode} />;
}
