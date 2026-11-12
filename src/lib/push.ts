import { api } from "./data";

export type PushState = "ready" | "ios-install" | "unsupported" | "blocked" | "enabled";

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;

export async function pushState(): Promise<PushState> {
  if (isIOS() && !isStandalone()) return "ios-install";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  if (Notification.permission === "granted") {
    try {
      const reg = await Promise.race([navigator.serviceWorker.ready, new Promise<null>((r) => setTimeout(() => r(null), 1500))]);
      if (reg && (await reg.pushManager.getSubscription())) return "enabled";
    } catch {}
  }
  return "ready";
}

function b64ToBytes(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Must be called from a user gesture (required by iOS). */
export async function enablePush(locale: string): Promise<boolean> {
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return false;
  // In dev the Serwist worker is disabled, so register a small push-only worker for local testing
  if (process.env.NODE_ENV !== "production" && !(await navigator.serviceWorker.getRegistration())) {
    await navigator.serviceWorker.register("/dev-sw.js");
  }
  const reg = await Promise.race([navigator.serviceWorker.ready, new Promise<null>((r) => setTimeout(() => r(null), 4000))]);
  if (!reg) throw new Error("no-sw");
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!) }));
  await api("/api/push/subscribe", { subscription: sub.toJSON(), locale, tz: Intl.DateTimeFormat().resolvedOptions().timeZone });
  return true;
}

/** Drop this device's old subscription and subscribe again (fixes stale or expired subscriptions). Needs a user gesture. */
export async function resetPush(locale: string): Promise<boolean> {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  await sub?.unsubscribe();
  return enablePush(locale);
}
