import type { WorkoutSession, PersonalRecord } from "../types";
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
