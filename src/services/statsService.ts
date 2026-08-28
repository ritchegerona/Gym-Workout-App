import type {
  Exercise,
  MuscleGroup,
  PersonalRecord,
  WorkoutSession,
} from "../types";
import { exerciseVolume } from "../utils/calculations";
import { startOfWeek } from "../utils/format";

export interface WeeklySummary {
  workouts: number;
  totalVolume: number;
  totalDurationMs: number;
  streakDays: number;
}

export function computeWeeklySummary(sessions: WorkoutSession[]): WeeklySummary {
  const weekStart = startOfWeek().getTime();
  const thisWeek = sessions.filter((s) => s.startedAt >= weekStart);
  const totalVolume = thisWeek.reduce(
    (sum, s) => sum + s.exercises.reduce((v, ex) => v + exerciseVolume(ex.sets), 0),
    0,
  );
  const totalDurationMs = thisWeek.reduce(
    (sum, s) => sum + ((s.endedAt ?? s.startedAt) - s.startedAt),
    0,
  );
  return {
    workouts: thisWeek.length,
    totalVolume,
    totalDurationMs,
    streakDays: computeStreak(sessions),
  };
}

/** Consecutive days with at least one workout, counting today or yesterday as alive. */
export function computeStreak(sessions: WorkoutSession[]): number {
  const daySet = new Set(
    sessions.map((s) => new Date(s.startedAt).toDateString()),
  );
  const cursor = new Date();
  if (!daySet.has(cursor.toDateString())) {
    // Streak stays alive if trained yesterday
    cursor.setDate(cursor.getDate() - 1);
    if (!daySet.has(cursor.toDateString())) return 0;
  }
  let streak = 0;
  while (daySet.has(cursor.toDateString())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export interface WorkoutDayCount {
  weekStart: number;
  count: number;
}

/** Workouts per ISO week for the last N weeks. */
export function workoutsPerWeek(
  sessions: WorkoutSession[],
  weeks = 8,
): WorkoutDayCount[] {
  const out: WorkoutDayCount[] = [];
  const now = new Date();
  for (let i = weeks - 1; i >= 0; i--) {
    const ws = startOfWeek(now);
    ws.setDate(ws.getDate() - i * 7);
    const start = ws.getTime();
    const end = start + 7 * 86_400_000;
    out.push({
      weekStart: start,
      count: sessions.filter((s) => s.startedAt >= start && s.startedAt < end)
        .length,
    });
  }
  return out;
}

export interface ExerciseProgressPoint {
  date: number;
  topWeight: number;
  best1RM: number;
  volume: number;
  bestReps: number;
}

/** Per-session progression data for one exercise. */
export function exerciseProgression(
  sessions: WorkoutSession[],
  exerciseId: string,
): ExerciseProgressPoint[] {
  const estimate1RMFn = (w: number, r: number) =>
    w <= 0 || r <= 0 ? 0 : r === 1 ? w : w * (1 + r / 30);

  return sessions
    .map((s) => {
      const ex = s.exercises.find((e) => e.exerciseId === exerciseId);
      if (!ex || ex.sets.length === 0) return null;
      const completed = ex.sets.filter((st) => st.completedAt > 0);
      if (completed.length === 0) return null;
      return {
        date: s.startedAt,
        topWeight: Math.max(...completed.map((st) => st.weight)),
        best1RM: Math.max(...completed.map((st) => estimate1RMFn(st.weight, st.reps))),
        volume: exerciseVolume(completed),
        bestReps: Math.max(...completed.map((st) => st.reps)),
      } satisfies ExerciseProgressPoint;
    })
    .filter((p): p is ExerciseProgressPoint => p !== null)
    .sort((a, b) => a.date - b.date);
}

export function latestPRs(records: PersonalRecord[], limit = 5): PersonalRecord[] {
  return [...records]
    .sort((a, b) => b.date - a.date)
    .slice(0, limit);
}

/** Number of primary muscle groups to surface in the volume chart. */
export const VOLUME_CHART_GROUP_LIMIT = 6;

export interface MuscleVolumePoint {
  weekStart: number;
  [muscle: string]: number;
}

/**
 * Weekly volume (kg) broken down by primary muscle group for the last N weeks.
 * Only the highest-volume groups are included; unknown/custom-but-missing
 * exercises are skipped since we can't attribute them to a group.
 */
export function muscleVolumePerWeek(
  sessions: WorkoutSession[],
  exerciseById: Map<string, Exercise>,
  weeks = 8,
): MuscleVolumePoint[] {
  const now = new Date();
  const slots = new Map<number, Map<MuscleGroup, number>>();
  const totals = new Map<MuscleGroup, number>();

  for (let i = weeks - 1; i >= 0; i--) {
    const ws = startOfWeek(now);
    ws.setDate(ws.getDate() - i * 7);
    slots.set(ws.getTime(), new Map());
  }

  for (const s of sessions) {
    const slot = slots.get(startOfWeek(new Date(s.startedAt)).getTime());
    if (!slot) continue;
    for (const ex of s.exercises) {
      const def = exerciseById.get(ex.exerciseId);
      if (!def) continue;
      const vol = exerciseVolume(ex.sets);
      if (vol <= 0) continue;
      slot.set(def.muscleGroup, (slot.get(def.muscleGroup) ?? 0) + vol);
      totals.set(def.muscleGroup, (totals.get(def.muscleGroup) ?? 0) + vol);
    }
  }

  const groups = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, VOLUME_CHART_GROUP_LIMIT)
    .map(([g]) => g);

  return [...slots.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([weekStart, slot]) => {
      const row: MuscleVolumePoint = { weekStart };
      for (const g of groups) row[g] = Math.round(slot.get(g) ?? 0);
      return row;
    });
}
