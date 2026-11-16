export type AppLocale = "en" | "nl";

export function setLocaleCookie(l: AppLocale) {
  document.cookie = `NEXT_LOCALE=${l};path=/;max-age=31536000;samesite=lax`;
}

export type ThemeName = "light" | "dark" | "night";

const NIGHT_FROM = 22;
const NIGHT_TO = 6;

/** The theme to show right now: warm night mode between 22:00 and 06:00 (if enabled), otherwise light/dark. */
export function resolveTheme(): ThemeName {
  try {
    const h = new Date().getHours();
    if (localStorage.getItem("tt-autonight") !== "0" && (h >= NIGHT_FROM || h < NIGHT_TO)) return "night";
    const pref = localStorage.getItem("theme");
    if (pref === "light" || pref === "dark") return pref;
  } catch {}
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme() {
  document.documentElement.dataset.theme = resolveTheme();
}

export function setTheme(t: "light" | "dark" | "auto") {
  try {
    if (t === "auto") localStorage.removeItem("theme");
    else localStorage.setItem("theme", t);
  } catch {}
  applyTheme();
}

export function currentTheme(): "light" | "dark" | "auto" {
  try {
    const t = localStorage.getItem("theme");
    return t === "light" || t === "dark" ? t : "auto";
  } catch {
    return "auto";
  }
}

export const getAutoNight = () => {
  try {
    return localStorage.getItem("tt-autonight") !== "0";
  } catch {
    return true;
  }
};
export function setAutoNight(on: boolean) {
  try {
    if (on) localStorage.removeItem("tt-autonight");
    else localStorage.setItem("tt-autonight", "0");
  } catch {}
  applyTheme();
}
