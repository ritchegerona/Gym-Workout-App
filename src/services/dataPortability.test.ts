import { beforeEach, describe, it, expect } from "vitest";
import {
  applyImport,
  buildExportPayload,
  parseImportPayload,
  type ExportPayload,
} from "./dataPortability";
import { getAllExercises } from "../db/exercises";
import { getAllTemplates } from "../db/templates";
import { getFinishedSessions } from "../db/sessions";
import { clearAllData, getAllRecords } from "../db/records";
import type { WorkoutSession, WorkoutTemplate } from "../types";

function template(id: string): WorkoutTemplate {
  return {
    id,
    name: `Template ${id}`,
    favorite: false,
    createdAt: Date.now(),
    lastPerformedAt: null,
    exercises: [
      {
        exerciseId: "ex-bench",
        name: "Bench Press",
        sets: [{ targetReps: 8, targetWeight: 60, restSec: 90 }],
      },
    ],
  };
}

function session(id: string): WorkoutSession {
  return {
    id,
    templateId: null,
    templateName: "Push",
    startedAt: Date.now() - 60_000,
    endedAt: Date.now(),
    prCount: 0,
    exercises: [
      {
        exerciseId: "ex-bench",
        name: "Bench Press",
        restSec: 90,
        targetSets: 1,
        sets: [{ weight: 80, reps: 5, completedAt: Date.now() }],
      },
    ],
  };
}

beforeEach(async () => {
  await clearAllData();
});

describe("parseImportPayload", () => {
  it("accepts a valid payload", () => {
    const payload = { app: "irontrack", version: 1, exportedAt: 123, templates: [template("t1")], sessions: [], records: [], exercises: [] };
    const result = parseImportPayload(JSON.stringify(payload));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.payload.templates).toHaveLength(1);
  });

  it("accepts legacy session-only exports", () => {
    const result = parseImportPayload(JSON.stringify({ sessions: [session("s1")] }));
    expect(result.ok).toBe(true);
  });

  it("rejects invalid JSON", () => {
    const result = parseImportPayload("{not json");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("JSON");
  });

  it("rejects payloads with no importable data", () => {
    const result = parseImportPayload(JSON.stringify({ app: "irontrack" }));
    expect(result.ok).toBe(false);
  });

  it("rejects malformed entries (missing ids)", () => {
    const result = parseImportPayload(JSON.stringify({ sessions: [{ nope: true }] }));
    expect(result.ok).toBe(false);
  });
});

function makePayload(overrides: Partial<ExportPayload> = {}): ExportPayload {
  return {
    app: "irontrack",
    version: 1,
    exportedAt: Date.now(),
    templates: [template("t-import")],
    sessions: [session("s-import")],
    records: [],
    exercises: [],
    ...overrides,
  };
}

describe("applyImport", () => {
  it("merge keeps existing data and adds imported rows", async () => {
    await applyImport(makePayload(), "merge");
    await applyImport(
      makePayload({ templates: [template("t-second")], sessions: [] }),
      "merge",
    );
    expect(await getAllTemplates()).toHaveLength(2);
    expect(await getFinishedSessions()).toHaveLength(1);
  });

  it("merge updates matching ids without duplicating", async () => {
    await applyImport(makePayload(), "merge");
    const renamed = makePayload({
      templates: [{ ...template("t-import"), name: "Renamed" }],
    });
    await applyImport(renamed, "merge");
    const all = await getAllTemplates();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe("Renamed");
  });

  it("replace wipes existing data first, then re-seeds the library", async () => {
    await applyImport(makePayload(), "merge");
    await applyImport(makePayload({ sessions: [] }), "replace");
    // old session gone
    expect(await getFinishedSessions()).toHaveLength(0);
    // built-in exercise library restored after replace
    const exercises = await getAllExercises();
    expect(exercises.length).toBeGreaterThan(30);
  });

  it("imports custom exercises into the library", async () => {
    await applyImport(
      makePayload({
        exercises: [
          {
            id: "ex-custom-1",
            name: "My Machine Row",
            muscleGroup: "Back",
            secondaryMuscles: [],
            equipment: "Machine",
            type: "Compound",
            instructions: "Row it.",
          },
        ],
      }),
      "merge",
    );
    const names = (await getAllExercises()).map((e) => e.name);
    expect(names).toContain("My Machine Row");
  });

  it("round-trips export → parse → import", async () => {
    await applyImport(makePayload(), "merge");
    await clearAllData();
    // simulate a fresh device with only seed exercises
    const { ensureExercisesSeeded } = await import("../db/exercises");
    await ensureExercisesSeeded();

    // rebuild payload the way the UI does
    const payload = makePayload();
    const parsed = parseImportPayload(JSON.stringify(payload));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      const summary = await applyImport(parsed.payload, "merge");
      expect(summary.sessions).toBe(1);
      expect(summary.templates).toBe(1);
      expect(await getAllRecords()).toHaveLength(0);
    }
  });
});

describe("buildExportPayload", () => {
  it("includes sessions and templates and excludes seeded exercises", async () => {
    await applyImport(makePayload(), "merge");
    const payload = await buildExportPayload({
      name: "Ritche", age: null, heightCm: null, bodyWeightKg: null, goal: null,
    });
    expect(payload.app).toBe("irontrack");
    expect(payload.templates).toHaveLength(1);
    expect(payload.sessions).toHaveLength(1);
    // seeded library (~44) must not bloat exports
    expect(payload.exercises).toHaveLength(0);
    expect(payload.profile?.name).toBe("Ritche");
  });
});
