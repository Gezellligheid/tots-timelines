import type { SVGProps } from "react";

/**
 * Custom duotone icon set: 24px grid, 2px stroke, round caps/joins.
 * Icons marked `f` get a soft offset "blob" fill behind the stroke.
 */
const ICONS = {
  bottle: { f: true, d: ["M9 8h6l1.2 3.2V19a2 2 0 0 1-2 2H9.8a2 2 0 0 1-2-2v-7.8z", "M10.5 3.5h3V8h-3z", "M10 13h2.5M10 16h2.5"] },
  moon: { f: true, d: ["M20 14.2A8 8 0 0 1 9.8 4 8 8 0 1 0 20 14.2z", "M15 4.5h3l-3 3.2h3"] },
  diaper: { f: true, d: ["M3.5 6.5h17v3.8c0 4.3-2.6 8.2-6 8.2-1.5 0-2-1-2.5-1s-1 1-2.5 1c-3.4 0-6-3.9-6-8.2z", "M8 6.5v1.2M16 6.5v1.2"] },
  sprout: { f: true, d: ["M12 21v-8.5", "M12 12.5C12 8 8.8 5.8 4.8 5.8c0 4.2 3 6.7 7.2 6.7z", "M12 14.5c0-3.2 2.4-5.4 6-5.4 0 3.2-2.4 5.4-6 5.4z"] },
  home: { f: true, d: ["M4 11l8-7 8 7v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z", "M10 21v-5.5h4V21"] },
  chart: { d: ["M6 20v-7", "M12 20V5", "M18 20v-10"] },
  timeline: { d: ["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z", "M12 7.5V12l3 2"] },
  user: { f: true, d: ["M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M4.5 20.5c0-3.8 3.4-6 7.5-6s7.5 2.2 7.5 6"] },
  plus: { d: ["M12 5v14M5 12h14"] },
  back: { d: ["M15 5l-7 7 7 7"] },
  check: { d: ["M5 12.5l4.5 4.5L19 7.5"] },
  chevR: { d: ["M9 5l7 7-7 7"] },
  arrowUR: { d: ["M7 17L17 7", "M8 7h9v9"] },
  drop: { f: true, d: ["M12 3s6 6.3 6 11a6 6 0 0 1-12 0c0-4.7 6-11 6-11z"] },
  bell: { f: true, d: ["M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z", "M10 20.5a2 2 0 0 0 4 0"] },
  globe: { f: true, d: ["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z", "M3 12h18", "M12 3c3.2 3.2 3.2 14.8 0 18M12 3c-3.2 3.2-3.2 14.8 0 18"] },
  heart: { f: true, d: ["M12 20s-8-4.8-8-10.8A4.4 4.4 0 0 1 12 6.7 4.4 4.4 0 0 1 20 9.2C20 15.2 12 20 12 20z"] },
  star: { f: true, d: ["M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z"] },
  thermo: { f: true, d: ["M10 14.2V5.5a2 2 0 0 1 4 0v8.7a4 4 0 1 1-4 0z"] },
  baby: { f: true, d: ["M12 21a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17z", "M9 10.5v.5M15 10.5v.5", "M9.3 14.5c1.3 1.6 4.1 1.6 5.4 0", "M12 4c.8-1.2 2.2-1.4 3-.8"] },
  trash: { d: ["M4.5 7h15", "M9.5 7V4.5h5V7", "M6.5 7l1 13h9l1-13"] },
  edit: { d: ["M4 20l4-1 11-11-3-3L5 16z", "M14 7l3 3"] },
  copy: { f: true, d: ["M9 9h11v11H9z", "M5 15V5h10"] },
  logout: { d: ["M10 4H5v16h5", "M16 8l4 4-4 4", "M20 12H9"] },
  camera: { f: true, d: ["M4 8h3l2-3h6l2 3h3v11H4z", "M12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"] },
  close: { d: ["M6 6l12 12M18 6L6 18"] },
  spoon: { f: true, d: ["M12 3c-2.2 0-3.2 2-3.2 4.4S10 11.5 12 11.5s3.2-1.7 3.2-4.1S14.2 3 12 3z", "M12 11.5V21"] },
  sun: { f: true, d: ["M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"] },
  pump: { f: true, d: ["M8 4h8v6a4 4 0 0 1-8 0z", "M12 14v3.5a3 3 0 0 0 3 3h2"] },
  pill: { f: true, d: ["M8.2 3.8a4.4 4.4 0 0 1 6.2 6.2l-4.4 4.4a4.4 4.4 0 0 1-6.2-6.2z", "M7 7l6 6"] },
  swap: { d: ["M7 4L4 7l3 3", "M4 7h13", "M17 20l3-3-3-3", "M20 17H7"] },
  link: { d: ["M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1", "M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"] },
  calendar: { f: true, d: ["M4 6.5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z", "M4 10h16", "M8 3v3M16 3v3"] },
  image: { f: true, d: ["M4 5.5a1.5 1.5 0 0 1 1.5-1.5h13A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5z", "M8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z", "M20 15l-4.5-4.5L7 19"] },
  download: { d: ["M12 4v11", "M7 11l5 5 5-5", "M5 20h14"] },
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 24, className, strokeWidth = 2, ...rest }: { name: IconName; size?: number; strokeWidth?: number } & Omit<SVGProps<SVGSVGElement>, "name">) {
  const ic = ICONS[name] as { f?: boolean; d: readonly string[] };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden {...rest}>
      {ic.f && <path d={ic.d[0]} fill="currentColor" stroke="none" opacity={0.16} transform="translate(1.6 1.6)" />}
      {ic.d.map((p, i) => (
        <path key={i} d={p} />
      ))}
    </svg>
  );
}

export function GoogleG({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
      <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}
