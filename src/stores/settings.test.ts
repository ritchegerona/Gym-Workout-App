import { beforeEach, describe, it, expect } from "vitest";
import { useSettings } from "./settings";

beforeEach(() => {
  localStorage.removeItem("irontrack-settings");
  useSettings.setState({
    onboarded: false,
    unit: "kg",
    theme: "system",
    defaultRestSec: 90,
    smartRestDefaults: true,
    soundEnabled: true,
    vibrationEnabled: true,
    notificationsEnabled: false,
    profile: { name: "", age: null, heightCm: null, bodyWeightKg: null, goal: null },
    weeklyPlan: [],
  });
});

describe("settings store", () => {
  it("updates profile fields", () => {
    useSettings.getState().updateProfile({ name: "Alex", goal: "Get Stronger" });
    const p = useSettings.getState().profile;
    expect(p.name).toBe("Alex");
    expect(p.goal).toBe("Get Stronger");
  });

  it("persists to localStorage for recovery across reloads", () => {
    useSettings.getState().setUnit("lb");
    useSettings.getState().setOnboarded();
    const raw = JSON.parse(localStorage.getItem("irontrack-settings")!);
    expect(raw.state.unit).toBe("lb");
    expect(raw.state.onboarded).toBe(true);
  });

  it("toggles feedback switches", () => {
    const s = useSettings.getState();
    s.toggleSound();
    s.toggleVibration();
    expect(useSettings.getState().soundEnabled).toBe(false);
    expect(useSettings.getState().vibrationEnabled).toBe(false);
  });

  it("sets default rest from presets", () => {
    useSettings.getState().setDefaultRest(180);
    expect(useSettings.getState().defaultRestSec).toBe(180);
  });

  it("toggles smart rest defaults", () => {
    useSettings.getState().setSmartRestDefaults(false);
    expect(useSettings.getState().smartRestDefaults).toBe(false);
  });

  it("logs a dated body-weight entry and updates current weight", () => {
    const s = useSettings.getState();
    s.logBodyWeight(88, 5000);
    s.logBodyWeight(87.5, 9000);
    const p = useSettings.getState().profile;
    expect(p.bodyWeightKg).toBe(87.5);
    expect(p.bodyWeightLog).toHaveLength(2);
    expect(p.bodyWeightLog![0]).toMatchObject({ weightKg: 88, date: 5000 });
    expect(p.bodyWeightLog![1]).toMatchObject({ weightKg: 87.5, date: 9000 });
  });

  it("removes a body-weight entry by id without touching the rest", () => {
    const s = useSettings.getState();
    s.logBodyWeight(88, 1);
    s.logBodyWeight(87, 2);
    const id = useSettings.getState().profile.bodyWeightLog![0].id;
    useSettings.getState().removeBodyWeightEntry(id);
    const log = useSettings.getState().profile.bodyWeightLog!;
    expect(log).toHaveLength(1);
    expect(log[0].weightKg).toBe(87);
  });

  it("assigns a workout to a day, replaces it, and clears it", () => {
    const s = useSettings.getState();
    s.setPlanEntry(1, { type: "workout", refId: "t1", name: "Push Day" });
    let plan = useSettings.getState().weeklyPlan;
    expect(plan).toHaveLength(1);
    expect(plan[0]).toMatchObject({ day: 1, type: "workout", name: "Push Day" });

    s.setPlanEntry(1, { type: "cardio", refId: null, name: "Run" });
    plan = useSettings.getState().weeklyPlan;
    expect(plan).toHaveLength(1);
    expect(plan[0]).toMatchObject({ day: 1, type: "cardio", name: "Run" });

    s.removePlanEntry(1);
    expect(useSettings.getState().weeklyPlan).toHaveLength(0);
  });

  it("keeps different days independent in the plan", () => {
    const s = useSettings.getState();
    s.setPlanEntry(2, { type: "workout", refId: "t1", name: "Push" });
    s.setPlanEntry(4, { type: "workout", refId: "t2", name: "Pull" });
    expect(useSettings.getState().weeklyPlan).toHaveLength(2);
    s.removePlanEntry(2);
    expect(useSettings.getState().weeklyPlan).toMatchObject([{ day: 4 }]);
  });
});
