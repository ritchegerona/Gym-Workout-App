import { describe, it, expect } from "vitest";
import {
  setVolume,
  exerciseVolume,
  estimate1RM,
  totalSessionVolume,
  countCompletedSets,
  detectSetPRs,
} from "./calculations";
import type { SetRecord } from "../types";

describe("setVolume", () => {
  it("multiplies weight by reps", () => {
    expect(setVolume(60, 8)).toBe(480);
  });
  it("clamps negatives to zero", () => {
    expect(setVolume(-10, 5)).toBe(0);
    expect(setVolume(60, -2)).toBe(0);
  });
});

describe("exerciseVolume", () => {
  it("sums completed and uncompleted sets alike", () => {
    const sets: SetRecord[] = [
      { weight: 60, reps: 8, completedAt: 1 },
      { weight: 62.5, reps: 6, completedAt: 2 },
    ];
    expect(exerciseVolume(sets)).toBe(480 + 375);
  });
});

describe("estimate1RM (Epley)", () => {
  it("returns weight for a single rep", () => {
    expect(estimate1RM(100, 1)).toBe(100);
  });
  it("computes Epley for multiple reps", () => {
    expect(estimate1RM(100, 5)).toBeCloseTo(116.667, 2);
  });
  it("returns 0 for invalid input", () => {
    expect(estimate1RM(0, 5)).toBe(0);
    expect(estimate1RM(100, 0)).toBe(0);
  });
});

describe("totalSessionVolume / countCompletedSets", () => {
  it("aggregates across exercises", () => {
    const exs = [
      { sets: [{ weight: 60, reps: 8, completedAt: 1 }] },
      { sets: [{ weight: 40, reps: 10, completedAt: 2 }, { weight: 40, reps: 0, completedAt: 0 }] },
    ];
    expect(totalSessionVolume(exs)).toBe(880);
    expect(countCompletedSets(exs)).toBe(2);
  });
});

describe("detectSetPRs", () => {
  const prev = { weight: 80, oneRm: 92, setVol: 400 };

  it("detects all PR types on a heavy set", () => {
    const prs = detectSetPRs({ weight: 85, reps: 5, completedAt: 1 }, prev.weight, prev.oneRm, prev.setVol);
    expect(prs.map((p) => p.type).sort()).toEqual(["best-1rm", "best-set-volume", "max-weight"]);
  });

  it("detects nothing when below previous bests", () => {
    const prs = detectSetPRs({ weight: 75, reps: 5, completedAt: 1 }, prev.weight, prev.oneRm, prev.setVol);
    expect(prs).toHaveLength(0);
  });

  it("detects volume PR when same weight more reps", () => {
    // e1rm: 80*(1+9/30)=104 > 92; volume 720 > 400; weight not beaten
    const prs = detectSetPRs({ weight: 80, reps: 9, completedAt: 1 }, prev.weight, prev.oneRm, prev.setVol);
    expect(prs.map((p) => p.type).sort()).toEqual(["best-1rm", "best-set-volume"]);
  });
});
