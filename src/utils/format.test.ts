import { describe, it, expect } from "vitest";
import {
  formatClock,
  formatDuration,
  relativeDate,
  estimatedDurationMinutes,
} from "./format";

describe("formatDuration", () => {
  it("formats minutes and seconds", () => {
    expect(formatDuration(65_000)).toBe("1m 05s");
  });
  it("formats hours", () => {
    expect(formatDuration(3_660_000)).toBe("1h 1m");
  });
  it("clamps negative values", () => {
    expect(formatDuration(-5)).toBe("0m 00s");
  });
});

describe("formatClock", () => {
  it("rounds up to seconds for countdown display", () => {
    expect(formatClock(90_000)).toBe("01:30");
    expect(formatClock(84_000)).toBe("01:24");
  });
  it("shows zero at or below zero", () => {
    expect(formatClock(0)).toBe("00:00");
    expect(formatClock(-1000)).toBe("00:00");
  });
});

describe("relativeDate", () => {
  it("returns Never for null", () => {
    expect(relativeDate(null)).toBe("Never");
  });
  it("returns Today for today", () => {
    expect(relativeDate(Date.now() - 1000)).toBe("Today");
  });
});

describe("estimatedDurationMinutes", () => {
  it("estimates a reasonable duration", () => {
    const min = estimatedDurationMinutes(6, 20);
    expect(min).toBeGreaterThan(30);
    expect(min).toBeLessThan(90);
  });
});
