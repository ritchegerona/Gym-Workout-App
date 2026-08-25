import { beforeEach, describe, it, expect } from "vitest";
import {
  ensureExercisesSeeded,
  getAllExercises,
} from "../db/exercises";
import { saveTemplate, getTemplate } from "../db/templates";
import { getFinishedSessions, getSession } from "../db/sessions";
import { getAllRecords } from "../db/records";
import { finishWorkout } from "../services/workoutService";
import { useActiveWorkout } from "../stores/activeWorkout";
import type { WorkoutTemplate } from "../types";

beforeEach(async () => {
  await ensureExercisesSeeded();
  localStorage.clear();
  useActiveWorkout.getState().discardWorkout();
});

/**
 * End-to-end MVP flow:
 * create template → start workout → record sets → rest → finish →
 * history + PRs persisted.
 */
describe("core workout flow", () => {
  it("runs plan → train → finish → history", async () => {
    const exercises = await getAllExercises();
    expect(exercises.length).toBeGreaterThan(30);
    const bench = exercises.find((e) => e.name === "Bench Press")!;

    // 1. Plan: create a workout template
    const template: WorkoutTemplate = {
      id: crypto.randomUUID(),
      name: "Push Day",
      favorite: true,
      createdAt: Date.now(),
      lastPerformedAt: null,
      exercises: [
        {
          exerciseId: bench.id,
          name: bench.name,
          sets: [
            { targetReps: 8, targetWeight: 60, restSec: 90 },
            { targetReps: 8, targetWeight: 60, restSec: 90 },
          ],
        },
      ],
    };
    await saveTemplate(template);
    expect((await getTemplate(template.id))?.name).toBe("Push Day");

    // 2. Train: start session from the template and log sets
    const store = useActiveWorkout.getState();
    store.startFromTemplate(await getTemplate(template.id).then((t) => t!));
    let active = useActiveWorkout.getState();
    expect(active.exercises[0].sets[0].weight).toBe(60);

    active.completeSet(0, 0, 60, 8);
    useActiveWorkout.getState().startRest(90);
    active = useActiveWorkout.getState();
    expect(active.restEndsAt).not.toBeNull();

    active.completeSet(0, 1, 62.5, 6);

    // 3. Finish the workout
    const state = useActiveWorkout.getState();
    const draft = {
      id: state.sessionId!,
      templateId: state.templateId,
      templateName: state.templateId ? state.name : null,
      startedAt: state.startedAt!,
      exercises: state.exercises.map((ex) => ({
        ...ex,
        sets: ex.sets.filter((st) => st.completedAt > 0),
      })),
    };
    const { session, newRecords } = await finishWorkout(draft);

    // first ever workout → PRs for weight, 1RM and volume
    expect(newRecords.length).toBe(3);
    expect(session.prCount).toBe(3);

    // 4. History contains the finished workout with full set data
    const history = await getFinishedSessions();
    expect(history).toHaveLength(1);
    const stored = await getSession(session.id);
    expect(stored!.exercises[0].sets.map((s) => `${s.weight}x${s.reps}`)).toEqual([
      "60x8",
      "62.5x6",
    ]);

    // 5. Records are queryable
    const records = await getAllRecords();
    expect(records.filter((r) => r.exerciseId === bench.id)).toHaveLength(3);
  });

  it("recovers an interrupted workout after app restart", async () => {
    // Simulate mid-workout persistence (zustand persist writes on every change)
    const store = useActiveWorkout.getState();
    store.startEmpty();
    store.addExercises([
      {
        exerciseId: "ex-squat-id",
        name: "Squat",
        config: { targetReps: 5, targetWeight: 100, restSec: 120 },
      },
    ]);
    useActiveWorkout.getState().completeSet(0, 0, 100, 5);

    // Simulate restart: read persisted snapshot
    const raw = localStorage.getItem("irontrack-active-workout")!;
    const snapshot = JSON.parse(raw);
    expect(snapshot.state.sessionId).toBeTruthy();
    expect(snapshot.state.exercises[0].name).toBe("Squat");
    expect(snapshot.state.exercises[0].sets[0].completedAt).toBeGreaterThan(0);
  });
});
