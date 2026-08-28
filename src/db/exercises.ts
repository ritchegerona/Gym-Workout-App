import type { Exercise, WorkoutSession, WorkoutTemplate } from "../types";
import { SEED_EXERCISES } from "../data/exercises";
import { getAllTemplates } from "./templates";
import { getAllSessions } from "./sessions";
import { getDB, uid } from "./db";

const CUSTOM_PREFIX = "ex-custom-";

export function isCustomExercise(id: string): boolean {
  return id.startsWith(CUSTOM_PREFIX);
}

export function makeCustomExerciseId(): string {
  return `${CUSTOM_PREFIX}${uid()}`;
}

/** Build a fresh, unsaved custom exercise with a stable custom id. */
export function newCustomExercise(ex: Omit<Exercise, "id">): Exercise {
  return { ...ex, id: makeCustomExerciseId() };
}

export async function getAllExercises(): Promise<Exercise[]> {
  try {
    const db = await getDB();
    return await db.getAllFromIndex("exercises", "by-name");
  } catch {
    // Fallback so the library still works if IDB is unavailable
    return [...SEED_EXERCISES].sort((a, b) => a.name.localeCompare(b.name));
  }
}

export async function getExercise(id: string): Promise<Exercise | undefined> {
  const db = await getDB();
  return db.get("exercises", id);
}

/** Upsert a user-created exercise into the library. */
export async function saveCustomExercise(exercise: Exercise): Promise<void> {
  const db = await getDB();
  await db.put("exercises", exercise);
}

export async function deleteExercise(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("exercises", id);
}

/** True when a template or finished session still references this exercise. */
export async function exerciseInUse(id: string): Promise<boolean> {
  const [templates, sessions]: [WorkoutTemplate[], WorkoutSession[]] =
    await Promise.all([getAllTemplates(), getAllSessions()]);
  return templates.some((t) =>
    t.exercises.some((e) => e.exerciseId === id),
  ) || sessions.some((s) => s.exercises.some((e) => e.exerciseId === id));
}

/** Seeds the exercise library once. Safe to call on every startup. */
export async function ensureExercisesSeeded(): Promise<void> {
  try {
    const db = await getDB();
    const count = await db.count("exercises");
    if (count === 0) {
      const tx = db.transaction("exercises", "readwrite");
      for (const ex of SEED_EXERCISES) await tx.store.put(ex);
      await tx.done;
    }
  } catch {
    // non-fatal: app falls back to in-memory seed data
  }
}
