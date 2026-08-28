import type { CardioEntry } from "../types";
import { getDB } from "./db";

export async function saveCardioEntry(e: CardioEntry): Promise<void> {
  const db = await getDB();
  await db.put("cardioEntries", e);
}

export async function deleteCardioEntry(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("cardioEntries", id);
}

/** All cardio entries, most recent first. */
export async function getAllCardio(): Promise<CardioEntry[]> {
  const db = await getDB();
  return db.getAllFromIndex("cardioEntries", "by-date").then((all) => all.reverse());
}