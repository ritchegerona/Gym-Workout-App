import type { WorkoutTemplate } from "../types";
import { getDB } from "./db";

export async function getAllTemplates(): Promise<WorkoutTemplate[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex("templates", "by-created");
  return all.reverse(); // newest first
}

export async function getTemplate(id: string): Promise<WorkoutTemplate | undefined> {
  const db = await getDB();
  return db.get("templates", id);
}

export async function saveTemplate(t: WorkoutTemplate): Promise<void> {
  const db = await getDB();
  await db.put("templates", t);
}

export async function deleteTemplate(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("templates", id);
}
