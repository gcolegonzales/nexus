import type { Door, PlacedRoom, Window } from "@/tools/room-coat/types/state";
import type { AxisBounds } from "@/tools/room-coat/lib/floor-utils";
import {
  boundsFromVertices,
  roomVertices,
  roomWallSegments,
  verticesToLocalM,
} from "@/tools/room-coat/lib/room-shape";
import {
  wallSegmentByIndex,
  wallSolidSpans,
  wallStructureParts,
} from "@/tools/room-coat/lib/wall-openings";
import { doorPanelRotationY, wallSegmentAlongDir } from "@/tools/room-coat/lib/door-swing-analysis";

const MM_TO_M = 0.001;
const BASEBOARD_HEIGHT_M = 0.08;
const BASEBOARD_DEPTH_M = 0.02;
/** Visual / structural wall depth for door frames and cutouts. */
export const WALL_THICKNESS_M = 0.12;
const FLOOR_COLOR = "#64748b";
export const FLOOR_SURFACE_Y_M = 0.012;
export const SCENE_GRID_Y_M = -0.05;

/** Y rotation so a vertical plane's +Z normal aligns with (nx, 0, nz). */
export function wallPlaneRotationY(outwardNormalX: number, outwardNormalZ: number): number {
  return Math.atan2(outwardNormalX, outwardNormalZ);
}

/** True when wall mesh local +X runs opposite the wall edge (corner1 → corner2). */
function wallMeshHoleXFlipped(edge: {
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  outwardNormalX: number;
  outwardNormalZ: number;
}): boolean {
  const along = wallSegmentAlongDir(edge);
  const rotY = wallPlaneRotationY(edge.outwardNormalX, edge.outwardNormalZ) + Math.PI;
  const localX = { x: Math.cos(rotY), z: -Math.sin(rotY) };
  return localX.x * along.x + localX.z * along.z < 0;
}

export interface SurfaceMeshSpec {
  surfaceId: string;
  category: "wall" | "baseboard" | "ceiling" | "door" | "window" | "floor";
  position: [number, number, number];
  rotation: [number, number, number];
  size: [number, number];
  color?: string;
  /** Room-local polygon vertices (meters, xz) for non-rect floors/ceilings. */
  polygonLocalM?: Array<[number, number]>;
  /**
   * Rectangular cutouts in wall-local plane meters (centered geometry coords).
   * Used for door openings without splitting the wall mesh at jambs.
   */
  wallRectHolesM?: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
}

export interface RoomMeshOptions {
  showCeiling: boolean;
  showFloor?: boolean;
}

export function roomDimensionsM(room: PlacedRoom) {
  return {
    width: room.widthMm * MM_TO_M,
    length: room.lengthMm * MM_TO_M,
    height: room.heightMm * MM_TO_M,
  };
}

export function roomWorldOffsetM(room: PlacedRoom): [number, number, number] {
  const bounds = boundsFromVertices(roomVertices(room));
  return [bounds.centerXMm * MM_TO_M, 0, bounds.centerZMm * MM_TO_M];
}

function segmentMidpointLocal(
  room: PlacedRoom,
  wallIndex: number,
  startMm: number,
  endMm: number,
): { localX: number; localZ: number; angleRad: number; segLenM: number } {
  const edge = wallSegmentByIndex(room, wallIndex)!;
  const bounds = boundsFromVertices(roomVertices(room));
  const t0 = startMm / edge.lengthMm;
  const t1 = endMm / edge.lengthMm;
  const sx = edge.x1 + (edge.x2 - edge.x1) * t0;
  const sz = edge.z1 + (edge.z2 - edge.z1) * t0;
  const ex = edge.x1 + (edge.x2 - edge.x1) * t0 + (edge.x2 - edge.x1) * (t1 - t0);
  const ez = edge.z1 + (edge.z2 - edge.z1) * t0 + (edge.z2 - edge.z1) * (t1 - t0);
  const midX = (sx + ex) / 2;
  const midZ = (sz + ez) / 2;
  const angleRad = Math.atan2(edge.z2 - edge.z1, edge.x2 - edge.x1);
  return {
    localX: (midX - bounds.centerXMm) * MM_TO_M,
    localZ: (midZ - bounds.centerZMm) * MM_TO_M,
    angleRad,
    segLenM: (endMm - startMm) * MM_TO_M,
  };
}

function segmentWallPlaneSpec(
  room: PlacedRoom,
  wallIndex: number,
  segIndex: number,
  startMm: number,
  endMm: number,
  category: "wall" | "baseboard",
  bottomMm: number,
  topMm: number,
  wallRectHolesM?: SurfaceMeshSpec["wallRectHolesM"],
): SurfaceMeshSpec {
  const id = room.placementId;
  const edge = wallSegmentByIndex(room, wallIndex)!;
  const { localX, localZ, segLenM } = segmentMidpointLocal(
    room,
    wallIndex,
    startMm,
    endMm,
  );
  const nx = edge.outwardNormalX;
  const nz = edge.outwardNormalZ;
  const rotY = wallPlaneRotationY(nx, nz) + Math.PI;
  const heightM = Math.max((topMm - bottomMm) * MM_TO_M, 0.001);
  const centerYM = bottomMm * MM_TO_M + heightM / 2;

  if (category === "wall") {
    return {
      surfaceId: `${id}:wall:${wallIndex}:${segIndex}`,
      category: "wall",
      position: [localX - nx * 0.001, centerYM, localZ - nz * 0.001],
      rotation: [0, rotY, 0],
      size: [segLenM, heightM],
      wallRectHolesM,
    };
  }

  const bbH = Math.min(BASEBOARD_HEIGHT_M, heightM);
  const inset = BASEBOARD_DEPTH_M / 2;
  return {
    surfaceId: `${id}:baseboard:${wallIndex}:${segIndex}`,
    category: "baseboard",
    position: [
      localX - nx * inset,
      bbH / 2,
      localZ - nz * inset,
    ],
    rotation: [0, rotY, 0],
    size: [segLenM, bbH],
  };
}

function openingHolesInWallSpanM(
  spanStartMm: number,
  spanEndMm: number,
  spanLenM: number,
  wallHeightM: number,
  doors: Array<{ offsetFromCornerMm: number; widthMm: number; heightMm: number }>,
  windows: Array<{
    offsetFromCornerMm: number;
    widthMm: number;
    heightMm: number;
    sillHeightMm: number;
  }>,
  flipHoleX: boolean,
): SurfaceMeshSpec["wallRectHolesM"] {
  const holes: NonNullable<SurfaceMeshSpec["wallRectHolesM"]> = [];
  const halfW = spanLenM / 2;
  const halfH = wallHeightM / 2;

  function pushHole(
    clipStart: number,
    clipEnd: number,
    bottomMm: number,
    topMm: number,
  ) {
    if (clipEnd - clipStart < 1) return;
    const leftM = (clipStart - spanStartMm) * MM_TO_M;
    const widthM = (clipEnd - clipStart) * MM_TO_M;
    const heightM = (topMm - bottomMm) * MM_TO_M;
    const centerYM = (bottomMm + topMm) * 0.5 * MM_TO_M;
    let x = leftM - halfW + widthM / 2;
    if (flipHoleX) x = -x;
    holes.push({
      x,
      y: centerYM - halfH,
      width: widthM,
      height: heightM,
    });
  }

  for (const door of doors) {
    pushHole(
      Math.max(spanStartMm, door.offsetFromCornerMm),
      Math.min(spanEndMm, door.offsetFromCornerMm + door.widthMm),
      0,
      door.heightMm,
    );
  }

  for (const window of windows) {
    pushHole(
      Math.max(spanStartMm, window.offsetFromCornerMm),
      Math.min(spanEndMm, window.offsetFromCornerMm + window.widthMm),
      window.sillHeightMm,
      window.sillHeightMm + window.heightMm,
    );
  }

  return holes.length > 0 ? holes : undefined;
}

export function buildRoomSurfaceSpecs(
  room: PlacedRoom,
  options: RoomMeshOptions,
): SurfaceMeshSpec[] {
  const { height: h } = roomDimensionsM(room);
  const id = room.placementId;
  const specs: SurfaceMeshSpec[] = [];
  const vertices = roomVertices(room);
  const bounds = boundsFromVertices(vertices);
  const polygonLocalM = verticesToLocalM(
    vertices,
    bounds.centerXMm,
    bounds.centerZMm,
  );

  if (room.closed && options.showFloor !== false) {
    specs.push({
      surfaceId: `${id}:floor`,
      category: "floor",
      position: [0, FLOOR_SURFACE_Y_M, 0],
      rotation: [-Math.PI / 2, 0, 0],
      size: [bounds.widthMm * MM_TO_M, bounds.lengthMm * MM_TO_M],
      color: FLOOR_COLOR,
      polygonLocalM,
    });
  }

  for (const segment of roomWallSegments(room)) {
    const spans = wallSolidSpans(room, segment.wallIndex);
    spans.forEach((span, segIndex) => {
      const wallHeightM = room.heightMm * MM_TO_M;
      const segLenM = span.lengthMm * MM_TO_M;
      const wallHoles = openingHolesInWallSpanM(
        span.startMm,
        span.endMm,
        segLenM,
        wallHeightM,
        span.doors,
        span.windows,
        wallMeshHoleXFlipped(segment),
      );
      specs.push(
        segmentWallPlaneSpec(
          room,
          segment.wallIndex,
          segIndex,
          span.startMm,
          span.endMm,
          "wall",
          0,
          room.heightMm,
          wallHoles,
        ),
      );
    });

    const baseboardParts = wallStructureParts(room, segment.wallIndex);
    baseboardParts.forEach((part, segIndex) => {
      if (part.bottomMm > 1) return;
      specs.push(
        segmentWallPlaneSpec(
          room,
          segment.wallIndex,
          segIndex,
          part.startMm,
          part.endMm,
          "baseboard",
          part.bottomMm,
          part.topMm,
        ),
      );
    });
  }

  if (room.closed && options.showCeiling) {
    const ceilingLocalM = verticesToLocalM(
      vertices,
      bounds.centerXMm,
      bounds.centerZMm,
      { reverseWinding: true },
    );
    specs.push({
      surfaceId: `${id}:ceiling`,
      category: "ceiling",
      position: [0, h, 0],
      rotation: [-Math.PI / 2, 0, 0],
      size: [bounds.widthMm * MM_TO_M, bounds.lengthMm * MM_TO_M],
      polygonLocalM: ceilingLocalM,
    });
  }

  for (const door of room.doors) {
    specs.push(buildDoorSpec(room, door, h));
  }

  for (const window of room.windows ?? []) {
    specs.push(buildWindowSpec(room, window));
  }

  return specs;
}

function buildWindowSpec(room: PlacedRoom, window: Window): SurfaceMeshSpec {
  const edge = wallSegmentByIndex(room, window.wallIndex);
  if (!edge) {
    return {
      surfaceId: `${room.placementId}:window:${window.id}`,
      category: "window",
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      size: [0, 0],
    };
  }

  const bounds = boundsFromVertices(roomVertices(room));
  const windowW = window.widthMm * MM_TO_M;
  const windowH = window.heightMm * MM_TO_M;
  const sillM = window.sillHeightMm * MM_TO_M;
  const t = (window.offsetFromCornerMm + window.widthMm / 2) / edge.lengthMm;
  const worldX = edge.x1 + (edge.x2 - edge.x1) * t;
  const worldZ = edge.z1 + (edge.z2 - edge.z1) * t;
  const localX = (worldX - bounds.centerXMm) * MM_TO_M;
  const localZ = (worldZ - bounds.centerZMm) * MM_TO_M;
  const nx = edge.outwardNormalX;
  const nz = edge.outwardNormalZ;
  const rotY = wallPlaneRotationY(nx, nz) + Math.PI;

  return {
    surfaceId: `${room.placementId}:window:${window.id}`,
    category: "window",
    position: [localX, sillM + windowH / 2, localZ],
    rotation: [0, rotY, 0],
    size: [windowW, windowH],
  };
}

function buildDoorSpec(
  room: PlacedRoom,
  door: Door,
  roomHeightM: number,
): SurfaceMeshSpec {
  const edge = wallSegmentByIndex(room, door.wallIndex);
  if (!edge) {
    return {
      surfaceId: `${room.placementId}:door:${door.id}`,
      category: "door",
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      size: [0, 0],
    };
  }

  const bounds = boundsFromVertices(roomVertices(room));
  const doorW = door.widthMm * MM_TO_M;
  const doorH = door.heightMm * MM_TO_M;
  const t = (door.offsetFromCornerMm + door.widthMm / 2) / edge.lengthMm;
  const worldX = edge.x1 + (edge.x2 - edge.x1) * t;
  const worldZ = edge.z1 + (edge.z2 - edge.z1) * t;
  const localX = (worldX - bounds.centerXMm) * MM_TO_M;
  const localZ = (worldZ - bounds.centerZMm) * MM_TO_M;
  const rotY = doorPanelRotationY(room, door);

  return {
    surfaceId: `${room.placementId}:door:${door.id}`,
    category: "door",
    position: [localX, doorH / 2, localZ],
    rotation: [0, rotY, 0],
    size: [doorW, doorH],
  };
}

export function cameraDistanceForRoom(room: PlacedRoom): number {
  const { width, length, height } = roomDimensionsM(room);
  return Math.max(width, length, height) * 2.2;
}

export function cameraDistanceForBounds(
  widthM: number,
  lengthM: number,
  heightM: number,
  factor = 2.2,
): number {
  return Math.max(widthM, lengthM, heightM) * factor;
}

export const FLOOR_VIEW_CAMERA_FACTOR = 1.0;

export interface FloorCameraView {
  centerX: number;
  centerZ: number;
  heightM: number;
  target: [number, number, number];
  position: [number, number, number];
}

export function cameraViewFromBounds(
  bounds: AxisBounds,
  maxHeightMm: number,
  distanceFactor = FLOOR_VIEW_CAMERA_FACTOR,
): FloorCameraView {
  const widthM = (bounds.maxX - bounds.minX) * MM_TO_M;
  const lengthM = (bounds.maxZ - bounds.minZ) * MM_TO_M;
  const heightM = maxHeightMm * MM_TO_M;
  const centerX = ((bounds.minX + bounds.maxX) / 2) * MM_TO_M;
  const centerZ = ((bounds.minZ + bounds.maxZ) / 2) * MM_TO_M;
  const spanM = Math.max(widthM, lengthM, heightM);
  const distance = spanM * distanceFactor;

  return {
    centerX,
    centerZ,
    heightM,
    target: [centerX, heightM / 2, centerZ],
    position: [
      centerX + distance * 0.76,
      distance * 0.62,
      centerZ + distance * 0.76,
    ],
  };
}

/** Orbit distance clamps derived from the default framing distance. */
export function orbitDistanceLimitsFromView(view: FloorCameraView): {
  minDistance: number;
  maxDistance: number;
} {
  const dx = view.position[0] - view.target[0];
  const dy = view.position[1] - view.target[1];
  const dz = view.position[2] - view.target[2];
  const initialDistance = Math.hypot(dx, dy, dz);
  return {
    minDistance: Math.max(0.25, initialDistance * 0.03),
    maxDistance: Math.max(initialDistance * 6, 40),
  };
}
