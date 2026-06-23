import type { SnapGuideSegment } from "@/tools/room-coat/lib/snap-guides";

export interface MeasureLinePoint {
  xMm: number;
  zMm: number;
  label?: string;
}

export interface ActiveMeasureLine {
  start: MeasureLinePoint;
  end: MeasureLinePoint;
}

export type MeasureLineSnapKind =
  | "measure-start"
  | "measure-end"
  | "measure-midpoint"
  | "measure-line";

export interface MeasureLineSnapCandidate {
  xMm: number;
  zMm: number;
  label: string;
  kind: MeasureLineSnapKind;
  guides: SnapGuideSegment[];
  distanceMm: number;
}

const MEASURE_ENDPOINT_RADIUS_MM = 300;
const MEASURE_MIDPOINT_RADIUS_MM = 280;
const MEASURE_LINE_RADIUS_MM = 220;

function projectOntoSegment(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  px: number,
  pz: number,
): { xMm: number; zMm: number; distanceMm: number } | null {
  const dx = bx - ax;
  const dz = bz - az;
  const lenSq = dx * dx + dz * dz;
  if (lenSq < 1) return null;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / lenSq));
  const x = ax + dx * t;
  const z = az + dz * t;
  return { xMm: x, zMm: z, distanceMm: Math.hypot(px - x, pz - z) };
}

function measureLineGuide(measure: ActiveMeasureLine): SnapGuideSegment {
  return {
    x1Mm: measure.start.xMm,
    z1Mm: measure.start.zMm,
    x2Mm: measure.end.xMm,
    z2Mm: measure.end.zMm,
  };
}

export function collectMeasureLineSnapCandidates(
  measure: ActiveMeasureLine | null | undefined,
  pointerX: number,
  pointerZ: number,
): MeasureLineSnapCandidate[] {
  if (!measure) return [];

  const { start, end } = measure;
  const dx = end.xMm - start.xMm;
  const dz = end.zMm - start.zMm;
  const len = Math.hypot(dx, dz);
  if (len < 1) return [];

  const guide = measureLineGuide(measure);
  const candidates: MeasureLineSnapCandidate[] = [];

  function push(
    xMm: number,
    zMm: number,
    label: string,
    kind: MeasureLineSnapKind,
    radiusMm: number,
  ) {
    const distanceMm = Math.hypot(xMm - pointerX, zMm - pointerZ);
    if (distanceMm > radiusMm) return;
    candidates.push({
      xMm: Math.round(xMm),
      zMm: Math.round(zMm),
      label,
      kind,
      guides: [guide],
      distanceMm,
    });
  }

  push(
    start.xMm,
    start.zMm,
    start.label ? `Measure · ${start.label}` : "Measure start",
    "measure-start",
    MEASURE_ENDPOINT_RADIUS_MM,
  );
  push(
    end.xMm,
    end.zMm,
    end.label ? `Measure · ${end.label}` : "Measure end",
    "measure-end",
    MEASURE_ENDPOINT_RADIUS_MM,
  );
  push(
    (start.xMm + end.xMm) / 2,
    (start.zMm + end.zMm) / 2,
    "Measure middle",
    "measure-midpoint",
    MEASURE_MIDPOINT_RADIUS_MM,
  );

  const projected = projectOntoSegment(
    start.xMm,
    start.zMm,
    end.xMm,
    end.zMm,
    pointerX,
    pointerZ,
  );
  if (projected && projected.distanceMm <= MEASURE_LINE_RADIUS_MM) {
    candidates.push({
      xMm: Math.round(projected.xMm),
      zMm: Math.round(projected.zMm),
      label: "Measure line",
      kind: "measure-line",
      guides: [guide],
      distanceMm: projected.distanceMm,
    });
  }

  return candidates;
}

export function activeMeasureLine(
  start: MeasureLinePoint | null,
  end: MeasureLinePoint | null,
): ActiveMeasureLine | null {
  if (!start || !end) return null;
  return { start, end };
}
