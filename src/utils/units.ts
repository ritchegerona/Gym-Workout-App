import type { UnitSystem } from "../types";

const KG_TO_LB = 2.20462262185;

export function kgToDisplay(kg: number, unit: UnitSystem): number {
  return unit === "kg" ? kg : kg * KG_TO_LB;
}

export function displayToKg(value: number, unit: UnitSystem): number {
  return unit === "kg" ? value : value / KG_TO_LB;
}

export function formatWeight(kg: number, unit: UnitSystem): string {
  const v = kgToDisplay(kg, unit);
  const rounded = roundWeight(v);
  return `${trimNum(rounded)} ${unit}`;
}

export function roundWeight(displayValue: number): number {
  return Math.round(displayValue * 4) / 4; // nearest 0.25
}

export function trimNum(n: number): string {
  return Number.isInteger(n) ? String(n) : String(parseFloat(n.toFixed(2)));
}

export function convertWeight(value: number, from: UnitSystem, to: UnitSystem): number {
  if (from === to) return value;
  return to === "lb" ? value * KG_TO_LB : value / KG_TO_LB;
}

export function formatDistance(km: number, unit: UnitSystem): string {
  // distance follows the same toggle for future features
  return unit === "kg" ? `${trimNum(km)} km` : `${trimNum(km * 0.621371)} mi`;
}
