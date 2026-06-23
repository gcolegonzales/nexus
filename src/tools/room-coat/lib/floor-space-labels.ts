import type { Hallway } from "@/tools/room-coat/types/state";
import { floorNameLabelPlaneSizeM } from "@/tools/room-coat/lib/wall-label-texture";

export interface HallwayLabelAnchor {
  xMm: number;
  zMm: number;
  axis: "x" | "z";
}

export function hallwayLabelAnchor(hallway: Hallway): HallwayLabelAnchor | null {
  const points = hallway.waypointsMm;
  if (points.length === 0) return null;
  if (points.length === 1) {
    return { xMm: points[0].xMm, zMm: points[0].zMm, axis: "z" };
  }

  let totalLength = 0;
  const segments: {
    start: (typeof points)[number];
    end: (typeof points)[number];
    length: number;
  }[] = [];

  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    const length = Math.hypot(end.xMm - start.xMm, end.zMm - start.zMm);
    if (length <= 0) continue;
    segments.push({ start, end, length });
    totalLength += length;
  }

  if (segments.length === 0) {
    const last = points[points.length - 1];
    return { xMm: last.xMm, zMm: last.zMm, axis: "z" };
  }

  let remaining = totalLength / 2;
  for (const segment of segments) {
    if (remaining <= segment.length) {
      const t = remaining / segment.length;
      const axis =
        Math.abs(segment.end.xMm - segment.start.xMm) >=
        Math.abs(segment.end.zMm - segment.start.zMm)
          ? "x"
          : "z";
      return {
        xMm: segment.start.xMm + (segment.end.xMm - segment.start.xMm) * t,
        zMm: segment.start.zMm + (segment.end.zMm - segment.start.zMm) * t,
        axis,
      };
    }
    remaining -= segment.length;
  }

  const lastSegment = segments[segments.length - 1];
  return {
    xMm: lastSegment.end.xMm,
    zMm: lastSegment.end.zMm,
    axis:
      Math.abs(lastSegment.end.xMm - lastSegment.start.xMm) >=
      Math.abs(lastSegment.end.zMm - lastSegment.start.zMm)
        ? "x"
        : "z",
  };
}

export function hallwayLabelFloorSizeM(
  hallwayWidthMm: number,
  pathLengthMm: number,
  aspect: number,
): [number, number] {
  const floorWidthM = hallwayWidthMm * 0.001;
  const floorLengthM = Math.max(pathLengthMm * 0.001, floorWidthM);
  return floorNameLabelPlaneSizeM(floorWidthM, floorLengthM, aspect);
}

export function hallwayPathLengthMm(hallway: Hallway): number {
  const points = hallway.waypointsMm;
  let total = 0;
  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    total += Math.hypot(end.xMm - start.xMm, end.zMm - start.zMm);
  }
  return Math.max(total, hallway.widthMm);
}
