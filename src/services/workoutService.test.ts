import { beforeEach, describe, it, expect } from "vitest";
import { finishWorkout } from "./workoutService";
import { getAllRecords } from "../db/records";
import { getSession } from "../db/sessions";
import { clearAllData } from "../db/records";
import type { WorkoutSession } from "../types";

function draftSession(overrides: Partial<WorkoutSession> = {}): WorkoutSession {
  return {
    id: "session-1",
    templateId: null,
    templateName: "Push Day",
    startedAt: Date.now() - 3_000_000,
    endedAt: null as unknown as number,
    prCount: 0,
    exercises: [
      {
        exerciseId: "ex-bench",
        name: "Bench Press",
        restSec: 90,
        targetSets: 3,
        sets: [
          { weight: 80, reps: 5, completedAt: Date.now() - 1000 },
          { weight: 82.5, reps: 5, completedAt: Date.now() },
          { weight: 70, reps: 8, completedAt: 0 }, // not completed
        ],
      },
    ],
    ...overrides,
  };
}

beforeEach(async () => {
  await clearAllData();
});

describe("finishWorkout", () => {
  it("persists the session with end time and set count", async () => {
    const draft = draftSession();
    const { session } = await finishWorkout(draft);
    expect(session.endedAt).toBeGreaterThan(0);
    const stored = await getSession(session.id);
    expect(stored).toBeDefined();
    expect(stored!.exercises[0].sets.filter((s) => s.completedAt > 0)).toHaveLength(2);
  });

  it("detects PRs on a first workout and stores them once per type", async () => {
    const draft = draftSession();
    const { newRecords, session } = await finishWorkout(draft);
    expect(session.prCount).toBe(newRecords.length);
    const types = newRecords.map((r) => r.type).sort();
    // best set is 82.5 × 5 → max-weight + best-1rm + best-set-volume
    expect(types).toEqual(["best-1rm", "best-set-volume", "max-weight"]);
    const stored = await getAllRecords();
    expect(stored).toHaveLength(3);
  });

  it("does not flag PRs that do not beat existing records", async () => {
    await finishWorkout(draftSession());
    // second workout, weaker sets
    const weaker = draftSession({
      id: "session-2",
      exercises: [
        {
          exerciseId: "ex-bench",
          name: "Bench Press",
          restSec: 90,
          targetSets: 1,
          sets: [{ weight: 75, reps: 5, completedAt: Date.now() }],
        },
      ],
    });
    const { newRecords } = await finishWorkout(weaker);
    expect(newRecords).toHaveLength(0);
  });

  it("detects only the improved record types on a second workout", async () => {
    await finishWorkout(draftSession());
    const stronger = draftSession({
      id: "session-3",
      exercises: [
        {
          exerciseId: "ex-bench",
          name: "Bench Press",
          restSec: 90,
          targetSets: 1,
          sets: [{ weight: 85, reps: 5, completedAt: Date.now() }],
        },
      ],
    });
    const { newRecords } = await finishWorkout(stronger);
    expect(newRecords.map((r) => r.type)).toContain("max-weight");
    expect(newRecords.map((r) => r.type)).toContain("best-1rm");
    expect(newRecords.map((r) => r.type)).toContain("best-set-volume");

    // PR history keeps one row per session per type; bests resolve to the newest max
    const { getBestRecords } = await import("../db/records");
    const best = await getBestRecords();
    const bestMaxWeight = best.filter(
      (r) => r.exerciseId === "ex-bench" && r.type === "max-weight",
    );
    expect(bestMaxWeight).toHaveLength(1);
    expect(bestMaxWeight[0].weight).toBe(85);
  });

  it("ignores empty sessions", async () => {
    const empty = draftSession({
      id: "session-4",
      exercises: [
        {
          exerciseId: "ex-bench",
          name: "Bench Press",
          restSec: 90,
          targetSets: 1,
          sets: [{ weight: 60, reps: 0, completedAt: 0 }],
        },
      ],
    });
    const { newRecords } = await finishWorkout(empty);
    expect(newRecords).toHaveLength(0);
  });
});
