import type { PlacedRoom, WallSide } from "@/tools/room-coat/types/state";
import { projectPointToWall } from "@/tools/room-coat/lib/wall-openings";

const MM_TO_M = 0.001;

export type EditorTool = "paint" | "move" | "add-room" | "hallway" | "open-walls";

export interface RoomWallHit {
  placementId: string;
  wall: WallSide;
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

const WALL_PATTERN =
  /^(.+):wall:(north|south|east|west):(\d+)$/;

export function parseRoomWallSurfaceId(
  surfaceId: string,
): { placementId: string; wall: WallSide; segIndex: number } | null {
  const match = surfaceId.match(WALL_PATTERN);
  if (!match) return null;
  return {
    placementId: match[1],
    wall: match[2] as WallSide,
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

export function roomWallHitFromPointer(
  room: PlacedRoom,
  wall: WallSide,
  worldXM: number,
  worldZM: number,
  faceNormalX = 0,
  faceNormalZ = 0,
): RoomWallHit | null {
  const pointerXMm = worldXM / MM_TO_M;
  const pointerZMm = worldZM / MM_TO_M;
  const projected = projectPointToWall(room, wall, pointerXMm, pointerZMm);
  if (!projected) return null;

  const len = Math.hypot(faceNormalX, faceNormalZ);
  const nx = len > 0.001 ? faceNormalX / len : 0;
  const nz = len > 0.001 ? faceNormalZ / len : 0;

  return {
    placementId: room.placementId,
    wall,
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

export const EDITOR_TOOLS: Array<{ id: EditorTool; label: string }> = [
  { id: "move", label: "Move rooms" },
  { id: "paint", label: "Paint" },
  { id: "add-room", label: "Add room" },
  { id: "hallway", label: "Draw hallway" },
  { id: "open-walls", label: "Open walls" },
];

export const TOOL_HINTS: Record<EditorTool, string> = {
  paint: "Click a wall, ceiling, baseboard, door, or hallway surface to inspect and override paint.",
  move: "Click a room floor to select it, then drag the floor to reposition.",
  "add-room": "Pick a catalog room below and add it to this unit.",
  hallway:
    "Click a wall to start, drag on the floor to stretch, click for corners or another wall to finish.",
  "open-walls":
    "Click two points on the same wall to open it. Purple dot marks the first click.",
};
