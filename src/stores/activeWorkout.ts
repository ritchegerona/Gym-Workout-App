import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  SessionExercise,
  SetRecord,
  TemplateSetConfig,
  WorkoutTemplate,
} from "../types";

export type RestReason = "set" | "round";

interface ActiveWorkoutState {
  sessionId: string | null;
  templateId: string | null;
  name: string;
  startedAt: number | null;
  exercises: SessionExercise[];
  /** Rest timer: absolute end timestamp so it survives reloads/navigation. */
  restEndsAt: number | null;
  restDurationSec: number;
  restReason: RestReason;

  startFromTemplate: (t: WorkoutTemplate, restSec?: number) => void;
  startEmpty: (restSec?: number) => void;
  addExercises: (
    items: { exerciseId: string; name: string; config: TemplateSetConfig }[],
  ) => void;
  removeExercise: (exerciseId: string) => void;
  swapExercise: (exIdx: number, exerciseId: string, name: string) => void;
  moveExercise: (index: number, direction: -1 | 1) => void;

  updateSet: (exIdx: number, setIdx: number, patch: Partial<SetRecord>) => void;
  completeSet: (exIdx: number, setIdx: number, weight: number, reps: number) => boolean;
  uncompleteSet: (exIdx: number, setIdx: number) => void;
  addSet: (exIdx: number, fromSetIdx?: number) => void;
  removeSet: (exIdx: number, setIdx: number) => void;
  setRestForExercise: (exIdx: number, restSec: number) => void;

  startRest: (sec: number, reason?: RestReason) => void;
  extendRest: (sec: number) => void;
  skipRest: () => void;

  discardWorkout: () => void;
}

function emptySessionId(): string {
  return crypto.randomUUID();
}

function setsFromTemplate(sets: TemplateSetConfig[]): SetRecord[] {
  // Pre-fill with targets but not completed
  return sets.map((s) => ({
    weight: s.targetWeight,
    reps: s.targetReps,
    completedAt: 0,
  }));
}

export const useActiveWorkout = create<ActiveWorkoutState>()(
  persist(
    (set, get) => ({
      sessionId: null,
      templateId: null,
      name: "",
      startedAt: null,
      exercises: [],
      restEndsAt: null,
      restDurationSec: 0,
      restReason: "set",

      startFromTemplate: (t, restSec) => {
        const now = Date.now();
        set({
          sessionId: emptySessionId(),
          templateId: t.id,
          name: t.name,
          startedAt: now,
          exercises: t.exercises.map((e) => ({
            exerciseId: e.exerciseId,
            name: e.name,
            restSec: e.sets[0]?.restSec ?? restSec ?? 90,
            targetSets: e.sets.length,
            supersetGroup: e.supersetGroup ?? null,
            sets: setsFromTemplate(e.sets),
          })),
          restEndsAt: null,
          restDurationSec: 0,
          restReason: "set",
        });
      },

      startEmpty: () => {
        const now = Date.now();
        set({
          sessionId: emptySessionId(),
          templateId: null,
          name: new Date().toLocaleDateString(undefined, {
            weekday: "long",
          }),
          startedAt: now,
          exercises: [],
          restEndsAt: null,
          restDurationSec: 0,
          restReason: "set",
        });
      },

      addExercises: (items) =>
        set((s) => ({
          exercises: [
            ...s.exercises,
            ...items.map((it) => ({
              exerciseId: it.exerciseId,
              name: it.name,
              restSec: it.config.restSec,
              targetSets: 1,
              sets: [{ weight: it.config.targetWeight, reps: it.config.targetReps, completedAt: 0 }],
            })),
          ],
        })),

      removeExercise: (exerciseId) =>
        set((s) => ({
          exercises: s.exercises.filter((e) => e.exerciseId !== exerciseId),
        })),

      swapExercise: (exIdx, exerciseId, name) =>
        set((s) => ({
          exercises: s.exercises.map((ex, i) =>
            i === exIdx ? { ...ex, exerciseId, name } : ex,
          ),
        })),

      moveExercise: (index, direction) =>
        set((s) => {
          const next = [...s.exercises];
          const j = index + direction;
          if (j < 0 || j >= next.length) return s;
          [next[index], next[j]] = [next[j], next[index]];
          return { exercises: next };
        }),

      updateSet: (exIdx, setIdx, patch) =>
        set((s) => ({
          exercises: s.exercises.map((ex, i) =>
            i !== exIdx
              ? ex
              : {
                  ...ex,
                  sets: ex.sets.map((st, j) =>
                    j !== setIdx ? st : { ...st, ...patch },
                  ),
                },
          ),
        })),

      completeSet: (exIdx, setIdx, weight, reps) => {
        if (reps < 0 || reps > 999 || weight < 0 || weight > 10000) return false;
        const now = Date.now();
        const nextWeightForFollowing = weight;
        const nextRepsForFollowing = reps;
        set((s) => ({
          exercises: s.exercises.map((ex, i) =>
            i !== exIdx ? ex : {
              ...ex,
              sets: ex.sets.map((st, j) =>
                j === setIdx
                  ? { weight, reps, completedAt: now }
                  : st,
              ),
            },
          ),
        }));
        // Prefill the following set with the just-completed values
        const state = get();
        const ex = state.exercises[exIdx];
        if (!ex) return true;
        const following = ex.sets[setIdx + 1];
        if (following && following.completedAt === 0) {
          set((s) => ({
            exercises: s.exercises.map((e, i) =>
              i !== exIdx ? e : {
                ...e,
                sets: e.sets.map((st, j) =>
                  j === setIdx + 1
                    ? { ...st, weight: nextWeightForFollowing, reps: nextRepsForFollowing }
                    : st,
                ),
              },
            ),
          }));
        }
        return true;
      },

      uncompleteSet: (exIdx, setIdx) =>
        set((s) => ({
          exercises: s.exercises.map((ex, i) =>
            i !== exIdx
              ? ex
              : {
                  ...ex,
                  sets: ex.sets.map((st, j) =>
                    j === setIdx ? { ...st, completedAt: 0 } : st,
                  ),
                },
          ),
        })),

      addSet: (exIdx, fromSetIdx) =>
        set((s) => ({
          exercises: s.exercises.map((ex, i) => {
            if (i !== exIdx) return ex;
            const src =
              ex.sets[fromSetIdx ?? Math.max(0, ex.sets.length - 1)] ?? null;
            const lastCompleted = [...ex.sets]
              .reverse()
              .find((st) => st.completedAt > 0);
            return {
              ...ex,
              targetSets: ex.targetSets + 1,
              sets: [
                ...ex.sets,
                {
                  weight: lastCompleted?.weight ?? src?.weight ?? 0,
                  reps: lastCompleted?.reps ?? src?.reps ?? 0,
                  completedAt: 0,
                },
              ],
            };
          }),
        })),

      removeSet: (exIdx, setIdx) =>
        set((s) => ({
          exercises: s.exercises.map((ex, i) =>
            i !== exIdx || ex.sets.length <= 1
              ? ex
              : { ...ex, targetSets: Math.max(1, ex.targetSets - 1), sets: ex.sets.filter((_, j) => j !== setIdx) },
          ),
        })),

      setRestForExercise: (exIdx, restSec) =>
        set((s) => ({
          exercises: s.exercises.map((ex, i) =>
            i === exIdx ? { ...ex, restSec } : ex,
          ),
        })),

      startRest: (sec, reason) =>
        set({
          restEndsAt: Date.now() + sec * 1000,
          restDurationSec: sec,
          restReason: reason ?? "set",
        }),

      extendRest: (sec) =>
        set((s) => ({
          restEndsAt:
            s.restEndsAt === null
              ? Date.now() + sec * 1000
              : s.restEndsAt + sec * 1000,
          restDurationSec: s.restDurationSec + sec,
        })),

      skipRest: () => set({ restEndsAt: null, restDurationSec: 0 }),

      discardWorkout: () =>
        set({
          sessionId: null,
          templateId: null,
          name: "",
          startedAt: null,
          exercises: [],
          restEndsAt: null,
          restDurationSec: 0,
          restReason: "set",
        }),
    }),
    { name: "irontrack-active-workout" },
  ),
);
