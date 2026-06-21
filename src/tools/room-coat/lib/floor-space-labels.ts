import type { Hallway } from "@/tools/room-coat/types/state";
import { floorLabelPlaneSizeM } from "@/tools/room-coat/lib/wall-label-texture";

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

const CARDINAL_YAWS = [0, Math.PI / 2, Math.PI, -Math.PI / 2] as const;

/** Text "up" on the floor plane in world XZ after mesh tilt and yaw. */
function floorLabelTextUpXZ(yaw: number): { x: number; z: number } {
  return { x: -Math.sin(yaw), z: -Math.cos(yaw) };
}

function pickBestFloorLabelYaw(
  candidates: readonly number[],
  toCameraX: number,
  toCameraZ: number,
): number {
  let bestYaw = candidates[0] ?? 0;
  let bestScore = -Infinity;

  for (const yaw of candidates) {
    const up = floorLabelTextUpXZ(yaw);
    const score = up.x * toCameraX + up.z * toCameraZ;
    if (score > bestScore) {
      bestScore = score;
      bestYaw = yaw;
    }
  }

  return bestYaw;
}

/** Snap floor label yaw to the nearest cardinal that reads upright from the camera. */
export function snapRoomFloorLabelYaw(
  labelXM: number,
  labelZM: number,
  cameraX: number,
  cameraZ: number,
): number {
  const dx = cameraX - labelXM;
  const dz = cameraZ - labelZM;
  const len = Math.hypot(dx, dz);
  if (len < 1e-6) return 0;

  const toCameraX = dx / len;
  const toCameraZ = dz / len;
  return pickBestFloorLabelYaw(CARDINAL_YAWS, toCameraX, toCameraZ);
}

/** Hallway labels stay aligned to the path axis and only flip 180° when needed. */
export function hallwayFloorLabelYaw(
  axis: "x" | "z",
  labelXM: number,
  labelZM: number,
  cameraX: number,
  cameraZ: number,
): number {
  const dx = cameraX - labelXM;
  const dz = cameraZ - labelZM;
  const len = Math.hypot(dx, dz) || 1;
  const toCameraX = dx / len;
  const toCameraZ = dz / len;

  const candidates =
    axis === "z" ? ([Math.PI / 2, -Math.PI / 2] as const) : ([0, Math.PI] as const);

  return pickBestFloorLabelYaw(candidates, toCameraX, toCameraZ);
}

export function hallwayLabelFloorSizeM(
  hallwayWidthMm: number,
  pathLengthMm: number,
  aspect: number,
): [number, number] {
  const floorWidthM = hallwayWidthMm * 0.001;
  const floorLengthM = Math.max(pathLengthMm * 0.001, floorWidthM);
  return floorLabelPlaneSizeM(floorWidthM, floorLengthM, aspect);
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
