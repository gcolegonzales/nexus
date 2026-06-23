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
    case "window":
      return "Window";
    case "floor":
      return "Floor";
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
  wallIndex: number,
  segIndex: number,
  hasPartial: boolean,
): string {
  const wallNum = wallIndex + 1;
  if (hasPartial) {
    return `${roomName} — Wall ${wallNum} (Section ${segIndex + 1})`;
  }
  return `${roomName} — Wall ${wallNum}`;
}

export function roomDoorSurfaceLabel(
  roomName: string,
  wallIndex: number,
): string {
  return `${roomName} — Door (Wall ${wallIndex + 1})`;
}

export function roomWindowSurfaceLabel(
  roomName: string,
  wallIndex: number,
): string {
  return `${roomName} — Window (Wall ${wallIndex + 1})`;
}

export function roomCeilingSurfaceLabel(roomName: string): string {
  return `${roomName} — Ceiling`;
}

export function roomFloorSurfaceLabel(roomName: string): string {
  return `${roomName} — Floor`;
}

export function roomBaseboardSurfaceLabel(roomName: string): string {
  return `${roomName} — Baseboards`;
}

export function hallwayBaseboardSurfaceLabel(hallwayName: string): string {
  return `${hallwayName} — Baseboards`;
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
