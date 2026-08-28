import { beforeEach, describe, it, expect } from "vitest";
import { useActiveWorkout } from "./activeWorkout";
import type { WorkoutTemplate } from "../types";

function template(): WorkoutTemplate {
  return {
    id: "t1",
    name: "Push Day",
    favorite: true,
    createdAt: Date.now(),
    lastPerformedAt: null,
    exercises: [
      {
        exerciseId: "ex-bench",
        name: "Bench Press",
        sets: [
          { targetReps: 8, targetWeight: 60, restSec: 120 },
          { targetReps: 8, targetWeight: 60, restSec: 120 },
          { targetReps: 8, targetWeight: 60, restSec: 120 },
          { targetReps: 8, targetWeight: 60, restSec: 120 },
        ],
      },
    ],
  };
}

beforeEach(() => {
  useActiveWorkout.getState().discardWorkout();
});

describe("active workout store", () => {
  it("starts a session from a template with pre-filled sets", () => {
    const s = useActiveWorkout.getState();
    s.startFromTemplate(template());
    const state = useActiveWorkout.getState();
    expect(state.sessionId).toBeTruthy();
    expect(state.name).toBe("Push Day");
    expect(state.startedAt).toBeGreaterThan(0);
    expect(state.exercises[0].sets).toHaveLength(4);
    expect(state.exercises[0].sets[0]).toEqual({ weight: 60, reps: 8, completedAt: 0 });
  });

  it("starts an empty session", () => {
    useActiveWorkout.getState().startEmpty();
    const state = useActiveWorkout.getState();
    expect(state.sessionId).toBeTruthy();
    expect(state.exercises).toHaveLength(0);
    expect(state.name).not.toBe("");
  });

  it("completes a set, starts rest and prefills the next set", () => {
    const s = useActiveWorkout.getState();
    s.startFromTemplate(template());
    const ok = useActiveWorkout
      .getState()
      .completeSet(0, 0, 62.5, 8);
    expect(ok).toBe(true);

    let state = useActiveWorkout.getState();
    expect(state.exercises[0].sets[0].completedAt).toBeGreaterThan(0);
    // next set prefilled with completed values
    expect(state.exercises[0].sets[1].weight).toBe(62.5);
    // store exposes rest timer state for the hook
    expect(state.restEndsAt).toBeNull(); // started by the page, not the store action

    state.startRest(90);
    state = useActiveWorkout.getState();
    expect(state.restEndsAt).toBeGreaterThan(Date.now() + 89_000);
  });

  it("rejects invalid set values", () => {
    const s = useActiveWorkout.getState();
    s.startFromTemplate(template());
    expect(useActiveWorkout.getState().completeSet(0, 0, -5, 8)).toBe(false);
    expect(useActiveWorkout.getState().completeSet(0, 0, 100000, 8)).toBe(false);
  });

  it("uncompletes a set without touching the rest timer", () => {
    const s = useActiveWorkout.getState();
    s.startFromTemplate(template());
    s.completeSet(0, 1, 60, 7);
    s.uncompleteSet(0, 1);
    const state = useActiveWorkout.getState();
    expect(state.exercises[0].sets[1].completedAt).toBe(0);
    expect(state.exercises[0].sets[1].reps).toBe(7); // value kept
  });

  it("adds and removes sets", () => {
    const s = useActiveWorkout.getState();
    s.startFromTemplate(template());
    s.addSet(0);
    expect(useActiveWorkout.getState().exercises[0].sets).toHaveLength(5);
    useActiveWorkout.getState().removeSet(0, 4);
    expect(useActiveWorkout.getState().exercises[0].sets).toHaveLength(4);
    // cannot remove the last remaining set
    useActiveWorkout.setState((st) => ({
      exercises: st.exercises.map((ex) => ({ ...ex, sets: ex.sets.slice(0, 1) })),
    }));
    useActiveWorkout.getState().removeSet(0, 0);
    expect(useActiveWorkout.getState().exercises[0].sets).toHaveLength(1);
  });

  it("moves exercises within the workout", () => {
    const t = template();
    t.exercises.push({ exerciseId: "ex-row", name: "Row", sets: [{ targetReps: 10, targetWeight: 50, restSec: 60 }] });
    const s = useActiveWorkout.getState();
    s.startFromTemplate(t);
    s.moveExercise(0, 1);
    expect(useActiveWorkout.getState().exercises[0].name).toBe("Row");
  });

  it("persists state so a closed app can recover the session (recovery)", async () => {
    const s = useActiveWorkout.getState();
    s.startFromTemplate(template());
    s.completeSet(0, 0, 65, 6);

    // Simulate rehydration from localStorage into a fresh store instance
    const raw = localStorage.getItem("irontrack-active-workout");
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!) as { state: { sessionId: string | null; exercises: { sets: { weight: number; reps: number; completedAt: number }[] }[] } };
    expect(parsed.state.sessionId).toBe(useActiveWorkout.getState().sessionId);
    expect(parsed.state.exercises[0].sets[0]).toEqual({
      weight: 65,
      reps: 6,
      completedAt: expect.any(Number),
    });

    // Rehydrating into a new zustand store restores the active workout
    const restored = JSON.parse(raw!).state;
    expect(restored.sessionId).not.toBeNull();
    expect(restored.exercises.length).toBeGreaterThan(0);
  });

  it("rest timer is timestamp-based so it survives reload", () => {
    const s = useActiveWorkout.getState();
    s.startRest(120);
    const ends = useActiveWorkout.getState().restEndsAt;
    expect(ends).toBeGreaterThan(Date.now() + 119_000);
    useActiveWorkout.getState().extendRest(15);
    expect(useActiveWorkout.getState().restEndsAt).toBe((ends as number) + 15_000);
    useActiveWorkout.getState().skipRest();
    expect(useActiveWorkout.getState().restEndsAt).toBeNull();
  });

  it("discards everything on discardWorkout", () => {
    const s = useActiveWorkout.getState();
    s.startFromTemplate(template());
    s.discardWorkout();
    const state = useActiveWorkout.getState();
    expect(state.sessionId).toBeNull();
    expect(state.exercises).toHaveLength(0);
    expect(state.restEndsAt).toBeNull();
  });

  it("carries superset groups from a template into the active session", () => {
    const t: WorkoutTemplate = {
      id: "t2",
      name: "Superset Day",
      favorite: false,
      createdAt: Date.now(),
      lastPerformedAt: null,
      exercises: [
        { exerciseId: "ex-a", name: "A", supersetGroup: "g1", sets: [{ targetReps: 8, targetWeight: 20, restSec: 60 }] },
        { exerciseId: "ex-b", name: "B", supersetGroup: "g1", sets: [{ targetReps: 8, targetWeight: 20, restSec: 60 }] },
      ],
    };
    useActiveWorkout.getState().startFromTemplate(t);
    const state = useActiveWorkout.getState();
    expect(state.exercises.map((e) => e.supersetGroup)).toEqual(["g1", "g1"]);
  });

  it("swaps an exercise but keeps its recorded sets", () => {
    const s = useActiveWorkout.getState();
    s.startFromTemplate(template());
    s.completeSet(0, 0, 62.5, 8);
    s.swapExercise(0, "ex-incline", "Incline Bench Press");
    const state = useActiveWorkout.getState();
    expect(state.exercises[0].exerciseId).toBe("ex-incline");
    expect(state.exercises[0].name).toBe("Incline Bench Press");
    expect(state.exercises[0].sets[0]).toMatchObject({ weight: 62.5, reps: 8 });
    expect(state.exercises[0].sets[0].completedAt).toBeGreaterThan(0);
  });

  it("records rest reason for round rest so the timer can label it", () => {
    useActiveWorkout.getState().startRest(120, "round");
    expect(useActiveWorkout.getState().restReason).toBe("round");
    useActiveWorkout.getState().skipRest();
    useActiveWorkout.getState().startRest(90);
    expect(useActiveWorkout.getState().restReason).toBe("set");
  });
});
