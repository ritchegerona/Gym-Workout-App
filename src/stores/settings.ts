import { create } from "zustand";
import { persist } from "zustand/middleware";
import { uid } from "../db/db";
import type {
  BodyWeightEntry,
  ThemeMode,
  TrainingGoal,
  UnitSystem,
  UserProfile,
} from "../types";

export const REST_PRESETS = [30, 60, 90, 120, 180];

interface SettingsState {
  onboarded: boolean;
  unit: UnitSystem;
  theme: ThemeMode;
  defaultRestSec: number;
  smartRestDefaults: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  notificationsEnabled: boolean;
  profile: UserProfile;
  setOnboarded: () => void;
  setUnit: (u: UnitSystem) => void;
  setTheme: (t: ThemeMode) => void;
  setDefaultRest: (s: number) => void;
  setSmartRestDefaults: (v: boolean) => void;
  toggleSound: () => void;
  toggleVibration: () => void;
  toggleNotifications: () => void;
  updateProfile: (p: Partial<UserProfile>) => void;
  logBodyWeight: (kg: number, date?: number) => void;
  removeBodyWeightEntry: (id: string) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      onboarded: false,
      unit: "kg",
      theme: "system",
      defaultRestSec: 90,
      smartRestDefaults: true,
      soundEnabled: true,
      vibrationEnabled: true,
      notificationsEnabled: false,
      profile: {
        name: "",
        age: null,
        heightCm: null,
        bodyWeightKg: null,
        goal: null,
      },
      setOnboarded: () => set({ onboarded: true }),
      setUnit: (unit) => set({ unit }),
      setTheme: (theme) => set({ theme }),
      setDefaultRest: (defaultRestSec) => set({ defaultRestSec }),
      setSmartRestDefaults: (smartRestDefaults) => set({ smartRestDefaults }),
      toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
      toggleVibration: () =>
        set((s) => ({ vibrationEnabled: !s.vibrationEnabled })),
      toggleNotifications: () =>
        set((s) => ({ notificationsEnabled: !s.notificationsEnabled })),
      updateProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),
      logBodyWeight: (kg, date = Date.now()) =>
        set((s) => {
          const entry: BodyWeightEntry = { id: uid(), date, weightKg: kg };
          const log = [...(s.profile.bodyWeightLog ?? []), entry];
          const profile = { ...s.profile, bodyWeightLog: log, bodyWeightKg: kg };
          return { profile };
        }),
      removeBodyWeightEntry: (id) =>
        set((s) => ({
          profile: {
            ...s.profile,
            bodyWeightLog: (s.profile.bodyWeightLog ?? []).filter(
              (e) => e.id !== id,
            ),
          },
        })),
    }),
    { name: "irontrack-settings" },
  ),
);

export const TRAINING_GOALS: TrainingGoal[] = [
  "Build Muscle",
  "Get Stronger",
  "Lose Weight",
  "General Fitness",
  "Improve Endurance",
];
