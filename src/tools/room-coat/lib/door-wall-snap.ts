import { clampOpeningOffset } from "@/tools/room-coat/lib/openings-layout";
import { nearestWallSnapOnWall } from "@/tools/room-coat/lib/snap-point-utils";
import { wallSegmentByIndex } from "@/tools/room-coat/lib/wall-openings";
import type { Door, PlacedRoom, SnapPoint } from "@/tools/room-coat/types/state";

const DOOR_WALL_SNAP_RADIUS_MM = 450;

export type DoorMoveAnchor = "center" | "left" | "right";

/** Which part of the door the pointer is dragging. */
export function doorMoveAnchorFromClick(
  door: Pick<Door, "offsetFromCornerMm" | "widthMm">,
  clickOffsetMm: number,
): DoorMoveAnchor {
  const center = door.offsetFromCornerMm + door.widthMm / 2;
  const left = door.offsetFromCornerMm;
  const right = door.offsetFromCornerMm + door.widthMm;
  const edgeBandMm = Math.max(120, door.widthMm * 0.22);

  if (Math.abs(clickOffsetMm - left) <= edgeBandMm) return "left";
  if (Math.abs(clickOffsetMm - right) <= edgeBandMm) return "right";
  if (Math.abs(clickOffsetMm - center) <= edgeBandMm) return "center";

  const distLeft = Math.abs(clickOffsetMm - left);
  const distRight = Math.abs(clickOffsetMm - right);
  const distCenter = Math.abs(clickOffsetMm - center);
  if (distLeft <= distRight && distLeft <= distCenter) return "left";
  if (distRight <= distCenter) return "right";
  return "center";
}

export function doorCenterOffsetForAnchor(
  pointerOffsetMm: number,
  widthMm: number,
  anchor: DoorMoveAnchor,
): number {
  switch (anchor) {
    case "left":
      return pointerOffsetMm + widthMm / 2;
    case "right":
      return pointerOffsetMm - widthMm / 2;
    case "center":
      return pointerOffsetMm;
  }
}

export function snapDoorCenterOffsetMm(
  snapPoints: SnapPoint[],
  placementId: string,
  wallIndex: number,
  centerOffsetMm: number,
  maxDistanceMm = DOOR_WALL_SNAP_RADIUS_MM,
): number {
  const snap = nearestWallSnapOnWall(
    snapPoints,
    placementId,
    wallIndex,
    centerOffsetMm,
    maxDistanceMm,
  );
  return snap?.wallOffsetMm ?? centerOffsetMm;
}

export function resolveDoorWallOffsetMm(
  room: PlacedRoom,
  snapPoints: SnapPoint[],
  wallIndex: number,
  pointerOffsetMm: number,
  widthMm: number,
  anchor: DoorMoveAnchor = "center",
): number | null {
  const edge = wallSegmentByIndex(room, wallIndex);
  if (!edge) return null;

  let centerOffset = doorCenterOffsetForAnchor(pointerOffsetMm, widthMm, anchor);
  centerOffset = snapDoorCenterOffsetMm(
    snapPoints,
    room.placementId,
    wallIndex,
    centerOffset,
  );
  return clampOpeningOffset(edge.lengthMm, widthMm, centerOffset);
}
