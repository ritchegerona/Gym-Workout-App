import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ThemeMode, TrainingGoal, UnitSystem, UserProfile } from "../types";

export const REST_PRESETS = [30, 60, 90, 120, 180];

interface SettingsState {
  onboarded: boolean;
  unit: UnitSystem;
  theme: ThemeMode;
  defaultRestSec: number;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  notificationsEnabled: boolean;
  profile: UserProfile;
  setOnboarded: () => void;
  setUnit: (u: UnitSystem) => void;
  setTheme: (t: ThemeMode) => void;
  setDefaultRest: (s: number) => void;
  toggleSound: () => void;
  toggleVibration: () => void;
  toggleNotifications: () => void;
  updateProfile: (p: Partial<UserProfile>) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      onboarded: false,
      unit: "kg",
      theme: "system",
      defaultRestSec: 90,
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
      toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
      toggleVibration: () =>
        set((s) => ({ vibrationEnabled: !s.vibrationEnabled })),
      toggleNotifications: () =>
        set((s) => ({ notificationsEnabled: !s.notificationsEnabled })),
      updateProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),
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
