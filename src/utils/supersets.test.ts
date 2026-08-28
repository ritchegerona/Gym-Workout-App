import { describe, it, expect } from "vitest";
import {
  buildSupersetBlocks,
  currentRound,
  groupRestSec,
  isRoundComplete,
  totalRounds,
} from "./supersets";
import type { SessionExercise } from "../types";

function ex(
  id: string,
  group: string | null,
  completed: number[],
): SessionExercise {
  return {
    exerciseId: id,
    name: id,
    restSec: 90,
    targetSets: completed.length,
    supersetGroup: group,
    sets: completed.map((c, i) => ({
      weight: 50 + i,
      reps: 8,
      completedAt: c === 1 ? 1000 : 0,
    })),
  };
}

describe("buildSupersetBlocks", () => {
  it("keeps standalone exercises as single-item blocks", () => {
    const blocks = buildSupersetBlocks([{ id: "a", supersetGroup: null }]);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].group).toBeNull();
    expect(blocks[0].items[0].letter).toBe("A");
  });

  it("groups consecutive exercises sharing a group id with letters A, B, C", () => {
    const blocks = buildSupersetBlocks([
      { id: "a", supersetGroup: "g1" },
      { id: "b", supersetGroup: "g1" },
      { id: "c", supersetGroup: null },
      { id: "d", supersetGroup: "g2" },
      { id: "e", supersetGroup: "g2" },
    ]);
    expect(blocks).toHaveLength(3);
    expect(blocks[0].items.map((i) => i.letter)).toEqual(["A", "B"]);
    expect(blocks[0].items[0].item.id).toBe("a");
    expect(blocks[1].group).toBeNull();
    expect(blocks[2].items.map((i) => i.letter)).toEqual(["A", "B"]);
  });

  it("splits when a member is separated from its group", () => {
    const blocks = buildSupersetBlocks([
      { id: "a", supersetGroup: "g1" },
      { id: "b", supersetGroup: null },
      { id: "c", supersetGroup: "g1" },
    ]);
    expect(blocks.every((b) => b.items.length === 1)).toBe(true);
  });
});

describe("round helpers", () => {
  it("reports the current and total rounds of a block", () => {
    const members = [ex("a", "g", [1, 0, 0]), ex("b", "g", [1, 1, 0])];
    // a still needs set 2, so we're on round 2
    expect(currentRound(members)).toBe(2);
    expect(totalRounds(members)).toBe(3);
    expect(isRoundComplete(members, "g", 0)).toBe(true);
    expect(isRoundComplete(members, "g", 1)).toBe(false);
    expect(isRoundComplete(members, "g", 2)).toBe(false);
  });

  it("treats members with fewer sets as done for that round", () => {
    const members = [ex("a", "g", [1]), ex("b", "g", [1, 1, 0])];
    expect(isRoundComplete(members, "g", 0)).toBe(true);
    expect(isRoundComplete(members, "g", 1)).toBe(true);
    expect(isRoundComplete(members, "g", 2)).toBe(false);
  });

  it("computes group rest from the largest member rest", () => {
    const members = [ex("a", "g", [0]), ex("b", "g", [0])];
    members[0].restSec = 60;
    members[1].restSec = 180;
    expect(groupRestSec(members, "g", 90)).toBe(180);
    expect(groupRestSec(members, "missing", 90)).toBe(90);
  });
});