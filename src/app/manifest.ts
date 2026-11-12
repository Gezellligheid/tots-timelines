import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tots & Timelines",
    short_name: "Tots",
    description: "Track your newborn's feeding, sleep, diapers and growth.",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    background_color: "#f6f4ee",
    theme_color: "#f6f4ee",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
