"use client";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { useApp } from "@/providers/Providers";
import { WrappedStory } from "./Wrapped";
import { WrappedReadyScreen } from "@/components/WrappedGate";
import { buildDemoSummary } from "@/lib/wrappedDemo";

/**
 * Localhost-only preview with sample data (nothing is read or written).
 *   /wrapped/demo              the story, months 1-3
 *   /wrapped/demo?n=6          the story for months 4-6
 *   /wrapped/demo?photos=0     the story without photos
 *   /wrapped/demo?gate=1       the full-screen "ready" screen
 */
export function WrappedDemo() {
  const sp = useSearchParams();
  const router = useRouter();
  const { baby } = useApp();
  const n = Math.max(3, Math.floor((parseInt(sp.get("n") ?? "3", 10) || 3) / 3) * 3);
  const photos = sp.get("photos") !== "0";
  const gate = sp.get("gate") === "1";
  const [show, setShow] = useState(true);
  const summary = useMemo(() => (baby ? buildDemoSummary(baby, n, photos) : null), [baby, n, photos]);

  if (!baby || !summary) return <div className="grid min-h-dvh place-items-center text-soft">Loading…</div>;

  if (gate) {
    return (
      <div className="grid min-h-dvh place-items-center bg-bg">
        <button className="pill-btn" onClick={() => setShow(true)}>Show the “ready” screen again</button>
        <AnimatePresence>
          {show && <WrappedReadyScreen key="demo-gate" baby={baby} n={n} onSee={() => router.push(`/wrapped/demo?n=${n}`)} onSkip={() => setShow(false)} />}
        </AnimatePresence>
      </div>
    );
  }
  return <WrappedStory key={`${n}-${photos}`} n={n} demo={summary} />;
}
