import type { Units } from "./types";

const IMPERIAL_REGIONS = ["US", "LR", "MM"];

export function defaultUnits(): Units {
  try {
    const loc = new Intl.Locale(navigator.language);
    const region = loc.region ?? loc.maximize().region;
    return region && IMPERIAL_REGIONS.includes(region) ? "imperial" : "metric";
  } catch {
    return "metric";
  }
}

export const gToLb = (g: number) => g / 453.59237;
export const cmToIn = (cm: number) => cm / 2.54;
export const mlToOz = (ml: number) => ml / 29.5735;

export function splitLbOz(g: number) {
  const totalOz = g / 28.349523;
  let lb = Math.floor(totalOz / 16);
  let oz = Math.round(totalOz - lb * 16);
  if (oz === 16) {
    lb += 1;
    oz = 0;
  }
  return { lb, oz };
}

export function fmtWeight(g: number | undefined, units: Units) {
  if (g == null) return "–";
  if (units === "imperial") {
    const { lb, oz } = splitLbOz(g);
    return `${lb} lb ${oz} oz`;
  }
  return g >= 1000 ? `${(g / 1000).toFixed(2).replace(/\.?0+$/, "")} kg` : `${Math.round(g)} g`;
}
export function fmtLength(cm: number | undefined, units: Units) {
  if (cm == null) return "–";
  return units === "imperial" ? `${cmToIn(cm).toFixed(1)} in` : `${(+cm.toFixed(1)).toString()} cm`;
}
export function fmtVolume(ml: number | undefined, units: Units) {
  if (ml == null) return "–";
  return units === "imperial" ? `${mlToOz(ml).toFixed(1)} oz` : `${Math.round(ml)} ml`;
}
