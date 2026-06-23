import type { Door, DoorHingeSide, PlacedRoom } from "@/tools/room-coat/types/state";
import { clampOpeningOffset } from "@/tools/room-coat/lib/openings-layout";
import {
  doorsForWall,
  offsetInOpening,
  openingsForWall,
  wallSegmentByIndex,
} from "@/tools/room-coat/lib/wall-openings";

const MIN_DOOR_MARGIN_MM = 1;

export interface DoorPlacementInput {
  wallIndex: number;
  offsetFromCornerMm: number;
  widthMm: number;
  heightMm: number;
  hingeSide?: DoorHingeSide;
}

export function doorHorizontalSpan(
  door: Pick<Door, "offsetFromCornerMm" | "widthMm">,
  wallLengthMm: number,
): { startMm: number; endMm: number } {
  return {
    startMm: Math.max(0, door.offsetFromCornerMm),
    endMm: Math.min(wallLengthMm, door.offsetFromCornerMm + door.widthMm),
  };
}

export function doorHingeOffsetMm(
  door: Pick<Door, "offsetFromCornerMm" | "widthMm" | "hingeSide">,
): number {
  const hingeSide: DoorHingeSide = door.hingeSide ?? "left";
  return hingeSide === "left"
    ? door.offsetFromCornerMm
    : door.offsetFromCornerMm + door.widthMm;
}

function intervalsOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
  minOverlapMm = 50,
): boolean {
  const start = Math.max(aStart, bStart);
  const end = Math.min(aEnd, bEnd);
  return end - start >= minOverlapMm;
}

export function doorOverlapsWallOpening(
  room: PlacedRoom,
  wallIndex: number,
  offsetFromCornerMm: number,
  widthMm: number,
): boolean {
  const edge = wallSegmentByIndex(room, wallIndex);
  if (!edge) return true;
  const span = doorHorizontalSpan(
    { offsetFromCornerMm, widthMm },
    edge.lengthMm,
  );
  return openingsForWall(room, wallIndex).some((opening) => {
    const openingStart = Math.min(opening.startMm, opening.endMm);
    const openingEnd = Math.max(opening.startMm, opening.endMm);
    return intervalsOverlap(span.startMm, span.endMm, openingStart, openingEnd);
  });
}

export function validateDoorPlacement(
  room: PlacedRoom,
  door: DoorPlacementInput,
): { valid: boolean; reason?: string } {
  const edge = wallSegmentByIndex(room, door.wallIndex);
  if (!edge) {
    return { valid: false, reason: "Wall not found" };
  }

  if (door.widthMm <= 0 || door.heightMm <= 0) {
    return { valid: false, reason: "Door size is invalid" };
  }

  if (
    door.offsetFromCornerMm < -MIN_DOOR_MARGIN_MM ||
    door.offsetFromCornerMm + door.widthMm > edge.lengthMm + MIN_DOOR_MARGIN_MM
  ) {
    return { valid: false, reason: "Door must fit entirely on the wall" };
  }

  const span = doorHorizontalSpan(door, edge.lengthMm);
  if (span.endMm - span.startMm < door.widthMm - MIN_DOOR_MARGIN_MM) {
    return { valid: false, reason: "Door must fit entirely on the wall" };
  }

  if (doorOverlapsWallOpening(room, door.wallIndex, door.offsetFromCornerMm, door.widthMm)) {
    return { valid: false, reason: "Door cannot overlap a wall opening" };
  }

  const hingeOffset = doorHingeOffsetMm(door);
  if (hingeOffset < -MIN_DOOR_MARGIN_MM || hingeOffset > edge.lengthMm + MIN_DOOR_MARGIN_MM) {
    return { valid: false, reason: "Hinges must be on the wall" };
  }

  if (offsetInOpening(room, door.wallIndex, hingeOffset, 0)) {
    return { valid: false, reason: "Hinges must be on solid wall" };
  }

  return { valid: true };
}

export function clampDoorOnWall(
  room: PlacedRoom,
  door: DoorPlacementInput,
  centerOffsetMm?: number,
): DoorPlacementInput | null {
  const edge = wallSegmentByIndex(room, door.wallIndex);
  if (!edge) return null;

  const offsetFromCornerMm =
    centerOffsetMm === undefined
      ? door.offsetFromCornerMm
      : clampOpeningOffset(edge.lengthMm, door.widthMm, centerOffsetMm);

  const clamped: DoorPlacementInput = {
    ...door,
    offsetFromCornerMm,
  };

  return validateDoorPlacement(room, clamped).valid ? clamped : null;
}

export function doorAtOffsetOnWall(
  room: PlacedRoom,
  wallIndex: number,
  offsetMm: number,
  excludeDoorId?: string,
): Door | null {
  return (
    doorsForWall(room, wallIndex).find((door) => {
      if (excludeDoorId && door.id === excludeDoorId) return false;
      return (
        offsetMm >= door.offsetFromCornerMm &&
        offsetMm <= door.offsetFromCornerMm + door.widthMm
      );
    }) ?? null
  );
}
