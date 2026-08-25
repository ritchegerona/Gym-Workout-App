import { beforeEach, describe, it, expect } from "vitest";
import { useSettings } from "./settings";

beforeEach(() => {
  localStorage.removeItem("irontrack-settings");
  useSettings.setState({
    onboarded: false,
    unit: "kg",
    theme: "system",
    defaultRestSec: 90,
    soundEnabled: true,
    vibrationEnabled: true,
    notificationsEnabled: false,
    profile: { name: "", age: null, heightCm: null, bodyWeightKg: null, goal: null },
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
});
