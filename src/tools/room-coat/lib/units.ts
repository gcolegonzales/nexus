import type { UnitPreference } from "@/tools/room-coat/types/state";

const MM_PER_INCH = 25.4;
const MM_PER_FOOT = MM_PER_INCH * 12;
const M_PER_FOOT = MM_PER_FOOT / 1000;

export interface ImperialDisplay {
  feet: number;
  inches: number;
}

export interface MetricDisplay {
  meters: number;
  centimeters: number;
}

export function mmToImperial(mm: number): ImperialDisplay {
  const totalInches = mm / MM_PER_INCH;
  const feet = Math.floor(totalInches / 12);
  // Keep 0.01" resolution (~0.25 mm) so the mm -> imperial -> mm round-trip in
  // dimension inputs is effectively lossless. formatMm() rounds to 0.1" purely
  // for display.
  const inches = Math.round((totalInches - feet * 12) * 100) / 100;
  return { feet, inches };
}

export function imperialToMm(feet: number, inches: number): number {
  return Math.round((feet * 12 + inches) * MM_PER_INCH);
}

export function mmToMetric(mm: number): MetricDisplay {
  const totalCm = mm / 10;
  const meters = Math.floor(totalCm / 100);
  const centimeters = Math.round((totalCm - meters * 100) * 10) / 10;
  return { meters, centimeters };
}

export function metricToMm(meters: number, centimeters: number): number {
  return Math.round((meters * 100 + centimeters) * 10);
}

export function formatMm(mm: number, unit: UnitPreference): string {
  if (unit === "metric") {
    const { meters, centimeters } = mmToMetric(mm);
    if (meters === 0) {
      return `${centimeters} cm`;
    }
    if (centimeters === 0) {
      return `${meters} m`;
    }
    return `${meters} m ${centimeters} cm`;
  }
  const { feet, inches } = mmToImperial(mm);
  const displayInches = Math.round(inches * 10) / 10;
  if (feet === 0) {
    return `${displayInches}"`;
  }
  if (displayInches === 0) {
    return `${feet}'`;
  }
  return `${feet}' ${displayInches}"`;
}

export function unitLabel(unit: UnitPreference): string {
  return unit === "metric" ? "Metric (m / cm)" : "Imperial (ft / in)";
}

const SQ_MM_PER_SQ_FT = MM_PER_FOOT * MM_PER_FOOT;
const SQ_MM_PER_SQ_M = 1_000_000;

export function totalAreaLabel(unit: UnitPreference): string {
  return unit === "metric" ? "Total m²" : "Total sq ft";
}

export function formatArea(areaMm2: number, unit: UnitPreference): string {
  if (unit === "metric") {
    const sqM = areaMm2 / SQ_MM_PER_SQ_M;
    const showDecimal = sqM > 0 && sqM < 10;
    return `${sqM.toLocaleString(undefined, {
      minimumFractionDigits: showDecimal ? 1 : 0,
      maximumFractionDigits: 1,
    })} m²`;
  }

  const sqFt = areaMm2 / SQ_MM_PER_SQ_FT;
  return `${Math.round(sqFt).toLocaleString(undefined, {
    maximumFractionDigits: 0,
  })} sq ft`;
}

export function areaUnitSuffix(unit: UnitPreference): string {
  return unit === "metric" ? "m²" : "sq ft";
}

/** One grid cell on floor overlays: 1 sq ft or 1 m² depending on units. */
export function floorGridCellSizeM(unit: UnitPreference): number {
  return unit === "metric" ? 1 : M_PER_FOOT;
}

/** Default room: 12' × 14' × 8' */
export function defaultRoomDimensionsMm() {
  return {
    widthMm: imperialToMm(12, 0),
    lengthMm: imperialToMm(14, 0),
    heightMm: imperialToMm(8, 0),
  };
}

/** Default door: 36" × 80" */
export function defaultDoorDimensionsMm() {
  return {
    widthMm: imperialToMm(3, 0),
    heightMm: imperialToMm(6, 8),
    offsetFromCornerMm: imperialToMm(2, 0),
  };
}

/** Default window: 36" × 48" with 36" sill height */
export function defaultWindowDimensionsMm() {
  return {
    widthMm: imperialToMm(3, 0),
    heightMm: imperialToMm(4, 0),
    sillHeightMm: imperialToMm(3, 0),
    offsetFromCornerMm: imperialToMm(2, 0),
  };
}
