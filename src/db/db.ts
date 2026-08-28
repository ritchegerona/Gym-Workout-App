import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type {
  CardioEntry,
  Exercise,
  PersonalRecord,
  WorkoutSession,
  WorkoutTemplate,
} from "../types";

export interface GymDB extends DBSchema {
  exercises: {
    key: string;
    value: Exercise;
    indexes: { "by-muscle": string; "by-name": string };
  };
  templates: {
    key: string;
    value: WorkoutTemplate;
    indexes: { "by-created": number };
  };
  sessions: {
    key: string;
    value: WorkoutSession;
    indexes: { "by-started": number };
  };
  records: {
    key: string;
    value: PersonalRecord;
    indexes: { "by-exercise": string; "by-date": number };
  };
  cardioEntries: {
    key: string;
    value: CardioEntry;
    indexes: { "by-date": number };
  };
}

let dbPromise: Promise<IDBPDatabase<GymDB>> | null = null;

function getDB(): Promise<IDBPDatabase<GymDB>> {
  if (!dbPromise) {
    dbPromise = openDB<GymDB>("irontrack-db", 2, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const exercises = db.createObjectStore("exercises", { keyPath: "id" });
          exercises.createIndex("by-muscle", "muscleGroup");
          exercises.createIndex("by-name", "name");

          const templates = db.createObjectStore("templates", { keyPath: "id" });
          templates.createIndex("by-created", "createdAt");

          const sessions = db.createObjectStore("sessions", { keyPath: "id" });
          sessions.createIndex("by-started", "startedAt");

          const records = db.createObjectStore("records", { keyPath: "id" });
          records.createIndex("by-exercise", "exerciseId");
          records.createIndex("by-date", "date");
        }

        if (oldVersion < 2) {
          const cardio = db.createObjectStore("cardioEntries", { keyPath: "id" });
          cardio.createIndex("by-date", "date");
        }
      },
    });
  }
  return dbPromise;
}

export function uid(): string {
  return crypto.randomUUID();
}

export { getDB };
