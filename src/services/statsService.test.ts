import { describe, it, expect } from "vitest";
import {
  bodyWeightTrend,
  cardioThisWeek,
  computeStreak,
  computeWeeklySummary,
  exerciseProgression,
  muscleVolumePerWeek,
  workoutsPerWeek,
} from "./statsService";
import type { BodyWeightEntry, CardioEntry, Exercise, WorkoutSession } from "../types";

function cardio(daysAgo: number, durationMin: number): CardioEntry {
  return {
    id: `c-${daysAgo}-${durationMin}`,
    activity: "Run",
    durationMin,
    distanceKm: 5,
    date: Date.now() - daysAgo * 86_400_000,
  };
}

function bw(daysAgo: number, weightKg: number): BodyWeightEntry {
  return {
    id: `bw-${daysAgo}-${weightKg}`,
    date: Date.now() - daysAgo * 86_400_000,
    weightKg,
  };
}

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

describe("bodyWeightTrend", () => {
  it("returns chronological points, newest entry per day wins", () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayStart = today.getTime();
    const points = bodyWeightTrend(
      [
        { id: "bw-morning", date: dayStart + 8 * 3_600_000, weightKg: 82 },
        { id: "bw-evening", date: dayStart + 20 * 3_600_000, weightKg: 81.5 },
        bw(3, 83),
      ],
      4,
    );
    expect(points.map((p) => p.weightKg)).toEqual([83, 81.5]);
    expect(points[0].date).toBeLessThan(points[1].date);
  });

  it("drops entries older than the window", () => {
    const points = bodyWeightTrend([bw(0, 82), bw(60, 88)], 4);
    expect(points).toHaveLength(1);
    expect(points[0].weightKg).toBe(82);
  });

  it("returns an empty array for an empty log", () => {
    expect(bodyWeightTrend([])).toEqual([]);
  });
});

describe("cardioThisWeek", () => {
  it("sums minutes and counts sessions in the current week only", () => {
    const summary = cardioThisWeek([cardio(0, 30), cardio(1, 45), cardio(10, 60)]);
    expect(summary.sessions).toBe(2);
    expect(summary.minutes).toBe(75);
  });

  it("returns zeros for an empty log", () => {
    expect(cardioThisWeek([])).toEqual({ sessions: 0, minutes: 0 });
  });
});

describe("muscleVolumePerWeek", () => {
  const bench = { id: "ex-bench", name: "Bench", muscleGroup: "Chest" } as Exercise;
  const squat = { id: "ex-squat", name: "Squat", muscleGroup: "Legs" } as Exercise;
  const map = new Map([
    ["ex-bench", bench],
    ["ex-squat", squat],
  ]);

  it("attributes this week's volume to the right muscle groups", () => {
    const s = session(0, 60, 8);
    s.exercises.push({
      exerciseId: "ex-squat",
      name: "Squat",
      restSec: 90,
      targetSets: 1,
      sets: [{ weight: 100, reps: 5, completedAt: s.startedAt + 2000 }],
    });
    const rows = muscleVolumePerWeek([s], map, 1);
    expect(rows).toHaveLength(1);
    expect(rows[0].Chest).toBe(480);
    expect(rows[0].Legs).toBe(500);
  });

  it("skips weeks outside the requested window and unknown exercises", () => {
    const s = session(0);
    s.exercises[0].exerciseId = "ex-gone";
    const old = session(40);
    const rows = muscleVolumePerWeek([s, old], map, 1);
    expect(rows).toHaveLength(1);
    expect(rows[0].Chest).toBeUndefined();
  });
});
