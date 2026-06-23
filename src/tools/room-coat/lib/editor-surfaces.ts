import type { PlacedRoom } from "@/tools/room-coat/types/state";
import { projectPointToWall, wallSegmentByIndex } from "@/tools/room-coat/lib/wall-openings";

export type EditorTool =
  | "select"
  | "paint"
  | "move"
  | "furnish"
  | "snap-point"
  | "measure"
  | "add-room"
  | "hallway"
  | "open-walls"
  | "add-door"
  | "add-window";

export interface RoomWallHit {
  placementId: string;
  wallIndex: number;
  segIndex: number;
  /** World coordinates in mm (on wall surface). */
  xMm: number;
  zMm: number;
  offsetMm: number;
  /** Raw pointer position in world mm. */
  pointerXMm: number;
  pointerZMm: number;
  /** Unit normal on clicked face in world XZ (away from clicked side). */
  faceNormalX: number;
  faceNormalZ: number;
}

const WALL_PATTERN = /^(.+):wall:(\d+):(\d+)$/;

export function parseRoomWallSurfaceId(
  surfaceId: string,
): { placementId: string; wallIndex: number; segIndex: number } | null {
  const match = surfaceId.match(WALL_PATTERN);
  if (!match) return null;
  return {
    placementId: match[1],
    wallIndex: Number(match[2]),
    segIndex: Number(match[3]),
  };
}

const HALLWAY_SURFACE_PATTERN =
  /^(.+):seg:(\d+):(wall|baseboard|ceiling):(\d+)(?::(\d+))?$/;

export function parseHallwaySurfaceId(
  surfaceId: string,
): {
  hallwayId: string;
  segIndex: number;
  category: "wall" | "baseboard" | "ceiling";
  sideIndex: number;
  partIndex: number;
} | null {
  const match = surfaceId.match(HALLWAY_SURFACE_PATTERN);
  if (!match) return null;
  return {
    hallwayId: match[1],
    segIndex: Number(match[2]),
    category: match[3] as "wall" | "baseboard" | "ceiling",
    sideIndex: Number(match[4]),
    partIndex: match[5] !== undefined ? Number(match[5]) : 0,
  };
}

const HALLWAY_CORNER_PATTERN = /^(.+):corner:(\d+):ceiling$/;

export function parseHallwayCornerSurfaceId(
  surfaceId: string,
): { hallwayId: string; cornerIndex: number } | null {
  const match = surfaceId.match(HALLWAY_CORNER_PATTERN);
  if (!match) return null;
  return { hallwayId: match[1], cornerIndex: Number(match[2]) };
}

/** `xMm` / `zMm` must be in floor-local coordinates. */
export function roomWallHitFromPointer(
  room: PlacedRoom,
  wallIndex: number,
  xMm: number,
  zMm: number,
  faceNormalX = 0,
  faceNormalZ = 0,
): RoomWallHit | null {
  const pointerXMm = xMm;
  const pointerZMm = zMm;
  const projected = projectPointToWall(room, wallIndex, pointerXMm, pointerZMm);
  if (!projected) return null;

  const len = Math.hypot(faceNormalX, faceNormalZ);
  const nx = len > 0.001 ? faceNormalX / len : 0;
  const nz = len > 0.001 ? faceNormalZ / len : 0;

  return {
    placementId: room.placementId,
    wallIndex,
    segIndex: 0,
    xMm: projected.x,
    zMm: projected.z,
    offsetMm: projected.offsetMm,
    pointerXMm,
    pointerZMm,
    faceNormalX: nx,
    faceNormalZ: nz,
  };
}

export function roomWallHitFromOpeningCenter(
  room: PlacedRoom,
  wallIndex: number,
  offsetFromCornerMm: number,
  widthMm: number,
): RoomWallHit | null {
  const edge = wallSegmentByIndex(room, wallIndex);
  if (!edge) return null;
  const offsetMm = offsetFromCornerMm + widthMm / 2;
  const t = offsetMm / edge.lengthMm;
  const xMm = edge.x1 + (edge.x2 - edge.x1) * t;
  const zMm = edge.z1 + (edge.z2 - edge.z1) * t;
  return roomWallHitFromPointer(
    room,
    wallIndex,
    xMm,
    zMm,
    edge.outwardNormalX,
    edge.outwardNormalZ,
  );
}

export const EDITOR_TOOLS: Array<{
  id: EditorTool;
  label: string;
  shortLabel: string;
}> = [
  { id: "select", label: "Select", shortLabel: "Select" },
  { id: "move", label: "Move rooms", shortLabel: "Move" },
  { id: "furnish", label: "Furnish", shortLabel: "Furnish" },
  { id: "snap-point", label: "Snap points", shortLabel: "Snaps" },
  { id: "measure", label: "Measure", shortLabel: "Measure" },
  { id: "paint", label: "Paint", shortLabel: "Paint" },
];

export const TOOL_HINTS: Record<EditorTool, string> = {
  select:
    "Click to select surfaces, rooms, and furnishings. Hover faces and edges for dimensions.",
  paint: "Click a surface to inspect and override paint.",
  move: "Click a room floor, door, window, or furnishing · drag to reposition",
  furnish: "Pick a preset, click the floor to place, then drag to position. Press R to rotate.",
  "snap-point":
    "Click the floor to place a pin · click an existing pin to delete · drag to reposition · furniture faces show center snap points.",
  measure:
    "Click to set start, then end. The tape stays visible in other tools. Use Snap points to pin along it.",
  "add-room":
    "Click corners to draw a room (Enter to finish), drag for a quick rectangle, or use Square in the toolbar.",
  hallway:
    "Set entrance A, then exit B. Use green alignment guides or drag the purple arrow — hallway draws when you pick a route.",
  "open-walls":
    "Click two points on the same wall to open it. Purple dot marks the first click.",
  "add-door":
    "Hover a wall to preview · click to place · Esc cancels",
  "add-window":
    "Click a wall where the window should go. A white glazed opening is shown.",
};
