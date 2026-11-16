"use client";
import { useEffect } from "react";
import { useApp } from "@/providers/Providers";

const ROUTES = ["/home", "/insights", "/timeline", "/profile"];

/**
 * Once per visit, quietly load the other main pages so the service worker has a copy of each.
 * That is what lets every tab open without a connection later.
 */
export function OfflineWarmup() {
  const { user, online } = useApp();
  useEffect(() => {
    if (!user || !online || typeof navigator === "undefined" || !navigator.serviceWorker?.controller) return;
    if (sessionStorage.getItem("tt-warmed") === "1") return;
    const run = async () => {
      sessionStorage.setItem("tt-warmed", "1");
      for (const r of ROUTES) {
        if (r === location.pathname) continue;
        await fetch(r, { credentials: "same-origin" }).catch(() => {});
      }
    };
    const idle = (window as unknown as { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    const id = idle ? idle(() => void run()) : window.setTimeout(() => void run(), 4000);
    return () => {
      if (!idle) clearTimeout(id);
    };
  }, [user, online]);
  return null;
}
