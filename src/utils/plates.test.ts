import { describe, it, expect } from "vitest";
import { computePlatesPerSide, formatPlateBreakdown, platesLabelForKg } from "./plates";

describe("computePlatesPerSide (kg)", () => {
  it("empty bar for weights at or below the bar", () => {
    expect(computePlatesPerSide(20, "kg")).toEqual({ pairs: [], leftover: 0, barOnly: true });
    expect(computePlatesPerSide(10, "kg").barOnly).toBe(true);
    expect(computePlatesPerSide(0, "kg").barOnly).toBe(true);
  });

  it("even split for a classic 60 kg bench", () => {
    const r = computePlatesPerSide(60, "kg");
    expect(r.pairs).toEqual([{ plate: 20, count: 1 }]);
    expect(r.leftover).toBe(0);
  });

  it("greedy fill for 100 kg", () => {
    const r = computePlatesPerSide(100, "kg");
    expect(r.pairs).toEqual([
      { plate: 25, count: 1 },
      { plate: 15, count: 1 },
    ]);
    expect(r.leftover).toBe(0);
  });

  it("uses small plates for fractions", () => {
    const r = computePlatesPerSide(62.5, "kg");
    expect(r.pairs).toEqual([
      { plate: 20, count: 1 },
      { plate: 1.25, count: 1 },
    ]);
    expect(r.leftover).toBe(0);
  });

  it("aggregates duplicate plates", () => {
    // 120 kg → side 50 → 25 × 2
    const r = computePlatesPerSide(120, "kg");
    expect(r.pairs).toEqual([{ plate: 25, count: 2 }]);
  });

  it("reports leftover when plates can't match exactly", () => {
    // 71.9 kg → side 25.95 → 25 leaves 0.95 (< 1.25 smallest)
    const r = computePlatesPerSide(71.9, "kg");
    expect(r.leftover).toBeGreaterThan(0);
    expect(r.leftover).toBeLessThan(1.25);
  });

  it("handles non-finite input safely", () => {
    expect(computePlatesPerSide(NaN, "kg").barOnly).toBe(true);
    expect(computePlatesPerSide(Infinity, "kg")).toBeDefined();
  });
});

describe("computePlatesPerSide (lb)", () => {
  it("uses a 45 lb bar and lb plates", () => {
    // 135 lb → side 45 → one 45
    expect(computePlatesPerSide(135, "lb").pairs).toEqual([{ plate: 45, count: 1 }]);
    // 225 lb → side 90 → 45 × 2
    expect(computePlatesPerSide(225, "lb").pairs).toEqual([{ plate: 45, count: 2 }]);
    // 95 lb → side 25 → one 25
    expect(computePlatesPerSide(95, "lb").pairs).toEqual([{ plate: 25, count: 1 }]);
  });
});

describe("formatting", () => {
  it("formats multi-plate breakdowns", () => {
    const b = computePlatesPerSide(102.5, "kg"); // side 41.25 → 25 + 15 + 1.25
    expect(formatPlateBreakdown(b)).toBe("25 + 15 + 1.25");
  });
  it("shows counts", () => {
    expect(formatPlateBreakdown(computePlatesPerSide(120, "kg"))).toBe("25 × 2");
  });
  it("converts from stored kg to display units", () => {
    expect(platesLabelForKg(60, "kg")).toBe("20");
    // 60 kg ≈ 132.3 lb → side ≈ 43.65 → 35 + 8.65?? greedy: 35 leaves 8.65 → 5 + 2.5 leaves 1.15
    const label = platesLabelForKg(60, "lb");
    expect(label.startsWith("35")).toBe(true);
  });
});
