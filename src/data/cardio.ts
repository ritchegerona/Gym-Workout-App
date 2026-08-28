import type { CardioActivity } from "../types";

export const CARDIO_ACTIVITIES: { value: CardioActivity; label: string }[] = [
  { value: "Run", label: "Run" },
  { value: "Walk", label: "Walk" },
  { value: "Cycle", label: "Cycle" },
  { value: "Swim", label: "Swim" },
  { value: "Row", label: "Row" },
  { value: "Stairs", label: "Stairs" },
  { value: "Hike", label: "Hike" },
  { value: "Other", label: "Other" },
];

export const CARDIO_ACTIVITY_LABELS: Record<CardioActivity, string> = {
  Run: "Run",
  Walk: "Walk",
  Cycle: "Cycle",
  Swim: "Swim",
  Row: "Row",
  Stairs: "Stairs",
  Hike: "Hike",
  Other: "Other",
};

/** Activities with a distance (km) worth recording. */
export const DISTANCE_ACTIVITIES: CardioActivity[] = [
  "Run",
  "Walk",
  "Cycle",
  "Swim",
  "Hike",
  "Row",
];