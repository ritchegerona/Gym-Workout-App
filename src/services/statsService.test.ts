import { describe, it, expect } from "vitest";
import {
  computeStreak,
  computeWeeklySummary,
  exerciseProgression,
  workoutsPerWeek,
} from "./statsService";
import type { WorkoutSession } from "../types";

function session(daysAgo: number, weight = 60, reps = 8): WorkoutSession {
  const start = Date.now() - daysAgo * 86_400_000;
  return {
    id: `s-${daysAgo}-${Math.random()}`,
    templateId: null,
    templateName: "Push",
    startedAt: start,
    endedAt: start + 3_600_000,
    prCount: 0,
    exercises: [
      {
        exerciseId: "ex-bench",
        name: "Bench Press",
        restSec: 90,
        targetSets: 1,
        sets: [{ weight, reps, completedAt: start + 1000 }],
      },
    ],
  };
}

describe("computeWeeklySummary", () => {
  it("counts only this week's workouts", () => {
    const summary = computeWeeklySummary([session(0), session(1), session(10)]);
    expect(summary.workouts).toBe(2);
    expect(summary.totalVolume).toBe((60 * 8) * 2);
    expect(summary.totalDurationMs).toBeCloseTo(7_200_000, -3);
  });
});

describe("computeStreak", () => {
  it("counts consecutive days including today", () => {
    const streak = computeStreak([session(0), session(1), session(2), session(5)]);
    expect(streak).toBe(3);
  });
  it("stays alive when trained yesterday but not today", () => {
    const streak = computeStreak([session(1), session(2)]);
    expect(streak).toBe(2);
  });
  it("returns zero with no recent training", () => {
    expect(computeStreak([session(10)])).toBe(0);
    expect(computeStreak([])).toBe(0);
  });
});

describe("workoutsPerWeek", () => {
  it("buckets sessions into weeks", () => {
    const buckets = workoutsPerWeek([session(0), session(1), session(20)], 4);
    expect(buckets).toHaveLength(4);
    // last bucket (current week) has 2
    expect(buckets[3].count).toBe(2);
    expect(buckets.reduce((n, b) => n + b.count, 0)).toBeGreaterThanOrEqual(2);
  });
});

describe("exerciseProgression", () => {
  it("produces chronological points per session", () => {
    const pts = exerciseProgression(
      [session(2, 70, 8), session(1, 75, 6), session(0, 80, 5)],
      "ex-bench",
    );
    expect(pts).toHaveLength(3);
    expect(pts.map((p) => p.topWeight)).toEqual([70, 75, 80]);
    expect(pts[2].best1RM).toBeCloseTo(80 * (1 + 5 / 30), 1);
    expect(pts[2].volume).toBe(400);
  });

  it("skips sessions without the exercise or completed sets", () => {
    const other = session(0);
    other.exercises[0].exerciseId = "ex-squat";
    const empty = session(1);
    empty.exercises[0].sets[0].completedAt = 0;
    const pts = exerciseProgression([other, empty], "ex-bench");
    expect(pts).toHaveLength(0);
  });
});
