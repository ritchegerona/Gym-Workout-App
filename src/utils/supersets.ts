import type { SessionExercise, SetRecord } from "../types";

/** A run of consecutive exercises sharing a supersetGroup id. */
export interface SupersetBlockItem<T> {
  item: T;
  /** "A", "B", "C" — position within the block. */
  letter: string;
}

export interface SupersetBlock<T> {
  group: string | null;
  items: SupersetBlockItem<T>[];
}

/**
 * Group exercises into consecutive superset blocks.
 * A block only keeps members that sit next to each other in the list, which is
 * how the builder creates them; a moved member that leaves the run simply
 * becomes its own single-item block.
 */
export function buildSupersetBlocks<T extends { supersetGroup?: string | null }>(
  items: T[],
): SupersetBlock<T>[] {
  const blocks: SupersetBlock<T>[] = [];
  for (const item of items) {
    const last = blocks[blocks.length - 1];
    if (last && last.group !== null && item.supersetGroup === last.group) {
      last.items.push({
        item,
        letter: String.fromCharCode(65 + last.items.length),
      });
    } else {
      blocks.push({
        group: item.supersetGroup ?? null,
        items: [{ item, letter: "A" }],
      });
    }
  }
  return blocks;
}

/** Index of the first incomplete set, or sets.length when the member is done. */
function nextSetIndex(sets: SetRecord[]): number {
  const idx = sets.findIndex((s) => s.completedAt === 0);
  return idx === -1 ? sets.length : idx;
}

/** 1-based round the block is currently working on. */
export function currentRound(items: { sets: SetRecord[] }[]): number {
  if (items.length === 0) return 1;
  const minNext = Math.min(...items.map((m) => nextSetIndex(m.sets)));
  return minNext + 1;
}

/** Total rounds implied by the member with the most sets (min 1). */
export function totalRounds(items: { sets: SetRecord[] }[]): number {
  return Math.max(1, ...items.map((m) => m.sets.length));
}

/** Every member has either no set at setIdx or completed one. */
export function isRoundComplete(
  exercises: SessionExercise[],
  groupId: string,
  setIdx: number,
): boolean {
  const members = exercises.filter((e) => e.supersetGroup === groupId);
  if (members.length === 0) return true;
  return members.every(
    (m) => m.sets.length <= setIdx || m.sets[setIdx].completedAt > 0,
  );
}

/** Max rest across a group — used when a full round is done. */
export function groupRestSec(
  exercises: SessionExercise[],
  groupId: string,
  fallback: number,
): number {
  const members = exercises.filter((e) => e.supersetGroup === groupId);
  return Math.max(fallback, ...members.map((m) => m.restSec));
}