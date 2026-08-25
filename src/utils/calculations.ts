import type { SetRecord } from "../types";

/** Volume of a single set: weight × reps. */
export function setVolume(weight: number, reps: number): number {
  return Math.max(0, weight) * Math.max(0, reps);
}

export function setRecordVolume(set: SetRecord): number {
  return setVolume(set.weight, set.reps);
}

/** Total volume across all completed sets of a session exercise. */
export function exerciseVolume(sets: SetRecord[]): number {
  return sets.reduce((sum, s) => sum + setVolume(s.weight, s.reps), 0);
}

/** Epley formula: 1RM = w × (1 + reps / 30). Bodyweight-only reps use given weight. */
export function estimate1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

export function completedSets<T extends { weight: number; reps: number }>(
  sets: T[],
): T[] {
  return sets.filter((s) => s.reps > 0 || s.weight > 0);
}

export function totalSessionVolume(
  exercises: { sets: SetRecord[] }[],
): number {
  return exercises.reduce((sum, ex) => sum + exerciseVolume(ex.sets), 0);
}

export function countCompletedSets(exercises: { sets: SetRecord[] }[]): number {
  return exercises.reduce(
    (n, ex) => n + ex.sets.filter((s) => s.reps > 0).length,
    0,
  );
}

export interface PRCandidate {
  type: "max-weight" | "best-1rm" | "best-set-volume";
  value: number;
}

/** Compare a set against previous bests; returns PR types achieved. */
export function detectSetPRs(
  set: SetRecord,
  prevMaxWeight: number,
  prevBest1RM: number,
  prevBestSetVolume: number,
): PRCandidate[] {
  const prs: PRCandidate[] = [];
  const v = setVolume(set.weight, set.reps);
  const e1rm = estimate1RM(set.weight, set.reps);
  if (set.weight > prevMaxWeight) prs.push({ type: "max-weight", value: set.weight });
  if (e1rm > prevBest1RM && e1rm > 0)
    prs.push({ type: "best-1rm", value: e1rm });
  if (v > prevBestSetVolume && v > 0)
    prs.push({ type: "best-set-volume", value: v });
  return prs;
}
