import type { Exercise } from "../types";
import { SEED_EXERCISES } from "../data/exercises";
import { getDB } from "./db";

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
