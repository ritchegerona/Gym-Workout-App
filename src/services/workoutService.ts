import type {
  PersonalRecord,
  SessionExercise,
  SetRecord,
  WorkoutSession,
} from "../types";
import { detectSetPRs, estimate1RM, setVolume } from "../utils/calculations";
import { getAllRecords, saveRecords } from "../db/records";
import { saveSession } from "../db/sessions";
import { getTemplate } from "../db/templates";
import { uid } from "../db/db";

export interface FinishedSessionResult {
  session: WorkoutSession;
  newRecords: PersonalRecord[];
}

/** Build a fresh session object from a template (not yet persisted). */
export async function buildSessionFromTemplate(
  templateId: string,
): Promise<WorkoutSession | null> {
  const t = await getTemplate(templateId);
  if (!t) return null;
  return createSessionObject(t.id, t.name, t.exercises.map((e) => ({
    exerciseId: e.exerciseId,
    name: e.name,
    restSec: e.sets[0]?.restSec ?? 90,
    targetSets: e.sets.length,
    sets: e.sets.map((s) => ({
      weight: s.targetWeight,
      reps: s.targetReps,
      completedAt: 0,
    })),
  })));
}

export function createSessionObject(
  templateId: string | null,
  name: string,
  exercises: SessionExercise[],
): WorkoutSession {
  return {
    id: uid(),
    templateId,
    templateName: name || null,
    startedAt: Date.now(),
    endedAt: null,
    exercises,
    prCount: 0,
  };
}

/**
 * Finish a session: detect PRs per exercise against all-time bests
 * (excluding this session), persist records and the finished session.
 */
export async function finishWorkout(
  draft: Omit<WorkoutSession, "endedAt" | "prCount"> & {
    endedAt?: number | null;
    prCount?: number;
  },
): Promise<FinishedSessionResult> {
  const priorRecords = await getAllRecords();
  const bests = new Map<string, { weight: number; oneRm: number; setVol: number }>();
  for (const r of priorRecords) {
    const cur = bests.get(r.exerciseId) ?? { weight: 0, oneRm: 0, setVol: 0 };
    cur.weight = Math.max(cur.weight, r.type === "max-weight" ? r.weight : 0);
    cur.oneRm = Math.max(cur.oneRm, r.estimated1RM);
    cur.setVol = Math.max(cur.setVol, r.volume);
    bests.set(r.exerciseId, cur);
  }

  // Also consider history inside sessions in case records were never written
  void priorRecords;

  const newRecords: PersonalRecord[] = [];

  for (const ex of draft.exercises) {
    const prev = bests.get(ex.exerciseId) ?? { weight: 0, oneRm: 0, setVol: 0 };
    for (const st of ex.sets) {
      if (!isCompleted(st)) continue;
      const prs = detectSetPRs(st, prev.weight, prev.oneRm, prev.setVol);
      for (const pr of prs) {
        // Only keep the single best set per type per exercise within this session
        const existingIdx = newRecords.findIndex(
          (r) => r.exerciseId === ex.exerciseId && r.type === pr.type,
        );
        const candidate: PersonalRecord = {
          id: uid(),
          exerciseId: ex.exerciseId,
          exerciseName: ex.name,
          type: pr.type,
          weight: st.weight,
          reps: st.reps,
          estimated1RM: estimate1RM(st.weight, st.reps),
          volume: setVolume(st.weight, st.reps),
          sessionId: draft.id,
          date: draft.startedAt,
        };
        if (existingIdx >= 0) {
          const cur = newRecords[existingIdx];
          if (prValue(pr.type, candidate) > prValue(pr.type, cur)) {
            newRecords[existingIdx] = candidate;
          }
        } else {
          newRecords.push(candidate);
        }
        // update running best so later sets compare correctly
        prev.weight = Math.max(prev.weight, candidate.type === "max-weight" ? candidate.weight : 0);
        prev.oneRm = Math.max(prev.oneRm, candidate.estimated1RM);
        prev.setVol = Math.max(prev.setVol, candidate.volume);
      }
    }
  }

  await saveRecords(newRecords);

  const session: WorkoutSession = {
    ...draft,
    endedAt: draft.endedAt ?? Date.now(),
    prCount: newRecords.length,
  };
  await saveSession(session);
  return { session, newRecords };
}

function isCompleted(s: SetRecord): boolean {
  return s.completedAt > 0 && (s.reps > 0 || s.weight > 0);
}

function prValue(type: PersonalRecord["type"], r: PersonalRecord): number {
  switch (type) {
    case "max-weight":
      return r.weight;
    case "best-1rm":
      return r.estimated1RM;
    case "best-set-volume":
      return r.volume;
  }
}
