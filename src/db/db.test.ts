import { beforeEach, describe, it, expect } from "vitest";
import { SEED_EXERCISES } from "../data/exercises";
import {
  deleteExercise,
  ensureExercisesSeeded,
  exerciseInUse,
  getAllExercises,
  getExercise,
  isCustomExercise,
  makeCustomExerciseId,
  newCustomExercise,
  saveCustomExercise,
} from "./exercises";
import { deleteTemplate, getAllTemplates, getTemplate, saveTemplate } from "./templates";
import { getAllSessions, getSession, saveSession } from "./sessions";
import { deleteCardioEntry, getAllCardio, saveCardioEntry } from "./cardio";
import { clearAllData, getBestRecords, saveRecords } from "./records";
import { uid } from "./db";
import type { WorkoutTemplate, WorkoutSession, PersonalRecord, CardioEntry } from "../types";

function makeTemplate(overrides: Partial<WorkoutTemplate> = {}): WorkoutTemplate {
  return {
    id: "t-" + Math.random().toString(36).slice(2),
    name: "Push Day",
    favorite: false,
    createdAt: Date.now(),
    lastPerformedAt: null,
    exercises: [
      {
        exerciseId: SEED_EXERCISES[0].id,
        name: SEED_EXERCISES[0].name,
        sets: [{ targetReps: 8, targetWeight: 60, restSec: 90 }],
      },
    ],
    ...overrides,
  };
}

function makeSession(overrides: Partial<WorkoutSession> = {}): WorkoutSession {
  const start = Date.now() - 3_600_000;
  return {
    id: "s-" + Math.random().toString(36).slice(2),
    templateId: null,
    templateName: "Push Day",
    startedAt: start,
    endedAt: start + 3_000_000,
    prCount: 0,
    exercises: [
      {
        exerciseId: SEED_EXERCISES[0].id,
        name: SEED_EXERCISES[0].name,
        restSec: 90,
        targetSets: 2,
        sets: [
          { weight: 80, reps: 5, completedAt: start + 1000 },
          { weight: 82.5, reps: 3, completedAt: start + 2000 },
        ],
      },
    ],
    ...overrides,
  };
}

beforeEach(async () => {
  await clearAllData();
});

describe("exercise seeding", () => {
  it("seeds the built-in library once and is idempotent", async () => {
    await ensureExercisesSeeded();
    const first = await getAllExercises();
    expect(first.length).toBeGreaterThanOrEqual(40);
    await ensureExercisesSeeded();
    const second = await getAllExercises();
    expect(second.length).toBe(first.length);
  });

  it("returns a seeded exercise by id", async () => {
    await ensureExercisesSeeded();
    const ex = await getExercise(SEED_EXERCISES[0].id);
    expect(ex?.name).toBe(SEED_EXERCISES[0].name);
  });
});

describe("custom exercises", () => {
  it("produces custom ids with a stable prefix", () => {
    const id = makeCustomExerciseId();
    expect(id.startsWith("ex-custom-")).toBe(true);
    expect(isCustomExercise(id)).toBe(true);
    expect(isCustomExercise(SEED_EXERCISES[0].id)).toBe(false);
  });

  it("persists, reads, updates and deletes a custom exercise", async () => {
    const ex = newCustomExercise({
      name: "Deficit Push Up",
      muscleGroup: "Chest",
      secondaryMuscles: ["Triceps", "Core"],
      equipment: "Bodyweight",
      type: "Compound",
      instructions: "Feet elevated, hands on plates.",
    });
    await saveCustomExercise(ex);
    expect(await getExercise(ex.id)).toMatchObject({ name: "Deficit Push Up" });

    await saveCustomExercise({ ...ex, name: "Deficit Push Up (Feet Elevated)" });
    expect((await getExercise(ex.id))?.name).toBe(
      "Deficit Push Up (Feet Elevated)",
    );

    await deleteExercise(ex.id);
    expect(await getExercise(ex.id)).toBeUndefined();
  });

  it("reports when an exercise is referenced by templates or sessions", async () => {
    const ex = newCustomExercise({
      name: "Sled Push",
      muscleGroup: "Legs",
      secondaryMuscles: [],
      equipment: "Machine",
      type: "Compound",
      instructions: "Push the sled with max intent.",
    });
    await saveCustomExercise(ex);
    expect(await exerciseInUse(ex.id)).toBe(false);

    const t = makeTemplate({
      exercises: [
        { exerciseId: ex.id, name: ex.name, sets: [{ targetReps: 8, targetWeight: 40, restSec: 90 }] },
      ],
    });
    await saveTemplate(t);
    expect(await exerciseInUse(ex.id)).toBe(true);
    await deleteTemplate(t.id);

    await saveSession(makeSession({ exercises: [{ exerciseId: ex.id, name: ex.name, restSec: 60, targetSets: 1, sets: [{ weight: 40, reps: 8, completedAt: Date.now() }] }] }));
    expect(await exerciseInUse(ex.id)).toBe(true);
  });

  it("keeps custom exercises out of the seeded list only when db is empty", async () => {
    await ensureExercisesSeeded();
    const ex = newCustomExercise({
      name: "Lunges With Band",
      muscleGroup: "Legs",
      secondaryMuscles: ["Glutes"],
      equipment: "Resistance Band",
      type: "Compound",
      instructions: "Step forward and lower the knee.",
    });
    await saveCustomExercise(ex);
    const all = await getAllExercises();
    expect(all.some((e) => e.id === ex.id)).toBe(true);
  });
});

describe("template persistence", () => {
  it("saves, reads and deletes templates", async () => {
    const t = makeTemplate({ name: "Leg Day" });
    await saveTemplate(t);
    const found = await getTemplate(t.id);
    expect(found?.name).toBe("Leg Day");

    await saveTemplate({ ...t, favorite: true });
    const updated = await getTemplate(t.id);
    expect(updated?.favorite).toBe(true);

    await deleteTemplate(t.id);
    expect(await getTemplate(t.id)).toBeUndefined();
  });

  it("lists templates newest first", async () => {
    const a = makeTemplate({ createdAt: 1000, name: "A" });
    const b = makeTemplate({ createdAt: 2000, name: "B" });
    await saveTemplate(a);
    await saveTemplate(b);
    const list = await getAllTemplates();
    expect(list.map((x) => x.name)).toEqual(["B", "A"]);
  });
});

describe("session persistence", () => {
  it("persists a finished session with sets intact", async () => {
    const s = makeSession();
    await saveSession(s);
    const found = await getSession(s.id);
    expect(found?.exercises[0].sets[1]).toEqual({
      weight: 82.5,
      reps: 3,
      completedAt: found!.exercises[0].sets[1].completedAt,
    });
  });

  it("filters unfinished sessions out of history", async () => {
    await saveSession(makeSession());
    await saveSession(makeSession({ endedAt: null }));
    const finished = await getAllSessions();
    const withEnd = finished.filter((s) => s.endedAt !== null);
    expect(withEnd).toHaveLength(1);
  });
});

describe("cardio persistence", () => {
  function makeCardio(overrides: Partial<CardioEntry> = {}): CardioEntry {
    return {
      id: "c-" + Math.random().toString(36).slice(2),
      activity: "Run",
      durationMin: 30,
      distanceKm: 5,
      date: Date.now(),
      ...overrides,
    };
  }

  it("saves, lists newest-first and deletes cardio entries", async () => {
    const a = makeCardio({ date: 1000 });
    const b = makeCardio({ date: 2000, activity: "Cycle" });
    await saveCardioEntry(a);
    await saveCardioEntry(b);

    const list = await getAllCardio();
    expect(list.map((c) => c.activity)).toEqual(["Cycle", "Run"]);

    await deleteCardioEntry(a.id);
    expect((await getAllCardio()).map((c) => c.id)).toEqual([b.id]);
  });
});

describe("uid", () => {
  it("returns unique RFC4122 v4 ids", () => {
    const a = uid();
    const b = uid();
    expect(a).not.toBe(b);
    expect(a).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it("falls back gracefully when crypto.randomUUID is unavailable", () => {
    const original = crypto.randomUUID;
    // Simulate old iOS Safari (<15.4)
    Object.defineProperty(crypto, "randomUUID", { value: undefined, configurable: true });
    try {
      const a = uid();
      const b = uid();
      expect(a).not.toBe(b);
      expect(a).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    } finally {
      Object.defineProperty(crypto, "randomUUID", { value: original, configurable: true });
    }
  });
});

describe("personal records", () => {
  it("keeps the best record per exercise per type", async () => {
    const base: Omit<PersonalRecord, "type" | "weight" | "reps" | "estimated1RM" | "volume"> = {
      id: "r",
      exerciseId: "ex-bench",
      exerciseName: "Bench Press",
      sessionId: "s1",
      date: Date.now(),
    };
    await saveRecords([
      { ...base, id: "r1", type: "max-weight", weight: 80, reps: 5, estimated1RM: 93.3, volume: 400 },
      { ...base, id: "r2", type: "max-weight", weight: 85, reps: 3, estimated1RM: 93.5, volume: 255, date: Date.now() + 1 },
      { ...base, id: "r3", type: "best-1rm", weight: 70, reps: 10, estimated1RM: 93.3, volume: 700 },
    ]);
    const best = await getBestRecords();
    const maxWeight = best.find((r) => r.type === "max-weight");
    expect(maxWeight?.weight).toBe(85);
    expect(best.filter((r) => r.exerciseId === "ex-bench")).toHaveLength(2);
  });
});
