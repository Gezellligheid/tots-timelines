import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
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
  };
}
