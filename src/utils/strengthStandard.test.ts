import { describe, it, expect } from "vitest";
import {
  classifyStrength,
  formatEstimated1RM,
  standardForLift,
  strengthLevelIndex,
} from "./strengthStandard";

describe("formatEstimated1RM", () => {
  it("applies the Epley formula", () => {
    expect(formatEstimated1RM(80, 10)).toBe(106.7);
  });
  it("returns weight for a single rep", () => {
    expect(formatEstimated1RM(100, 1)).toBe(100);
  });
});

describe("standardForLift", () => {
  it("matches canonical names exactly", () => {
    expect(standardForLift("Bench Press")).not.toBeNull();
  });
  it("matches fuzzy names like a barbell variant", () => {
    const std = standardForLift("Barbell Bench Press");
    expect(std?.[0].level).toBe("Untrained");
  });
  it("returns null for non-big lifts", () => {
    expect(standardForLift("Bicep Curl")).toBeNull();
  });
});

describe("classifyStrength", () => {
  it("classifies bench vs bodyweight", () => {
    // 110kg bench at 80kg bodyweight = 1.375x → Intermediate
    const c = classifyStrength("Bench Press", 110, 80)!;
    expect(c.level.level).toBe("Intermediate");
    expect(c.next?.level).toBe("Advanced");
    expect(c.kgToNext).toBeCloseTo(1.75 * 80 - 110, 5);
  });
  it("caps at Elite when the ratio exceeds the top bar", () => {
    const c = classifyStrength("Deadlift", 260, 80)!;
    expect(c.level.level).toBe("Elite");
    expect(c.next).toBeNull();
  });
  it("returns null when body weight or lift is missing", () => {
    expect(classifyStrength("Squat", 100, 0)).toBeNull();
    expect(classifyStrength("Curl", 50, 80)).toBeNull();
  });
});

describe("strengthLevelIndex", () => {
  it("orders untrained first and elite last", () => {
    expect(strengthLevelIndex("Untrained")).toBe(0);
    expect(strengthLevelIndex("Elite")).toBe(4);
  });
});