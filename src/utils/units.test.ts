import { describe, it, expect } from "vitest";
import { kgToDisplay, displayToKg, convertWeight, formatWeight, roundWeight } from "./units";

describe("unit conversion", () => {
  it("converts kg to lb", () => {
    expect(kgToDisplay(100, "lb")).toBeCloseTo(220.46, 2);
    expect(kgToDisplay(100, "kg")).toBe(100);
  });
  it("converts display back to kg", () => {
    expect(displayToKg(220.462262185, "lb")).toBeCloseTo(100, 5);
  });
  it("round-trips", () => {
    expect(displayToKg(kgToDisplay(72.5, "lb"), "lb")).toBeCloseTo(72.5, 5);
  });
  it("convertWeight switches systems", () => {
    expect(convertWeight(50, "kg", "lb")).toBeCloseTo(110.23, 2);
    expect(convertWeight(110.23, "lb", "kg")).toBeCloseTo(50, 2);
    expect(convertWeight(50, "kg", "kg")).toBe(50);
  });
});

describe("formatWeight", () => {
  it("formats kg values", () => {
    expect(formatWeight(62.5, "kg")).toBe("62.5 kg");
    expect(formatWeight(80, "kg")).toBe("80 kg");
  });
  it("formats lb values", () => {
    expect(formatWeight(100, "lb")).toContain("lb");
  });
});

describe("roundWeight", () => {
  it("rounds to nearest quarter", () => {
    expect(roundWeight(62.3)).toBe(62.25);
    expect(roundWeight(62.4)).toBe(62.5);
  });
});
