import { roomRect } from "@/tools/room-coat/lib/layout-bounds";
import {
  offsetToWorldOnWall,
  projectPointToWall,
  solidWallSegments,
  wallEdges,
} from "@/tools/room-coat/lib/wall-openings";
import type { Hallway, PlacedRoom } from "@/tools/room-coat/types/state";
import type { MeasureSnapKind } from "@/tools/room-coat/lib/measure-snap";
import type { SnapSourceKind } from "@/tools/room-coat/lib/layout-snap";

export interface SnapGuideSegment {
  x1Mm: number;
  z1Mm: number;
  x2Mm: number;
  z2Mm: number;
}

type SnapKind = MeasureSnapKind | SnapSourceKind;

const WALL_TRACE_KINDS = new Set<SnapKind>([
  "wall-midpoint",
  "segment-midpoint",
  "between-features",
  "opening-center",
  "opening-edge",
  "wall-edge",
  "wall-endpoint",
  "vertex",
  "room-wall",
]);

/** Show wall trace while dragging furnishings near a wall-center snap target. */
const FURNISH_WALL_CENTER_GUIDE_RADIUS_MM = 480;
const WALL_TRACE_LOOKUP_RADIUS_MM = 320;

function roomWallTraceGuide(
  room: PlacedRoom,
  wallIndex: number,
): SnapGuideSegment {
  const edge = wallEdges(room).find((item) => item.wallIndex === wallIndex);
  if (edge) {
    return {
      x1Mm: Math.round(edge.x1),
      z1Mm: Math.round(edge.z1),
      x2Mm: Math.round(edge.x2),
      z2Mm: Math.round(edge.z2),
    };
  }
  const rect = roomRect(room);
  return {
    x1Mm: Math.round(rect.minX),
    z1Mm: Math.round(rect.centerZ),
    x2Mm: Math.round(rect.maxX),
    z2Mm: Math.round(rect.centerZ),
  };
}

function nearestRoomWallAtPoint(
  rooms: PlacedRoom[],
  xMm: number,
  zMm: number,
  maxDistanceMm = 180,
): { room: PlacedRoom; wallIndex: number } | null {
  let best: { room: PlacedRoom; wallIndex: number } | null = null;
  let bestDistance = Infinity;

  for (const room of rooms) {
    for (const edge of wallEdges(room)) {
      const projected = projectPointToWall(room, edge.wallIndex, xMm, zMm);
      if (!projected || projected.distanceMm > maxDistanceMm) continue;
      if (projected.distanceMm < bestDistance) {
        bestDistance = projected.distanceMm;
        best = { room, wallIndex: edge.wallIndex };
      }
    }
  }

  return best;
}

function roomContainingPoint(
  rooms: PlacedRoom[],
  xMm: number,
  zMm: number,
): PlacedRoom | null {
  for (const room of rooms) {
    const rect = roomRect(room);
    if (
      xMm >= rect.minX - 80 &&
      xMm <= rect.maxX + 80 &&
      zMm >= rect.minZ - 80 &&
      zMm <= rect.maxZ + 80
    ) {
      return room;
    }
  }
  return null;
}

/** Preview wall-center trace from pointer proximity (before/at snap threshold). */
export function snapGuidesForFurnishPointer(
  pointerXMm: number,
  pointerZMm: number,
  rooms: PlacedRoom[],
): SnapGuideSegment[] {
  let bestRoom: PlacedRoom | null = null;
  let bestWallIndex: number | null = null;
  let bestDistance = Infinity;

  for (const room of rooms) {
    for (const edge of wallEdges(room)) {
      const mid = offsetToWorldOnWall(room, edge.wallIndex, edge.lengthMm / 2);
      const midDistance = Math.hypot(
        Math.round(mid.x) - pointerXMm,
        Math.round(mid.z) - pointerZMm,
      );
      if (midDistance < bestDistance) {
        bestDistance = midDistance;
        bestRoom = room;
        bestWallIndex = edge.wallIndex;
      }

      for (const segment of solidWallSegments(room, edge.wallIndex)) {
        const center = offsetToWorldOnWall(
          room,
          edge.wallIndex,
          (segment.startMm + segment.endMm) / 2,
        );
        const centerDistance = Math.hypot(
          Math.round(center.x) - pointerXMm,
          Math.round(center.z) - pointerZMm,
        );
        if (centerDistance < bestDistance) {
          bestDistance = centerDistance;
          bestRoom = room;
          bestWallIndex = edge.wallIndex;
        }
      }
    }
  }

  if (
    bestDistance > FURNISH_WALL_CENTER_GUIDE_RADIUS_MM ||
    !bestRoom ||
    bestWallIndex === null
  ) {
    return [];
  }

  return [roomWallTraceGuide(bestRoom, bestWallIndex)];
}

function hallwaySegmentGuide(
  hallway: Hallway,
  xMm: number,
  zMm: number,
): SnapGuideSegment | null {
  const points = hallway.waypointsMm;
  if (points.length < 2) return null;

  let bestIndex = 0;
  let bestDistance = Infinity;
  for (let index = 0; index < points.length - 1; index += 1) {
    const a = points[index]!;
    const b = points[index + 1]!;
    const midX = (a.xMm + b.xMm) / 2;
    const midZ = (a.zMm + b.zMm) / 2;
    const distance = Math.hypot(midX - xMm, midZ - zMm);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  }

  const start = points[bestIndex]!;
  const end = points[bestIndex + 1]!;
  return {
    x1Mm: start.xMm,
    z1Mm: start.zMm,
    x2Mm: end.xMm,
    z2Mm: end.zMm,
  };
}

export function snapGuidesForPoint(input: {
  xMm: number;
  zMm: number;
  kind: SnapKind | null;
  rooms: PlacedRoom[];
  hallways: Hallway[];
}): SnapGuideSegment[] {
  const { xMm, zMm, kind, rooms, hallways } = input;
  if (!kind) return [];

  if (kind === "room-center") {
    const room = roomContainingPoint(rooms, xMm, zMm) ?? rooms[0];
    if (!room) return [];
    const rect = roomRect(room);
    return [
      {
        x1Mm: Math.round(rect.minX),
        z1Mm: Math.round(rect.centerZ),
        x2Mm: Math.round(rect.maxX),
        z2Mm: Math.round(rect.centerZ),
      },
      {
        x1Mm: Math.round(rect.centerX),
        z1Mm: Math.round(rect.minZ),
        x2Mm: Math.round(rect.centerX),
        z2Mm: Math.round(rect.maxZ),
      },
    ];
  }

  if (WALL_TRACE_KINDS.has(kind)) {
    const hit = nearestRoomWallAtPoint(
      rooms,
      xMm,
      zMm,
      WALL_TRACE_LOOKUP_RADIUS_MM,
    );
    if (hit) {
      return [roomWallTraceGuide(hit.room, hit.wallIndex)];
    }
  }

  if (kind === "hallway-midpoint" || kind === "hallway-corner" || kind === "hallway-edge") {
    for (const hallway of hallways) {
      const guide = hallwaySegmentGuide(hallway, xMm, zMm);
      if (guide) return [guide];
    }
  }

  if (
    kind === "measure-start" ||
    kind === "measure-end" ||
    kind === "measure-midpoint" ||
    kind === "measure-line"
  ) {
    return [];
  }

  if (kind === "snap-point") {
    const hit = nearestRoomWallAtPoint(rooms, xMm, zMm, 240);
    if (hit) {
      return [roomWallTraceGuide(hit.room, hit.wallIndex)];
    }
  }

  return [];
}

export function wallSnapGuideFromPoint(
  room: PlacedRoom,
  wallIndex: number,
  wallOffsetMm: number,
): SnapGuideSegment[] {
  void offsetToWorldOnWall(room, wallIndex, wallOffsetMm);
  return [roomWallTraceGuide(room, wallIndex)];
}
