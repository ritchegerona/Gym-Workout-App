import { estimate1RM } from "./calculations";

export interface StrengthLevel {
  level: "Untrained" | "Novice" | "Intermediate" | "Advanced" | "Elite";
  /** Estimated 1RM required as a multiple of body weight. */
  bodyweightRatio: number;
}

const LEVELS: StrengthLevel["level"][] = [
  "Untrained",
  "Novice",
  "Intermediate",
  "Advanced",
  "Elite",
];

/** Big-lift standards keyed by canonical exercise name. */
export const STRENGTH_STANDARDS: Record<string, StrengthLevel[]> = {
  "Bench Press": [
    { level: "Untrained", bodyweightRatio: 0.5 },
    { level: "Novice", bodyweightRatio: 1 },
    { level: "Intermediate", bodyweightRatio: 1.35 },
    { level: "Advanced", bodyweightRatio: 1.75 },
    { level: "Elite", bodyweightRatio: 2.25 },
  ],
  Squat: [
    { level: "Untrained", bodyweightRatio: 0.75 },
    { level: "Novice", bodyweightRatio: 1.25 },
    { level: "Intermediate", bodyweightRatio: 1.75 },
    { level: "Advanced", bodyweightRatio: 2.25 },
    { level: "Elite", bodyweightRatio: 2.75 },
  ],
  Deadlift: [
    { level: "Untrained", bodyweightRatio: 0.75 },
    { level: "Novice", bodyweightRatio: 1.5 },
    { level: "Intermediate", bodyweightRatio: 2 },
    { level: "Advanced", bodyweightRatio: 2.5 },
    { level: "Elite", bodyweightRatio: 3 },
  ],
  "Overhead Press": [
    { level: "Untrained", bodyweightRatio: 0.35 },
    { level: "Novice", bodyweightRatio: 0.75 },
    { level: "Intermediate", bodyweightRatio: 1 },
    { level: "Advanced", bodyweightRatio: 1.25 },
    { level: "Elite", bodyweightRatio: 1.6 },
  ],
};

/** Look up standards for a lift, ignoring case/extra words like "Barbell". */
export function standardForLift(name: string): StrengthLevel[] | null {
  const found = Object.keys(STRENGTH_STANDARDS).find(
    (key) =>
      key.toLowerCase() === name.trim().toLowerCase() ||
      name.trim().toLowerCase().includes(key.toLowerCase()),
  );
  return found ? STRENGTH_STANDARDS[found] : null;
}

export interface StandardClassification {
  level: StrengthLevel;
  /** Current 1RM as a fraction of body weight. */
  bodyweightRatio: number;
  /** Kg needed on the bar to reach the next level. */
  kgToNext: number;
  next: StrengthLevel | null;
}

/** Classify a 1RM against body-weight-based standards for that lift. */
export function classifyStrength(
  exerciseName: string,
  oneRmKg: number,
  bodyWeightKg: number,
): StandardClassification | null {
  const standards = standardForLift(exerciseName);
  if (!standards) return null;
  if (!(oneRmKg > 0) || !(bodyWeightKg > 0)) return null;

  const ratio = oneRmKg / bodyWeightKg;
  let achieved = standards[0];
  let next: StrengthLevel | null = null;
  for (let i = 0; i < standards.length; i++) {
    if (ratio >= standards[i].bodyweightRatio) {
      achieved = standards[i];
    } else {
      next = standards[i];
      break;
    }
  }
  return {
    level: achieved,
    bodyweightRatio: ratio,
    kgToNext: next ? next.bodyweightRatio * bodyWeightKg - oneRmKg : 0,
    next,
  };
}

export function formatEstimated1RM(weightKg: number, reps: number): number {
  return Math.round(estimate1RM(weightKg, reps) * 10) / 10;
}

export function strengthLevelIndex(level: StrengthLevel["level"]): number {
  return LEVELS.indexOf(level);
}