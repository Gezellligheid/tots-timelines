export type AppLocale = "en" | "nl";

export function setLocaleCookie(l: AppLocale) {
  document.cookie = `NEXT_LOCALE=${l};path=/;max-age=31536000;samesite=lax`;
}

export function setTheme(t: "light" | "dark" | "auto") {
  try {
    if (t === "auto") localStorage.removeItem("theme");
    else localStorage.setItem("theme", t);
  } catch {}
  const dark = t === "dark" || (t === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

export function currentTheme(): "light" | "dark" | "auto" {
  try {
    const t = localStorage.getItem("theme");
    return t === "light" || t === "dark" ? t : "auto";
  } catch {
    return "auto";
  }
}
