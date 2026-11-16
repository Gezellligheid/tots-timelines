import type { Units } from "./types";

/** Temperatures are stored in °C and shown as °C or °F depending on the user's unit setting. */
export const cToF = (c: number) => (c * 9) / 5 + 32;
export const fToC = (f: number) => ((f - 32) * 5) / 9;

export function fmtTemp(c: number | undefined, units: Units) {
  if (c == null) return "–";
  return units === "imperial" ? `${cToF(c).toFixed(1)} °F` : `${c.toFixed(1)} °C`;
}

export type TempStatus = "low" | "normal" | "raised" | "fever";

/** Common thresholds for babies: 38.0 °C (100.4 °F) and up is a fever. Guidance only, not a diagnosis. */
export function tempStatus(c: number): TempStatus {
  if (c >= 38) return "fever";
  if (c >= 37.5) return "raised";
  if (c < 36) return "low";
  return "normal";
}
