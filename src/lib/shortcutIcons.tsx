import { ImageResponse } from "next/og";

/** Icons for the app shortcuts (long-press the app icon): a pastel square with the matching line icon. */
const SHORTCUTS = {
  feed: {
    bg: "#fbe9a6",
    ink: "#946d0b",
    d: ["M9 8h6l1.2 3.2V19a2 2 0 0 1-2 2H9.8a2 2 0 0 1-2-2v-7.8z", "M10.5 3.5h3V8h-3z", "M10 13h2.5M10 16h2.5"],
  },
  sleep: {
    bg: "#f4d6d2",
    ink: "#b5524a",
    d: ["M20 14.2A8 8 0 0 1 9.8 4 8 8 0 1 0 20 14.2z", "M15 4.5h3l-3 3.2h3"],
  },
  diaper: {
    bg: "#cfd3f8",
    ink: "#4a52b8",
    d: ["M3.5 6.5h17v3.8c0 4.3-2.6 8.2-6 8.2-1.5 0-2-1-2.5-1s-1 1-2.5 1c-3.4 0-6-3.9-6-8.2z", "M8 6.5v1.2M16 6.5v1.2"],
  },
  moment: {
    bg: "#cfe6f4",
    ink: "#2d6c94",
    d: ["M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z"],
  },
  growth: {
    bg: "#cde8e0",
    ink: "#2d7a66",
    d: ["M12 21v-8.5", "M12 12.5C12 8 8.8 5.8 4.8 5.8c0 4.2 3 6.7 7.2 6.7z", "M12 14.5c0-3.2 2.4-5.4 6-5.4 0 3.2-2.4 5.4-6 5.4z"],
  },
} as const;

export type ShortcutKind = keyof typeof SHORTCUTS;
export const isShortcutKind = (k: string): k is ShortcutKind => k in SHORTCUTS;

export function renderShortcutIcon(kind: ShortcutKind, size = 192) {
  const s = SHORTCUTS[kind];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" fill="${s.bg}"/><g transform="translate(24 24) scale(2)" fill="none" stroke="${s.ink}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${s.d.map((p) => `<path d="${p}"/>`).join("")}</g></svg>`;
  const uri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  return new ImageResponse(
    (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={uri} width={size} height={size} alt="" style={{ width: size, height: size }} />
    ),
    { width: size, height: size },
  );
}
