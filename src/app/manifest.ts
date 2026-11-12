import type { MetadataRoute } from "next";
import { headers } from "next/headers";

const SHORTCUTS = {
  en: {
    feed: ["Log a feed", "Feed"],
    sleep: ["Start sleeping", "Sleep"],
    diaper: ["Log a diaper", "Diaper"],
    moment: ["Add a memory", "Memory"],
    growth: ["Log growth", "Growth"],
  },
  nl: {
    feed: ["Voeding loggen", "Voeding"],
    sleep: ["Start slapen", "Slapen"],
    diaper: ["Luier loggen", "Luier"],
    moment: ["Herinnering toevoegen", "Herinnering"],
    growth: ["Groei loggen", "Groei"],
  },
} as const;

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  // The manifest request carries the browser's language, so shortcut names can follow it
  const lang = ((await headers()).get("accept-language") ?? "").toLowerCase().startsWith("nl") ? "nl" : "en";
  const names = SHORTCUTS[lang];

  return {
    name: "Tots & Timelines",
    short_name: "Tots",
    description: "Track your newborn's feeding, sleep, diapers and growth.",
    id: "/",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    // never fall back to a browser toolbar ("minimal-ui" shows one)
    display_override: ["standalone"],
    orientation: "portrait",
    background_color: "#cfd3f8",
    theme_color: "#f6f4ee",
    icons: [
      // Full-bleed artwork for Android's adaptive icon shapes. Distinct URLs so browsers
      // don't treat these as duplicates of the "any" icons below.
      { src: "/icons/192?v=2&m=1", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/512?v=2&m=1", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/192?v=2", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512?v=2", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
    // Long-press (Android) or right-click (desktop) the installed app icon for quick actions.
    // Android launchers show the first 4, desktop shows all.
    shortcuts: (["feed", "sleep", "diaper", "moment", "growth"] as const).map((k) => ({
      name: names[k][0],
      short_name: names[k][1],
      url: `/home?log=${k}`,
      icons: [{ src: `/icons/shortcut/${k}`, sizes: "192x192", type: "image/png" }],
    })),
  };
}
