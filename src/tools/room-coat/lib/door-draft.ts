import type { RoomWallHit } from "@/tools/room-coat/lib/editor-surfaces";
import { validateDoorPlacement } from "@/tools/room-coat/lib/door-placement";
import { wallSegmentByIndex } from "@/tools/room-coat/lib/wall-openings";
import { defaultDoorDimensionsMm } from "@/tools/room-coat/lib/units";
import type { Door, DoorHingeSide, PlacedRoom } from "@/tools/room-coat/types/state";

export interface DoorDraft {
  placementId: string;
  wallIndex: number;
  offsetFromCornerMm: number;
  widthMm: number;
  heightMm: number;
  hingeSide: DoorHingeSide;
  swingsInward: boolean;
}

export function createDoorDraft(
  placementId: string,
  wallIndex: number,
  offsetFromCornerMm: number,
  patch?: Partial<DoorDraft>,
): DoorDraft {
  const defaults = defaultDoorDimensionsMm();
  return {
    placementId,
    wallIndex,
    offsetFromCornerMm,
    widthMm: defaults.widthMm,
    heightMm: defaults.heightMm,
    hingeSide: "left",
    swingsInward: true,
    ...patch,
  };
}

/** Clamp hit.offsetMm (door center along wall) to a valid span on that wall. */
export function resolveDoorWallHit(
  room: PlacedRoom,
  hit: RoomWallHit,
  widthMm = defaultDoorDimensionsMm().widthMm,
): RoomWallHit {
  const edge = wallSegmentByIndex(room, hit.wallIndex);
  if (!edge) return hit;
  const half = widthMm / 2;
  const centerOffsetMm = Math.max(
    half,
    Math.min(edge.lengthMm - half, hit.offsetMm),
  );
  return { ...hit, offsetMm: centerOffsetMm };
}

export function doorCenterToLeftEdge(
  room: PlacedRoom,
  wallIndex: number,
  centerOffsetMm: number,
  widthMm: number,
): number | null {
  const edge = wallSegmentByIndex(room, wallIndex);
  if (!edge) return null;
  const half = widthMm / 2;
  const clampedCenter = Math.max(
    half,
    Math.min(edge.lengthMm - half, centerOffsetMm),
  );
  return Math.round(clampedCenter - half);
}

export function doorDraftFromWallHit(
  room: PlacedRoom,
  hit: RoomWallHit,
  existing?: DoorDraft | null,
): DoorDraft | null {
  const edge = wallSegmentByIndex(room, hit.wallIndex);
  if (!edge) return null;
  const widthMm = existing?.widthMm ?? defaultDoorDimensionsMm().widthMm;
  const heightMm = existing?.heightMm ?? defaultDoorDimensionsMm().heightMm;
  const hingeSide = existing?.hingeSide ?? "left";
  const swingsInward = existing?.swingsInward ?? true;

  const offsetFromCornerMm = doorCenterToLeftEdge(
    room,
    hit.wallIndex,
    hit.offsetMm,
    widthMm,
  );
  if (offsetFromCornerMm === null) return null;

  const candidate = {
    wallIndex: hit.wallIndex,
    offsetFromCornerMm,
    widthMm,
    heightMm,
    hingeSide,
  };
  if (!validateDoorPlacement(room, candidate).valid) return null;

  if (existing) {
    return {
      ...existing,
      placementId: hit.placementId,
      wallIndex: hit.wallIndex,
      offsetFromCornerMm,
    };
  }
  return createDoorDraft(
    hit.placementId,
    hit.wallIndex,
    offsetFromCornerMm,
    { widthMm, heightMm, hingeSide, swingsInward },
  );
}

export function isDoorDraftValid(
  room: PlacedRoom,
  draft: DoorDraft,
): boolean {
  return validateDoorPlacement(room, draft).valid;
}

export function doorDraftAsDoor(
  draft: DoorDraft,
): Omit<Door, "id" | "overridePaintId"> {
  return {
    wallIndex: draft.wallIndex,
    offsetFromCornerMm: draft.offsetFromCornerMm,
    widthMm: draft.widthMm,
    heightMm: draft.heightMm,
    hingeSide: draft.hingeSide,
    swingsInward: draft.swingsInward,
  };
}

const DOOR_SURFACE_PATTERN = /^(.+):door:(.+)$/;

export function parseDoorSurfaceId(
  surfaceId: string,
): { placementId: string; doorId: string } | null {
  const match = surfaceId.match(DOOR_SURFACE_PATTERN);
  if (!match) return null;
  return { placementId: match[1], doorId: match[2] };
}
