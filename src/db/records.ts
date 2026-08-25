import type { PersonalRecord, PRType } from "../types";
import { getDB } from "./db";

export async function saveRecords(records: PersonalRecord[]): Promise<void> {
  if (records.length === 0) return;
  const db = await getDB();
  const tx = db.transaction("records", "readwrite");
  for (const r of records) await tx.store.put(r);
  await tx.done;
}

/** Newest first. */
export async function getAllRecords(): Promise<PersonalRecord[]> {
  const db = await getDB();
  return db.getAllFromIndex("records", "by-date");
}

export async function getRecordsForExercise(
  exerciseId: string,
  type?: PRType,
): Promise<PersonalRecord[]> {
  const all = await getAllRecords();
  return all.filter(
    (r) => r.exerciseId === exerciseId && (!type || r.type === type),
  );
}

function recordValue(r: PersonalRecord): number {
  switch (r.type) {
    case "max-weight":
      return r.weight;
    case "best-1rm":
      return r.estimated1RM;
    case "best-set-volume":
      return r.volume;
  }
}

/** Best record per exercise per type across history. */
export async function getBestRecords(): Promise<PersonalRecord[]> {
  const all = await getAllRecords();
  const best = new Map<string, PersonalRecord>();
  for (const r of all) {
    const key = `${r.exerciseId}:${r.type}`;
    const cur = best.get(key);
    if (!cur || recordValue(r) > recordValue(cur)) best.set(key, r);
  }
  return [...best.values()];
}

export async function clearAllData(): Promise<void> {
  const db = await getDB();
  await Promise.all([
    db.clear("exercises"),
    db.clear("templates"),
    db.clear("sessions"),
    db.clear("records"),
  ]);
}
