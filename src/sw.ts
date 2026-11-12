/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import { NetworkOnly, Serwist, type PrecacheEntry, type SerwistGlobalConfig } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // never cache Firebase's auth handler or our private API/media responses
    { matcher: ({ url }) => url.pathname.startsWith("/__/") || url.pathname.startsWith("/api/"), handler: new NetworkOnly() },
    ...defaultCache,
  ],
});
serwist.addEventListeners();

/* ---- Web Push (works on iOS 16.4+ for the installed PWA) ---- */
self.addEventListener("push", (event) => {
  let data: { title?: string; body?: string; url?: string; tag?: string } = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { title: "Tots & Timelines", body: event.data?.text() };
  }
  event.waitUntil(
    self.registration.showNotification(data.title ?? "Tots & Timelines", {
      body: data.body,
      tag: data.tag,
      icon: "/icons/192",
      badge: "/icons/192",
      data: { url: data.url ?? "/home" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data?.url as string) ?? "/home";
  event.waitUntil(
    (async () => {
      const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const w of wins) {
        if ("focus" in w) {
          await w.focus();
          if ("navigate" in w) await (w as WindowClient).navigate(url);
          return;
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});
