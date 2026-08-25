import type { UnitSystem } from "../types";
import { kgToDisplay } from "./units";

export interface PlatePair {
  plate: number;
  count: number;
}

export interface PlateBreakdown {
  /** Plates to load on EACH side, heaviest first. Empty = bar only. */
  pairs: PlatePair[];
  /** Weight that couldn't be matched with available plates (display units). */
  leftover: number;
  /** True when the target is at/below bare bar weight. */
  barOnly: boolean;
}

const CONFIG: Record<UnitSystem, { bar: number; plates: number[] }> = {
  kg: { bar: 20, plates: [25, 20, 15, 10, 5, 2.5, 1.25] },
  lb: { bar: 45, plates: [45, 35, 25, 10, 5, 2.5] },
};

/**
 * Greedy plate math for a standard barbell, in DISPLAY units
 * (pass the weight the user sees, already converted from internal kg).
 */
export function computePlatesPerSide(
  displayWeight: number,
  unit: UnitSystem,
): PlateBreakdown {
  const { bar, plates } = CONFIG[unit];
  if (!Number.isFinite(displayWeight) || displayWeight <= bar) {
    return { pairs: [], leftover: 0, barOnly: true };
  }
  let side = Math.round(((displayWeight - bar) / 2) * 100) / 100;
  const pairs: PlatePair[] = [];
  for (const plate of plates) {
    if (side < plate) continue;
    const count = Math.floor(side / plate + 1e-9);
    pairs.push({ plate, count });
    side = Math.round((side - count * plate) * 100) / 100;
    if (side <= 0) break;
  }
  return { pairs, leftover: Math.max(0, side), barOnly: false };
}

export function formatPlateBreakdown(b: PlateBreakdown): string {
  if (b.barOnly) return "Bar only";
  if (b.pairs.length === 0) return "—";
  return b.pairs
    .map((p) => (p.count > 1 ? `${p.plate} × ${p.count}` : `${p.plate}`))
    .join(" + ");
}

/** Convert an internally-stored kg weight to a per-side plate label. */
export function platesLabelForKg(weightKg: number, unit: UnitSystem): string {
  return formatPlateBreakdown(computePlatesPerSide(kgToDisplay(weightKg, unit), unit));
}
