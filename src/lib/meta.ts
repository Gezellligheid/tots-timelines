import type { AccentName, EventType } from "./types";
import type { IconName } from "@/components/Icon";

export const TYPE_META: Record<EventType, { icon: IconName; tone: AccentName }> = {
  feed: { icon: "bottle", tone: "butter" },
  sleep: { icon: "moon", tone: "blush" },
  growth: { icon: "sprout", tone: "mint" },
  diaper: { icon: "diaper", tone: "lavender" },
  moment: { icon: "star", tone: "sky" },
};
