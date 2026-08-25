import type { WorkoutSession } from "../types";
import { getDB } from "./db";

export async function saveSession(s: WorkoutSession): Promise<void> {
  const db = await getDB();
  await db.put("sessions", s);
}

export async function getSession(id: string): Promise<WorkoutSession | undefined> {
  const db = await getDB();
  return db.get("sessions", id);
}

export async function deleteSession(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("sessions", id);
}

/** All finished sessions, most recent first. */
export async function getFinishedSessions(): Promise<WorkoutSession[]> {
  const db = await getDB();
  const all = await db.getAll("sessions");
  return all
    .filter((s) => s.endedAt !== null)
    .sort((a, b) => b.startedAt - a.startedAt);
}

export async function getAllSessions(): Promise<WorkoutSession[]> {
  const db = await getDB();
  return db.getAll("sessions");
}
