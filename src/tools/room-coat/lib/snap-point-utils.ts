import { DEFAULT_HALLWAY_WIDTH_MM } from "@/tools/room-coat/lib/hallway-draft";
import type { RoomWallHit } from "@/tools/room-coat/lib/editor-surfaces";
import { linkOutwardNormal } from "@/tools/room-coat/lib/room-shape";
import { offsetToWorldOnWall } from "@/tools/room-coat/lib/wall-openings";
import type { PlacedRoom, SnapPoint } from "@/tools/room-coat/types/state";

const WALL_SNAP_RADIUS_MM = 450;
const WALL_SNAP_CLICK_RADIUS_MM = 320;

export function isWallSnapPoint(point: SnapPoint): boolean {
  return (
    point.kind === "wall" &&
    point.roomPlacementId !== undefined &&
    point.wallIndex !== undefined &&
    point.wallOffsetMm !== undefined
  );
}

export function snapPointFromRoomWallHit(
  room: PlacedRoom,
  hit: Pick<RoomWallHit, "wallIndex" | "offsetMm">,
  label: string,
  hallwayWidthMm = DEFAULT_HALLWAY_WIDTH_MM,
): Pick<
  SnapPoint,
  | "kind"
  | "roomPlacementId"
  | "wallIndex"
  | "wallOffsetMm"
  | "hallwayWidthMm"
  | "xMm"
  | "zMm"
  | "label"
  | "consumeOnPlace"
> {
  const world = offsetToWorldOnWall(room, hit.wallIndex, hit.offsetMm);
  return {
    kind: "wall",
    roomPlacementId: room.placementId,
    wallIndex: hit.wallIndex,
    wallOffsetMm: Math.round(hit.offsetMm),
    hallwayWidthMm,
    xMm: Math.round(world.x),
    zMm: Math.round(world.z),
    label,
    consumeOnPlace: false,
  };
}

export function nearestWallSnapOnWall(
  snapPoints: SnapPoint[],
  placementId: string,
  wallIndex: number,
  offsetMm: number,
  maxDistanceMm = WALL_SNAP_RADIUS_MM,
): SnapPoint | null {
  let best: SnapPoint | null = null;
  let bestDistance = Infinity;

  for (const point of snapPoints) {
    if (!isWallSnapPoint(point)) continue;
    if (
      point.roomPlacementId !== placementId ||
      point.wallIndex !== wallIndex
    ) {
      continue;
    }
    const distance = Math.abs((point.wallOffsetMm ?? 0) - offsetMm);
    if (distance <= maxDistanceMm && distance < bestDistance) {
      best = point;
      bestDistance = distance;
    }
  }

  return best;
}

export function wallSnapHitFromPoint(
  point: SnapPoint,
): { wallIndex: number; offsetMm: number; widthMm: number } | null {
  if (!isWallSnapPoint(point)) return null;
  return {
    wallIndex: point.wallIndex!,
    offsetMm: point.wallOffsetMm!,
    widthMm: point.hallwayWidthMm ?? DEFAULT_HALLWAY_WIDTH_MM,
  };
}

export function defaultWallSnapLabel(
  snapPoints: SnapPoint[],
  roomName: string,
): string {
  const count = snapPoints.filter(isWallSnapPoint).length;
  const letters = ["A", "B", "C", "D", "E", "F", "G", "H"];
  const label = letters[count] ?? String(count + 1);
  return `Entrance ${label} · ${roomName}`;
}

export function snapPointWorldMm(
  point: SnapPoint,
  rooms: PlacedRoom[],
): { xMm: number; zMm: number } {
  if (
    isWallSnapPoint(point) &&
    point.wallIndex !== undefined &&
    point.wallOffsetMm !== undefined
  ) {
    const room = rooms.find(
      (entry) => entry.placementId === point.roomPlacementId,
    );
    if (room) {
      const world = offsetToWorldOnWall(
        room,
        point.wallIndex,
        point.wallOffsetMm,
      );
      return { xMm: Math.round(world.x), zMm: Math.round(world.z) };
    }
  }
  return { xMm: point.xMm, zMm: point.zMm };
}

export function inwardSnapWorldMm(
  room: PlacedRoom,
  wallIndex: number,
  offsetMm: number,
  insetMm: number,
): { xMm: number; zMm: number } {
  const world = offsetToWorldOnWall(room, wallIndex, offsetMm);
  const outward = linkOutwardNormal(room, wallIndex);

  return {
    xMm: Math.round(world.x - (outward.xMm / 1000) * insetMm),
    zMm: Math.round(world.z - (outward.zMm / 1000) * insetMm),
  };
}

/** Snap target slightly inside the room so furnishings center in the doorway. */
export function furnishSnapWorldMm(
  point: SnapPoint,
  rooms: PlacedRoom[],
  insetMm: number,
): { xMm: number; zMm: number } {
  if (
    !isWallSnapPoint(point) ||
    point.wallIndex === undefined ||
    point.wallOffsetMm === undefined
  ) {
    return snapPointWorldMm(point, rooms);
  }

  const room = rooms.find(
    (entry) => entry.placementId === point.roomPlacementId,
  );
  if (!room) return snapPointWorldMm(point, rooms);

  return inwardSnapWorldMm(room, point.wallIndex, point.wallOffsetMm, insetMm);
}

export function roomWallHitFromWallSnapPoint(
  room: PlacedRoom,
  point: SnapPoint,
): RoomWallHit | null {
  if (
    !isWallSnapPoint(point) ||
    point.wallIndex === undefined ||
    point.wallOffsetMm === undefined
  ) {
    return null;
  }

  const world = offsetToWorldOnWall(
    room,
    point.wallIndex,
    point.wallOffsetMm,
  );
  const outward = linkOutwardNormal(room, point.wallIndex);
  return {
    placementId: room.placementId,
    wallIndex: point.wallIndex,
    segIndex: 0,
    xMm: Math.round(world.x),
    zMm: Math.round(world.z),
    offsetMm: point.wallOffsetMm,
    pointerXMm: Math.round(world.x),
    pointerZMm: Math.round(world.z),
    faceNormalX: outward.xMm / 1000,
    faceNormalZ: outward.zMm / 1000,
  };
}

export function findSnapPointAt(
  xMm: number,
  zMm: number,
  snapPoints: SnapPoint[],
  rooms: PlacedRoom[],
  maxDistanceMm = 140,
): SnapPoint | null {
  let best: SnapPoint | null = null;
  let bestDistance = Infinity;

  for (const point of snapPoints) {
    const world = snapPointWorldMm(point, rooms);
    const radius = isWallSnapPoint(point)
      ? Math.max(maxDistanceMm, WALL_SNAP_CLICK_RADIUS_MM)
      : maxDistanceMm;
    const distance = Math.hypot(world.xMm - xMm, world.zMm - zMm);
    if (distance <= radius && distance < bestDistance) {
      best = point;
      bestDistance = distance;
    }
  }

  return best;
}

export function snapPointPositionM(
  room: PlacedRoom,
  point: SnapPoint,
): [number, number, number] {
  if (
    isWallSnapPoint(point) &&
    point.wallIndex !== undefined &&
    point.wallOffsetMm !== undefined
  ) {
    const world = offsetToWorldOnWall(
      room,
      point.wallIndex,
      point.wallOffsetMm,
    );
    return [world.x * 0.001, room.heightMm * 0.001 * 0.45, world.z * 0.001];
  }
  return [point.xMm * 0.001, 0.02, point.zMm * 0.001];
}
