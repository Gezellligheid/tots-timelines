export type Sex = "boy" | "girl" | "none";
export type FeedingType = "breast" | "bottle" | "both" | "solids";
export type Units = "metric" | "imperial";
export type AccentName = "blush" | "butter" | "mint" | "lavender" | "peach" | "sky";
export const ACCENTS: AccentName[] = ["blush", "butter", "mint", "lavender", "peach", "sky"];
export type Role = "mom" | "dad" | "parent" | "guardian" | "other";

export interface UserDoc {
  displayName: string;
  email?: string;
  photoURL?: string;
  role?: Role;
  coParentName?: string;
  units: Units;
  locale: "en" | "nl";
  onboardingComplete: boolean;
  activeBabyId?: string;
  quiet?: { enabled: boolean; start: string; end: string };
  wrappedSeen?: Record<string, number>; // `${babyId}_${n}` -> seen at
  tz?: string;
  createdAt?: number;
}

export interface Baby {
  id: string;
  name: string;
  sex: Sex;
  birthDate: string; // yyyy-MM-dd
  gestationWeeks?: number;
  birthWeightG?: number;
  birthLengthCm?: number;
  birthHeadCm?: number;
  feedingType: FeedingType;
  color: AccentName;
  photoKey?: string;
  ownerUid: string;
  memberUids: string[];
  members?: Record<string, { name: string; role?: Role }>;
  lastFeedAt?: number;
  // Wrapped bookkeeping (server decides readiness)
  nextWrappedAt?: number;
  wrappedCheckedN?: number;
  wrappedReadyN?: number;
  wrappedAvailable?: number[];
  wrappedPushedN?: number;
}

export type EventType = "feed" | "sleep" | "diaper" | "growth" | "moment";

export interface EventData {
  method?: "breast" | "bottle" | "pump" | "solid";
  side?: "left" | "right" | "both";
  ml?: number;
  milk?: "breast" | "formula";
  food?: string;
  kind?: string; // sleep: nap|night, diaper: wet|dirty|mixed
  color?: string;
  weightG?: number;
  lengthCm?: number;
  headCm?: number;
  milestone?: string; // key from lib/milestones
  title?: string; // custom title for a moment
}

export interface EventDoc {
  id: string;
  type: EventType;
  start: number;
  end?: number | null;
  data: EventData;
  note?: string;
  photoKey?: string;
  createdBy: string;
  updatedAt: number;
}

export interface Reminder {
  id: string;
  ownerUid: string;
  babyId: string;
  type: "feed" | "daily";
  enabled: boolean;
  intervalHours?: number; // feed
  time?: string; // daily HH:mm
  label?: string; // daily
  lastSentAt?: number;
  lastSentDay?: string;
}
