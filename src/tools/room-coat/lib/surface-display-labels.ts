import type { SurfaceCategory, WallSide } from "@/tools/room-coat/types/state";

export const WALL_LABELS: Record<WallSide, string> = {
  north: "North Wall",
  south: "South Wall",
  east: "East Wall",
  west: "West Wall",
};

export function surfaceCategoryTitle(category: SurfaceCategory): string {
  switch (category) {
    case "wall":
      return "Wall";
    case "baseboard":
      return "Baseboard";
    case "ceiling":
      return "Ceiling";
    case "door":
      return "Door";
  }
}

export function meshCategoryTitle(
  category: SurfaceCategory | "floor",
): string {
  if (category === "floor") return "Floor";
  return surfaceCategoryTitle(category);
}

export function roomWallSurfaceLabel(
  roomName: string,
  wall: WallSide,
  segIndex: number,
  hasPartial: boolean,
): string {
  if (hasPartial) {
    return `${roomName} — ${WALL_LABELS[wall]} (Section ${segIndex + 1})`;
  }
  return `${roomName} — ${WALL_LABELS[wall]}`;
}

export function roomDoorSurfaceLabel(roomName: string, wall: WallSide): string {
  return `${roomName} — Door (${WALL_LABELS[wall]})`;
}

export function roomCeilingSurfaceLabel(roomName: string): string {
  return `${roomName} — Ceiling`;
}

export function roomFloorSurfaceLabel(roomName: string): string {
  return `${roomName} — Floor`;
}

export function hallwaySegmentWallLabel(
  hallwayName: string,
  segIndex: number,
  sideIndex: number,
): string {
  return `${hallwayName} — Segment ${segIndex + 1} Wall ${sideIndex + 1}`;
}

export function hallwaySegmentCeilingLabel(
  hallwayName: string,
  segIndex: number,
): string {
  return `${hallwayName} — Segment ${segIndex + 1} Ceiling`;
}

export function hallwayCornerCeilingLabel(
  hallwayName: string,
  cornerIndex: number,
): string {
  return `${hallwayName} — Corner ${cornerIndex} Ceiling`;
}

export function hallwaySegmentFloorLabel(
  hallwayName: string,
  segIndex: number,
): string {
  return `${hallwayName} — Segment ${segIndex + 1} Floor`;
}

export function hallwayCornerSurfaceLabel(
  hallwayName: string,
  cornerIndex: number,
  category: "floor" | "ceiling",
): string {
  return `${hallwayName} — Corner ${cornerIndex} ${meshCategoryTitle(category)}`;
}
