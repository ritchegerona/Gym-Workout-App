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
  // crypto.randomUUID is iOS Safari 15.4+; fall back for older iOS/WebKit
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    const b = new Uint8Array(16);
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      crypto.getRandomValues(b);
    } else {
      for (let i = 0; i < b.length; i++) b[i] = Math.floor(Math.random() * 256);
    }
    // RFC4122 v4
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const hex = Array.from(b, (x) => x.toString(16).padStart(2, "0"));
    return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
  } catch {
    return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

export { getDB };
