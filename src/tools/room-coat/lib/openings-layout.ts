import type { Door, DoorHingeSide, Furnishing, PlacedRoom, Window } from "@/tools/room-coat/types/state";
import {
  analyzeDoorSwing,
  doorClosedDirUnit,
  doorPanelRotationY,
  doorSwingSign,
} from "@/tools/room-coat/lib/door-swing-analysis";
import {
  boundsFromVertices,
  roomVertices,
} from "@/tools/room-coat/lib/room-shape";
import { wallSegmentByIndex } from "@/tools/room-coat/lib/wall-openings";
import { wallPlaneRotationY, WALL_THICKNESS_M } from "@/tools/room-coat/lib/room-geometry";

import { FLOOR_SURFACE_Y_M } from "@/tools/room-coat/lib/room-geometry";

const MM_TO_M = 0.001;
/** Slightly above floor mesh so swing markings read clearly on the floor. */
export const DOOR_SWING_FLOOR_Y_M = FLOOR_SURFACE_Y_M + 0.008;

export interface OpeningPanelLayout {
  id: string;
  kind: "door" | "window";
  position: [number, number, number];
  rotation: [number, number, number];
  size: [number, number];
}

export interface DoorSwingLayout {
  doorId: string;
  hinge: [number, number, number];
  radiusM: number;
  closedDirLocal: { x: number; z: number };
  swingSign: number;
  clearSweepRad: number;
  maxSweepRad: number;
  obstructed: boolean;
  panelRotationY: number;
  hingeSide: DoorHingeSide;
  panel: OpeningPanelLayout;
}

function wallOpeningCenterLocal(
  room: PlacedRoom,
  wallIndex: number,
  offsetFromCornerMm: number,
  widthMm: number,
): {
  localX: number;
  localZ: number;
  rotY: number;
  nx: number;
  nz: number;
} | null {
  const edge = wallSegmentByIndex(room, wallIndex);
  if (!edge) return null;
  const bounds = boundsFromVertices(roomVertices(room));
  const centerAlong = offsetFromCornerMm + widthMm / 2;
  const t = centerAlong / edge.lengthMm;
  const worldX = edge.x1 + (edge.x2 - edge.x1) * t;
  const worldZ = edge.z1 + (edge.z2 - edge.z1) * t;
  const nx = edge.outwardNormalX;
  const nz = edge.outwardNormalZ;
  return {
    localX: (worldX - bounds.centerXMm) * MM_TO_M,
    localZ: (worldZ - bounds.centerZMm) * MM_TO_M,
    rotY: wallPlaneRotationY(nx, nz) + Math.PI,
    nx,
    nz,
  };
}

export function layoutDoorPanel(
  room: PlacedRoom,
  door: Door,
): OpeningPanelLayout | null {
  const layout = wallOpeningCenterLocal(
    room,
    door.wallIndex,
    door.offsetFromCornerMm,
    door.widthMm,
  );
  if (!layout) {
    return null;
  }
  const edge = wallSegmentByIndex(room, door.wallIndex);
  const doorH = door.heightMm * MM_TO_M;
  const doorW = door.widthMm * MM_TO_M;
  return {
    id: door.id,
    kind: "door",
    position: [layout.localX, doorH / 2, layout.localZ],
    rotation: [0, edge ? doorPanelRotationY(room, door) : layout.rotY, 0],
    size: [doorW, doorH],
  };
}

export function layoutWindowPanel(
  room: PlacedRoom,
  window: Window,
): OpeningPanelLayout | null {
  const layout = wallOpeningCenterLocal(
    room,
    window.wallIndex,
    window.offsetFromCornerMm,
    window.widthMm,
  );
  if (!layout) return null;
  const heightM = window.heightMm * MM_TO_M;
  const widthM = window.widthMm * MM_TO_M;
  const sillM = window.sillHeightMm * MM_TO_M;
  return {
    id: window.id,
    kind: "window",
    position: [layout.localX, sillM + heightM / 2, layout.localZ],
    rotation: [0, layout.rotY, 0],
    size: [widthM, heightM],
  };
}

export function layoutDoorSwing(
  room: PlacedRoom,
  door: Door,
  furnishings: Furnishing[] = [],
  allRooms: PlacedRoom[] = [room],
): DoorSwingLayout | null {
  const edge = wallSegmentByIndex(room, door.wallIndex);
  const panel = layoutDoorPanel(room, door);
  if (!edge || !panel) return null;

  const bounds = boundsFromVertices(roomVertices(room));
  const hingeSide: DoorHingeSide = door.hingeSide ?? "left";
  const hingeOffsetMm =
    hingeSide === "left"
      ? door.offsetFromCornerMm
      : door.offsetFromCornerMm + door.widthMm;
  const t = hingeOffsetMm / edge.lengthMm;
  const hingeWorldX = edge.x1 + (edge.x2 - edge.x1) * t;
  const hingeWorldZ = edge.z1 + (edge.z2 - edge.z1) * t;
  const hingeX = (hingeWorldX - bounds.centerXMm) * MM_TO_M;
  const hingeZ = (hingeWorldZ - bounds.centerZMm) * MM_TO_M;

  const closedDir = doorClosedDirUnit(room, door);
  if (!closedDir) return null;

  const swingSign = doorSwingSign(room, door);
  const obstruction = analyzeDoorSwing(
    room,
    door,
    furnishings,
    allRooms,
    door.id,
  );

  return {
    doorId: door.id,
    hinge: [hingeX, DOOR_SWING_FLOOR_Y_M, hingeZ],
    radiusM: door.widthMm * MM_TO_M,
    closedDirLocal: closedDir,
    swingSign,
    clearSweepRad: obstruction.clearAngleRad,
    maxSweepRad: obstruction.maxAngleRad,
    obstructed: obstruction.obstructed,
    panelRotationY: doorPanelRotationY(room, door),
    hingeSide,
    panel,
  };
}

/** Draft/preview door without a persisted id. */
export function layoutDoorSwingPreview(
  room: PlacedRoom,
  door: Omit<Door, "id" | "overridePaintId"> & { id?: string },
  furnishings: Furnishing[] = [],
  allRooms: PlacedRoom[] = [room],
): DoorSwingLayout | null {
  return layoutDoorSwing(
    room,
    {
      ...door,
      id: door.id ?? "__preview__",
      overridePaintId: null,
    },
    furnishings,
    allRooms,
  );
}

export function clampOpeningOffset(
  wallLengthMm: number,
  widthMm: number,
  centerOffsetMm: number,
): number {
  const half = widthMm / 2;
  const clampedCenter = Math.max(half, Math.min(wallLengthMm - half, centerOffsetMm));
  return Math.round(clampedCenter - half);
}
