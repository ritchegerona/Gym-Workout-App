import type {
  Exercise,
  PersonalRecord,
  UserProfile,
  WorkoutSession,
  WorkoutTemplate,
} from "../types";
import { getAllExercises } from "../db/exercises";
import { getAllTemplates, saveTemplate } from "../db/templates";
import { getAllSessions, saveSession } from "../db/sessions";
import { clearAllData, getAllRecords, saveRecords } from "../db/records";

export interface ExportPayload {
  app: "irontrack";
  version: 1;
  exportedAt: number;
  templates: WorkoutTemplate[];
  sessions: WorkoutSession[];
  records: PersonalRecord[];
  exercises: Exercise[];
  profile?: UserProfile;
}

export interface ImportSummary {
  templates: number;
  sessions: number;
  records: number;
  exercises: number;
}

export type ImportMode = "merge" | "replace";

export async function buildExportPayload(
  profile: UserProfile,
): Promise<ExportPayload> {
  const [templates, sessions, records, exercises] = await Promise.all([
    getAllTemplates(),
    getAllSessions(),
    getAllRecords(),
    getAllExercises(),
  ]);
  // Only include user-created exercises in exports (seeded ones ship with the app)
  const customExercises = exercises.filter((e) => e.id.startsWith("ex-custom-"));
  return {
    app: "irontrack",
    version: 1,
    exportedAt: Date.now(),
    templates,
    sessions,
    records,
    exercises: customExercises,
    profile,
  };
}

export function downloadExport(payload: ExportPayload): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `irontrack-export-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

type ParseResult =
  | { ok: true; payload: ExportPayload }
  | { ok: false; error: string };

export function parseImportPayload(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "This file is not valid JSON." };
  }
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: "Unexpected file format." };
  }
  const obj = raw as Record<string, unknown>;

  // Accept both full payloads and legacy session-only exports
  const arr = (key: string): unknown[] =>
    Array.isArray(obj[key]) ? (obj[key] as unknown[]) : [];

  const templates = arr("templates");
  const sessions = arr("sessions");
  const records = arr("records");
  const exercises = arr("exercises");

  const hasAny =
    templates.length > 0 ||
    sessions.length > 0 ||
    records.length > 0 ||
    exercises.length > 0;
  if (!hasAny) {
    return {
      ok: false,
      error: "No workouts, templates or records found in this file.",
    };
  }

  const badShape = !isStringIdArray(templates, "id") ||
    !isStringIdArray(sessions, "id") ||
    !isStringIdArray(records, "id") ||
    !isStringIdArray(exercises, "id");
  if (badShape) {
    return { ok: false, error: "Some entries are malformed and can't be imported." };
  }

  return {
    ok: true,
    payload: {
      app: "irontrack",
      version: 1,
      exportedAt: typeof obj.exportedAt === "number" ? obj.exportedAt : Date.now(),
      templates: templates as WorkoutTemplate[],
      sessions: sessions as WorkoutSession[],
      records: records as PersonalRecord[],
      exercises: exercises as Exercise[],
      profile:
        typeof obj.profile === "object" && obj.profile !== null
          ? (obj.profile as UserProfile)
          : undefined,
    },
  };
}

function isStringIdArray(items: unknown[], key: string): boolean {
  return items.every(
    (item) =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as Record<string, unknown>)[key] === "string",
  );
}

/** Insert payload contents into IndexedDB. Returns per-store counts written. */
export async function applyImport(
  payload: ExportPayload,
  mode: ImportMode,
): Promise<ImportSummary> {
  if (mode === "replace") {
    await clearAllData();
  }
  if (mode === "replace") {
    // Re-seed built-ins first so the library is never empty
    const { ensureExercisesSeeded } = await import("../db/exercises");
    await ensureExercisesSeeded();
  }
  // Upserts by id make merges idempotent
  for (const t of payload.templates ?? []) await saveTemplate(t);
  for (const s of payload.sessions ?? []) await saveSession(s);
  await saveRecords(payload.records ?? []);

  let exerciseCount = 0;
  if (payload.exercises?.length) {
    const { saveCustomExercise } = await import("../db/exercises");
    for (const ex of payload.exercises) {
      await saveCustomExercise(ex);
      exerciseCount++;
    }
  }

  return {
    templates: payload.templates?.length ?? 0,
    sessions: payload.sessions?.length ?? 0,
    records: payload.records?.length ?? 0,
    exercises: exerciseCount,
  };
}
