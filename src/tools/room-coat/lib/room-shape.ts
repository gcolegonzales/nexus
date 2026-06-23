import type { SnapGuideSegment } from "@/tools/room-coat/lib/snap-guides";
import type {
  Hallway,
  PlacedRoom,
  RoomVertex,
  SnapPoint,
  WallOpening,
  WallSide,
} from "@/tools/room-coat/types/state";
import { DEFAULT_ROOM_COAT } from "@/tools/room-coat/types/state";
import { offsetToWorldOnWall } from "@/tools/room-coat/lib/wall-openings";
export const MIN_WALL_SEGMENT_MM = 600;

/** Minimum enclosed area for a closed room (~3 ft × 3 ft). */
export const MIN_CLOSED_ROOM_AREA_MM2 = 900_000;

export const VERTEX_SNAP_RADIUS_MM = 320;

export const RAY_VERTEX_SNAP_RADIUS_MM = 240;

/** Snap to perpendicular cross-sections through reference vertices. */
export const CROSS_SECTION_SNAP_RADIUS_MM = 320;

/** Wider engage for 45° symmetry / parallel alignment snaps. */
export const SYMMETRY_SNAP_RADIUS_MM = 520;

export type RoomAngleSnapMode = "ortho" | "45" | "free" | "off";

export type RoomDrawSnapResult = {
  xMm: number;
  zMm: number;
  snappedVertex: boolean;
  guides: SnapGuideSegment[];
};

/** CCW rectangle segment order: south, east, north, west. */
export const WALL_SIDE_TO_INDEX: Record<WallSide, number> = {
  south: 0,
  east: 1,
  north: 2,
  west: 3,
};

export const WALL_INDEX_TO_SIDE: WallSide[] = ["south", "east", "north", "west"];

export function wallSideToIndex(wall: WallSide): number {
  return WALL_SIDE_TO_INDEX[wall];
}

export function wallIndexToSide(index: number): WallSide | null {
  return WALL_INDEX_TO_SIDE[index] ?? null;
}

export interface RoomWallSegment {
  wallIndex: number;
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  lengthMm: number;
  outwardNormalX: number;
  outwardNormalZ: number;
}

export interface RoomBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  centerXMm: number;
  centerZMm: number;
  widthMm: number;
  lengthMm: number;
}

export function rectVerticesFromCenter(
  centerXMm: number,
  centerZMm: number,
  widthMm: number,
  lengthMm: number,
): RoomVertex[] {
  const hw = widthMm / 2;
  const hl = lengthMm / 2;
  return [
    { xMm: centerXMm - hw, zMm: centerZMm + hl },
    { xMm: centerXMm + hw, zMm: centerZMm + hl },
    { xMm: centerXMm + hw, zMm: centerZMm - hl },
    { xMm: centerXMm - hw, zMm: centerZMm - hl },
  ];
}

export function roomVertices(room: PlacedRoom): RoomVertex[] {
  if (room.verticesMm.length >= (room.closed ? 3 : 2)) {
    return room.verticesMm;
  }
  return rectVerticesFromCenter(
    room.originXMm,
    room.originZMm,
    room.widthMm,
    room.lengthMm,
  );
}

export function boundsFromVertices(vertices: RoomVertex[]): RoomBounds {
  if (vertices.length === 0) {
    return {
      minX: 0,
      maxX: 0,
      minZ: 0,
      maxZ: 0,
      centerXMm: 0,
      centerZMm: 0,
      widthMm: 0,
      lengthMm: 0,
    };
  }

  let minX = vertices[0].xMm;
  let maxX = vertices[0].xMm;
  let minZ = vertices[0].zMm;
  let maxZ = vertices[0].zMm;

  for (const vertex of vertices.slice(1)) {
    minX = Math.min(minX, vertex.xMm);
    maxX = Math.max(maxX, vertex.xMm);
    minZ = Math.min(minZ, vertex.zMm);
    maxZ = Math.max(maxZ, vertex.zMm);
  }

  return {
    minX,
    maxX,
    minZ,
    maxZ,
    centerXMm: (minX + maxX) / 2,
    centerZMm: (minZ + maxZ) / 2,
    widthMm: maxX - minX,
    lengthMm: maxZ - minZ,
  };
}

export function polygonSignedAreaMm2(vertices: RoomVertex[]): number {
  if (vertices.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % vertices.length];
    sum += a.xMm * b.zMm - b.xMm * a.zMm;
  }
  return sum / 2;
}

export function polygonAreaMm2(vertices: RoomVertex[]): number {
  return Math.abs(polygonSignedAreaMm2(vertices));
}

/** Unit outward normal for a segment edge in the XZ plane. */
export function segmentOutwardNormal(
  dx: number,
  dz: number,
  lengthMm: number,
  signedAreaMm2: number,
): { outwardNormalX: number; outwardNormalZ: number } {
  const len = Math.max(lengthMm, 1);
  const leftX = -dz / len;
  const leftZ = dx / len;
  if (signedAreaMm2 >= 0) {
    return { outwardNormalX: -leftX, outwardNormalZ: -leftZ };
  }
  return { outwardNormalX: leftX, outwardNormalZ: leftZ };
}

export function segmentLengthMm(a: RoomVertex, b: RoomVertex): number {
  return Math.hypot(b.xMm - a.xMm, b.zMm - a.zMm);
}

export function roomWallSegments(room: PlacedRoom): RoomWallSegment[] {
  const vertices = roomVertices(room);
  if (vertices.length < 2) return [];

  const segmentCount = room.closed ? vertices.length : vertices.length - 1;
  const segments: RoomWallSegment[] = [];
  const signedAreaMm2 = room.closed
    ? polygonSignedAreaMm2(vertices)
    : -1;

  for (let i = 0; i < segmentCount; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % vertices.length];
    const dx = b.xMm - a.xMm;
    const dz = b.zMm - a.zMm;
    const lengthMm = Math.hypot(dx, dz);
    if (lengthMm < 1) continue;

    const { outwardNormalX: nx, outwardNormalZ: nz } = segmentOutwardNormal(
      dx,
      dz,
      lengthMm,
      signedAreaMm2,
    );

    segments.push({
      wallIndex: i,
      x1: a.xMm,
      z1: a.zMm,
      x2: b.xMm,
      z2: b.zMm,
      lengthMm,
      outwardNormalX: nx,
      outwardNormalZ: nz,
    });
  }

  return segments;
}

export function translateVertices(
  vertices: RoomVertex[],
  dxMm: number,
  dzMm: number,
): RoomVertex[] {
  return vertices.map((vertex) => ({
    xMm: vertex.xMm + dxMm,
    zMm: vertex.zMm + dzMm,
  }));
}

const MIN_FOOTPRINT_MM = 300;

/** True when four vertices form an axis-aligned rectangle. */
export function isAxisAlignedRectangle(
  vertices: RoomVertex[],
  toleranceMm = 2,
): boolean {
  if (vertices.length !== 4) return false;
  const bucket = (value: number) => Math.round(value / toleranceMm);
  const uniqueX = new Set(vertices.map((vertex) => bucket(vertex.xMm)));
  const uniqueZ = new Set(vertices.map((vertex) => bucket(vertex.zMm)));
  return uniqueX.size === 2 && uniqueZ.size === 2;
}

/** Scale polygon vertices so their axis-aligned bounds match target W/L (center fixed). */
export function scaleVerticesToBounds(
  vertices: RoomVertex[],
  targetWidthMm: number,
  targetLengthMm: number,
): RoomVertex[] {
  const bounds = boundsFromVertices(vertices);
  const oldWidthMm = Math.max(bounds.widthMm, 1);
  const oldLengthMm = Math.max(bounds.lengthMm, 1);
  const newWidthMm = Math.max(MIN_FOOTPRINT_MM, targetWidthMm);
  const newLengthMm = Math.max(MIN_FOOTPRINT_MM, targetLengthMm);
  const scaleX = newWidthMm / oldWidthMm;
  const scaleZ = newLengthMm / oldLengthMm;
  const centerXMm = bounds.centerXMm;
  const centerZMm = bounds.centerZMm;

  return vertices.map((vertex) => ({
    xMm: Math.round(centerXMm + (vertex.xMm - centerXMm) * scaleX),
    zMm: Math.round(centerZMm + (vertex.zMm - centerZMm) * scaleZ),
  }));
}

function wallSegmentsForVertices(
  vertices: RoomVertex[],
  closed: boolean,
): RoomWallSegment[] {
  return roomWallSegments({
    placementId: "",
    unitId: "",
    floorId: "",
    roomId: "",
    name: "",
    widthMm: 0,
    lengthMm: 0,
    heightMm: 0,
    originXMm: 0,
    originZMm: 0,
    verticesMm: vertices,
    closed,
    coat: { ...DEFAULT_ROOM_COAT },
    doors: [],
    windows: [],
    surfaceOverrides: {},
    wallOpenings: [],
  });
}

/** Scale wall-opening spans after a footprint resize. */
/** Scale an offset along a wall after a footprint resize. */
export function scaleWallOffsetMm(
  wallIndex: number,
  wallOffsetMm: number,
  oldVertices: RoomVertex[],
  newVertices: RoomVertex[],
  closed: boolean,
): number {
  const oldSegments = wallSegmentsForVertices(oldVertices, closed);
  const newSegments = wallSegmentsForVertices(newVertices, closed);
  const oldSegment = oldSegments.find((segment) => segment.wallIndex === wallIndex);
  const newSegment = newSegments.find((segment) => segment.wallIndex === wallIndex);
  if (!oldSegment || !newSegment || oldSegment.lengthMm <= 0) {
    return wallOffsetMm;
  }
  return Math.round(wallOffsetMm * (newSegment.lengthMm / oldSegment.lengthMm));
}

export function scaleWallOpeningsForFootprintResize(
  openings: WallOpening[],
  oldVertices: RoomVertex[],
  newVertices: RoomVertex[],
  closed: boolean,
): WallOpening[] {
  if (openings.length === 0) return openings;

  const oldSegments = wallSegmentsForVertices(oldVertices, closed);
  const newSegments = wallSegmentsForVertices(newVertices, closed);

  return openings.map((opening) => {
    const oldSegment = oldSegments.find(
      (segment) => segment.wallIndex === opening.wallIndex,
    );
    const newSegment = newSegments.find(
      (segment) => segment.wallIndex === opening.wallIndex,
    );
    if (!oldSegment || !newSegment || oldSegment.lengthMm <= 0) {
      return opening;
    }

    const scale = newSegment.lengthMm / oldSegment.lengthMm;
    return {
      ...opening,
      startMm: Math.round(opening.startMm * scale),
      endMm: Math.round(opening.endMm * scale),
    };
  });
}

export interface RoomFootprintResizeInput {
  verticesMm: RoomVertex[];
  closed: boolean;
  originXMm: number;
  originZMm: number;
  widthMm?: number | null;
  lengthMm?: number | null;
  wallOpenings?: WallOpening[];
}

export interface RoomFootprintResizeResult {
  verticesMm: RoomVertex[];
  originXMm: number;
  originZMm: number;
  widthMm: number;
  lengthMm: number;
  wallOpenings: WallOpening[];
}

/** Resize a room footprint, preserving polygon shape when not a plain rectangle. */
export function resizeRoomFootprint(
  input: RoomFootprintResizeInput,
  patch: { widthMm?: number; lengthMm?: number },
): RoomFootprintResizeResult {
  const closed = input.closed ?? true;
  const minVertexCount = closed ? 3 : 2;
  const catalogWidthMm = input.widthMm ?? 3000;
  const catalogLengthMm = input.lengthMm ?? 3000;

  const vertices =
    input.verticesMm.length >= minVertexCount
      ? input.verticesMm
      : rectVerticesFromCenter(
          input.originXMm,
          input.originZMm,
          catalogWidthMm,
          catalogLengthMm,
        );

  const bounds = boundsFromVertices(vertices);
  const targetWidthMm = Math.max(
    MIN_FOOTPRINT_MM,
    Math.round(patch.widthMm ?? bounds.widthMm),
  );
  const targetLengthMm = Math.max(
    MIN_FOOTPRINT_MM,
    Math.round(patch.lengthMm ?? bounds.lengthMm),
  );

  const nextVertices =
    closed && isAxisAlignedRectangle(vertices)
      ? rectVerticesFromCenter(
          bounds.centerXMm,
          bounds.centerZMm,
          targetWidthMm,
          targetLengthMm,
        )
      : scaleVerticesToBounds(vertices, targetWidthMm, targetLengthMm);

  const nextBounds = boundsFromVertices(nextVertices);
  const wallOpenings = scaleWallOpeningsForFootprintResize(
    input.wallOpenings ?? [],
    vertices,
    nextVertices,
    closed,
  );

  return {
    verticesMm: nextVertices,
    originXMm: nextBounds.centerXMm,
    originZMm: nextBounds.centerZMm,
    widthMm: Math.max(catalogWidthMm, nextBounds.widthMm),
    lengthMm: Math.max(catalogLengthMm, nextBounds.lengthMm),
    wallOpenings,
  };
}

export interface RoomFootprintDimensions {
  widthMm: number;
  lengthMm: number;
}

/** Bounds-based W/L for dimension readouts and edits. */
export function roomFootprintDimensions(
  room: Pick<
    PlacedRoom,
    "verticesMm" | "closed" | "originXMm" | "originZMm" | "widthMm" | "lengthMm"
  >,
): RoomFootprintDimensions {
  const bounds = boundsFromVertices(
    roomVertices({
      ...room,
      placementId: "",
      unitId: "",
      floorId: "",
      roomId: "",
      name: "",
      heightMm: 0,
      coat: { ...DEFAULT_ROOM_COAT },
      doors: [],
      windows: [],
      surfaceOverrides: {},
      wallOpenings: [],
    }),
  );
  return {
    widthMm: bounds.widthMm,
    lengthMm: bounds.lengthMm,
  };
}

export interface RoomShapeValidation {
  ok: boolean;
  reason?: string;
}

export function validateRoomShape(
  vertices: RoomVertex[],
  closed: boolean,
): RoomShapeValidation {
  const minCount = closed ? 3 : 2;
  if (vertices.length < minCount) {
    return {
      ok: false,
      reason: closed
        ? "Closed rooms need at least 3 corners."
        : "Wall chains need at least 2 points.",
    };
  }

  const segmentCount = closed ? vertices.length : vertices.length - 1;
  for (let i = 0; i < segmentCount; i++) {
    const lengthMm = segmentLengthMm(
      vertices[i],
      vertices[(i + 1) % vertices.length],
    );
    if (lengthMm < MIN_WALL_SEGMENT_MM) {
      return {
        ok: false,
        reason: `Each wall must be at least ${MIN_WALL_SEGMENT_MM} mm.`,
      };
    }
  }

  if (closed) {
    const area = polygonAreaMm2(vertices);
    if (area < MIN_CLOSED_ROOM_AREA_MM2) {
      return {
        ok: false,
        reason: `Room area must be at least ${Math.round(MIN_CLOSED_ROOM_AREA_MM2 / 1_000_000 * 10.764)} sq ft.`,
      };
    }
  }

  return { ok: true };
}

export function snapToAngleMode(
  from: RoomVertex,
  cursorXMm: number,
  cursorZMm: number,
  mode: RoomAngleSnapMode,
): { xMm: number; zMm: number } {
  const dx = cursorXMm - from.xMm;
  const dz = cursorZMm - from.zMm;
  const dist = Math.hypot(dx, dz);
  if (dist < 1) {
    return { xMm: from.xMm, zMm: from.zMm };
  }

  let angleRad = Math.atan2(dz, dx);

  if (mode === "ortho") {
    const absDx = Math.abs(dx);
    const absDz = Math.abs(dz);
    if (absDx >= absDz) {
      angleRad = dx >= 0 ? 0 : Math.PI;
    } else {
      angleRad = dz >= 0 ? Math.PI / 2 : -Math.PI / 2;
    }
  } else if (mode === "45") {
    const step = Math.PI / 4;
    angleRad = Math.round(angleRad / step) * step;
  }

  return {
    xMm: Math.round(from.xMm + Math.cos(angleRad) * dist),
    zMm: Math.round(from.zMm + Math.sin(angleRad) * dist),
  };
}

function intersectRayWithLine(
  origin: RoomVertex,
  dirX: number,
  dirZ: number,
  linePoint: RoomVertex,
  lineDirX: number,
  lineDirZ: number,
): { xMm: number; zMm: number; t: number } | null {
  const rx = linePoint.xMm - origin.xMm;
  const rz = linePoint.zMm - origin.zMm;
  const det = dirX * -lineDirZ - dirZ * -lineDirX;
  if (Math.abs(det) < 1e-6) return null;

  const t = (rx * -lineDirZ - rz * -lineDirX) / det;
  if (t < 50) return null;

  return {
    xMm: origin.xMm + dirX * t,
    zMm: origin.zMm + dirZ * t,
    t,
  };
}

function reflectPointAcrossAxis(
  point: RoomVertex,
  origin: RoomVertex,
  axisUx: number,
  axisUz: number,
): RoomVertex {
  const vx = point.xMm - origin.xMm;
  const vz = point.zMm - origin.zMm;
  const dot = vx * axisUx + vz * axisUz;
  return {
    xMm: Math.round(origin.xMm + 2 * dot * axisUx - vx),
    zMm: Math.round(origin.zMm + 2 * dot * axisUz - vz),
  };
}

function pointOnRayNearTarget(
  origin: RoomVertex,
  dirX: number,
  dirZ: number,
  target: RoomVertex,
  toleranceMm: number,
): RoomVertex | null {
  const tx = target.xMm - origin.xMm;
  const tz = target.zMm - origin.zMm;
  const t = tx * dirX + tz * dirZ;
  if (t < 50) return null;
  const perp = Math.hypot(tx - dirX * t, tz - dirZ * t);
  if (perp > toleranceMm) return null;
  return {
    xMm: Math.round(origin.xMm + dirX * t),
    zMm: Math.round(origin.zMm + dirZ * t),
  };
}

function intersectTwoRays(
  o1x: number,
  o1z: number,
  d1x: number,
  d1z: number,
  o2x: number,
  o2z: number,
  d2x: number,
  d2z: number,
): { xMm: number; zMm: number } | null {
  const det = d1x * -d2z - d1z * -d2x;
  if (Math.abs(det) < 1e-6) return null;
  const rx = o2x - o1x;
  const rz = o2z - o1z;
  const t = (rx * -d2z - rz * -d2x) / det;
  if (t < 50) return null;
  return { xMm: o1x + d1x * t, zMm: o1z + d1z * t };
}

function guideSegmentThroughPoint(
  point: RoomVertex,
  dirX: number,
  dirZ: number,
  halfLenMm = 4000,
): SnapGuideSegment {
  return {
    x1Mm: Math.round(point.xMm - dirX * halfLenMm),
    z1Mm: Math.round(point.zMm - dirZ * halfLenMm),
    x2Mm: Math.round(point.xMm + dirX * halfLenMm),
    z2Mm: Math.round(point.zMm + dirZ * halfLenMm),
  };
}

function alignmentSnapOnRay(input: {
  origin: RoomVertex;
  candidate: RoomVertex;
  cursorXMm: number;
  cursorZMm: number;
  draftVertices: RoomVertex[];
  prevVertex?: RoomVertex | null;
  snapRadiusMm: number;
}): { vertex: RoomVertex | null; guides: SnapGuideSegment[] } {
  const dx = input.candidate.xMm - input.origin.xMm;
  const dz = input.candidate.zMm - input.origin.zMm;
  const len = Math.hypot(dx, dz);
  if (len < 1) return { vertex: null, guides: [] };

  const dirX = dx / len;
  const dirZ = dz / len;
  const outgoingPerpX = -dirZ;
  const outgoingPerpZ = dirX;
  const guides: SnapGuideSegment[] = [];

  let inAxisX: number | null = null;
  let inAxisZ: number | null = null;
  let inPerpX: number | null = null;
  let inPerpZ: number | null = null;
  if (input.prevVertex) {
    const incomingLen = Math.hypot(
      input.origin.xMm - input.prevVertex.xMm,
      input.origin.zMm - input.prevVertex.zMm,
    );
    if (incomingLen > 1) {
      inAxisX = (input.origin.xMm - input.prevVertex.xMm) / incomingLen;
      inAxisZ = (input.origin.zMm - input.prevVertex.zMm) / incomingLen;
      inPerpX = -inAxisZ;
      inPerpZ = inAxisX;
    }
  }

  const referencePoints: RoomVertex[] = [...input.draftVertices];
  for (let i = 0; i < input.draftVertices.length - 1; i++) {
    const a = input.draftVertices[i];
    const b = input.draftVertices[i + 1];
    referencePoints.push({
      xMm: Math.round((a.xMm + b.xMm) / 2),
      zMm: Math.round((a.zMm + b.zMm) / 2),
    });
  }

  if (inAxisX !== null && inAxisZ !== null && inPerpX !== null && inPerpZ !== null) {
    for (const vertex of input.draftVertices) {
      if (verticesEqual(vertex, input.origin)) continue;
      referencePoints.push(
        reflectPointAcrossAxis(vertex, input.origin, inAxisX, inAxisZ),
      );
      referencePoints.push(
        reflectPointAcrossAxis(vertex, input.origin, inPerpX, inPerpZ),
      );
    }
  }

  if (
    input.draftVertices.length >= 2 &&
    input.prevVertex &&
    !verticesEqual(input.draftVertices[0], input.prevVertex)
  ) {
    referencePoints.push({
      xMm: Math.round(
        input.draftVertices[0].xMm +
          (input.origin.xMm - input.prevVertex.xMm),
      ),
      zMm: Math.round(
        input.draftVertices[0].zMm +
          (input.origin.zMm - input.prevVertex.zMm),
      ),
    });
  }

  let bestVertex: RoomVertex | null = null;
  let bestDistMm = Infinity;

  const tryHit = (
    hit: { xMm: number; zMm: number } | null,
    guide?: SnapGuideSegment,
  ) => {
    if (!hit) return;
    const distMm = Math.hypot(
      hit.xMm - input.cursorXMm,
      hit.zMm - input.cursorZMm,
    );
    if (distMm > input.snapRadiusMm) return;
    if (distMm < bestDistMm) {
      bestDistMm = distMm;
      bestVertex = { xMm: Math.round(hit.xMm), zMm: Math.round(hit.zMm) };
      if (guide) {
        guides.length = 0;
        guides.push(guide);
      }
    }
  };

  for (const ref of referencePoints) {
    if (verticesEqual(ref, input.origin)) continue;

    tryHit(
      intersectRayWithLine(
        input.origin,
        dirX,
        dirZ,
        ref,
        outgoingPerpX,
        outgoingPerpZ,
      ),
      guideSegmentThroughPoint(ref, outgoingPerpX, outgoingPerpZ),
    );

    if (inPerpX !== null && inPerpZ !== null) {
      tryHit(
        intersectRayWithLine(input.origin, dirX, dirZ, ref, inPerpX, inPerpZ),
        guideSegmentThroughPoint(ref, inPerpX, inPerpZ),
      );
    }

    for (let i = 0; i < input.draftVertices.length - 1; i++) {
      const a = input.draftVertices[i];
      const b = input.draftVertices[i + 1];
      const sdx = b.xMm - a.xMm;
      const sdz = b.zMm - a.zMm;
      const segLen = Math.hypot(sdx, sdz);
      if (segLen < 1) continue;
      const segDirX = sdx / segLen;
      const segDirZ = sdz / segLen;
      const segPerpX = -segDirZ;
      const segPerpZ = segDirX;

      tryHit(
        intersectRayWithLine(input.origin, dirX, dirZ, ref, segDirX, segDirZ),
        guideSegmentThroughPoint(ref, segDirX, segDirZ),
      );
      tryHit(
        intersectRayWithLine(input.origin, dirX, dirZ, ref, segPerpX, segPerpZ),
        guideSegmentThroughPoint(ref, segPerpX, segPerpZ),
      );
    }
  }

  for (const ref of referencePoints) {
    if (verticesEqual(ref, input.origin)) continue;
    tryHit(pointOnRayNearTarget(input.origin, dirX, dirZ, ref, input.snapRadiusMm));
  }

  return { vertex: bestVertex, guides };
}

function dualCornerApexSnap(input: {
  draftVertices: RoomVertex[];
  cursorXMm: number;
  cursorZMm: number;
  angleSnapMode: RoomAngleSnapMode;
  snapRadiusMm: number;
}): { vertex: RoomVertex | null; guides: SnapGuideSegment[] } {
  if (input.draftVertices.length < 2 || input.angleSnapMode !== "45") {
    return { vertex: null, guides: [] };
  }

  const pairs: Array<[RoomVertex, RoomVertex]> = [];
  const v0 = input.draftVertices[0];
  const v1 = input.draftVertices[1];
  pairs.push([v0, v1]);

  if (input.draftVertices.length >= 3) {
    const last = input.draftVertices[input.draftVertices.length - 1];
    pairs.push([v0, last]);
  }

  let bestVertex: RoomVertex | null = null;
  let bestDistMm = Infinity;
  const guides: SnapGuideSegment[] = [];

  for (const [a, b] of pairs) {
    if (verticesEqual(a, b)) continue;
    const toA = snapToAngleMode(a, input.cursorXMm, input.cursorZMm, "45");
    const adx = toA.xMm - a.xMm;
    const adz = toA.zMm - a.zMm;
    const aLen = Math.hypot(adx, adz);
    if (aLen < 1) continue;

    const toB = snapToAngleMode(b, input.cursorXMm, input.cursorZMm, "45");
    const bdx = toB.xMm - b.xMm;
    const bdz = toB.zMm - b.zMm;
    const bLen = Math.hypot(bdx, bdz);
    if (bLen < 1) continue;

    const hit = intersectTwoRays(
      a.xMm,
      a.zMm,
      adx / aLen,
      adz / aLen,
      b.xMm,
      b.zMm,
      bdx / bLen,
      bdz / bLen,
    );
    if (!hit) continue;

    const distMm = Math.hypot(hit.xMm - input.cursorXMm, hit.zMm - input.cursorZMm);
    if (distMm > input.snapRadiusMm) continue;
    if (distMm < bestDistMm) {
      bestDistMm = distMm;
      bestVertex = { xMm: Math.round(hit.xMm), zMm: Math.round(hit.zMm) };
      guides.length = 0;
      guides.push(
        guideSegmentThroughPoint(a, adx / aLen, adz / aLen),
        guideSegmentThroughPoint(b, bdx / bLen, bdz / bLen),
      );
    }
  }

  return { vertex: bestVertex, guides };
}

function crossSectionSnapOnRay(input: {
  origin: RoomVertex;
  candidate: RoomVertex;
  cursorXMm: number;
  cursorZMm: number;
  references: RoomVertex[];
  prevVertex?: RoomVertex | null;
}): RoomVertex | null {
  const dx = input.candidate.xMm - input.origin.xMm;
  const dz = input.candidate.zMm - input.origin.zMm;
  const len = Math.hypot(dx, dz);
  if (len < 1) return null;

  const dirX = dx / len;
  const dirZ = dz / len;
  const outgoingPerpX = -dirZ;
  const outgoingPerpZ = dirX;

  let inPerpX: number | null = null;
  let inPerpZ: number | null = null;
  if (input.prevVertex) {
    const incomingLen = Math.hypot(
      input.origin.xMm - input.prevVertex.xMm,
      input.origin.zMm - input.prevVertex.zMm,
    );
    if (incomingLen > 1) {
      inPerpX = -(input.origin.zMm - input.prevVertex.zMm) / incomingLen;
      inPerpZ = (input.origin.xMm - input.prevVertex.xMm) / incomingLen;
    }
  }

  let bestVertex: RoomVertex | null = null;
  let bestDistMm = Infinity;

  const tryHit = (hit: { xMm: number; zMm: number } | null) => {
    if (!hit) return;
    const distMm = Math.hypot(
      hit.xMm - input.cursorXMm,
      hit.zMm - input.cursorZMm,
    );
    if (distMm > CROSS_SECTION_SNAP_RADIUS_MM) return;
    if (distMm < bestDistMm) {
      bestDistMm = distMm;
      bestVertex = { xMm: Math.round(hit.xMm), zMm: Math.round(hit.zMm) };
    }
  };

  for (const ref of input.references) {
    if (verticesEqual(ref, input.origin)) continue;

    tryHit(
      intersectRayWithLine(
        input.origin,
        dirX,
        dirZ,
        ref,
        outgoingPerpX,
        outgoingPerpZ,
      ),
    );

    if (inPerpX !== null && inPerpZ !== null) {
      tryHit(
        intersectRayWithLine(input.origin, dirX, dirZ, ref, inPerpX, inPerpZ),
      );
    }
  }

  return bestVertex;
}

export function pointFromInteriorAngle(
  pivot: RoomVertex,
  incomingFrom: RoomVertex,
  interiorAngleDeg: number,
  lengthMm: number,
): RoomVertex {
  const incomingAngle = Math.atan2(
    pivot.zMm - incomingFrom.zMm,
    pivot.xMm - incomingFrom.xMm,
  );
  const interiorRad = (interiorAngleDeg * Math.PI) / 180;
  const outgoingAngle = incomingAngle + Math.PI - interiorRad;
  return {
    xMm: Math.round(pivot.xMm + Math.cos(outgoingAngle) * lengthMm),
    zMm: Math.round(pivot.zMm + Math.sin(outgoingAngle) * lengthMm),
  };
}

export function collectVertexSnapTargets(
  rooms: PlacedRoom[],
  excludePlacementId?: string,
): RoomVertex[] {
  return collectRoomDrawSnapTargets({
    rooms,
    hallways: [],
    snapPoints: [],
    draftVertices: [],
    excludePlacementId,
  });
}

function vertexKey(vertex: RoomVertex): string {
  return `${Math.round(vertex.xMm)},${Math.round(vertex.zMm)}`;
}

export function verticesEqual(a: RoomVertex, b: RoomVertex, toleranceMm = 2): boolean {
  return Math.hypot(a.xMm - b.xMm, a.zMm - b.zMm) <= toleranceMm;
}

export function collectRoomDrawSnapTargets(input: {
  rooms: PlacedRoom[];
  hallways: Hallway[];
  snapPoints: SnapPoint[];
  draftVertices?: RoomVertex[];
  excludePlacementId?: string;
}): RoomVertex[] {
  const seen = new Set<string>();
  const targets: RoomVertex[] = [];

  function add(vertex: RoomVertex) {
    const key = vertexKey(vertex);
    if (seen.has(key)) return;
    seen.add(key);
    targets.push({ xMm: Math.round(vertex.xMm), zMm: Math.round(vertex.zMm) });
  }

  for (const room of input.rooms) {
    if (room.placementId === input.excludePlacementId) continue;
    for (const vertex of roomVertices(room)) add(vertex);
  }

  for (const hallway of input.hallways) {
    for (const waypoint of hallway.waypointsMm) add(waypoint);
  }

  for (const point of input.snapPoints) {
    if (point.kind === "floor") {
      add({ xMm: point.xMm, zMm: point.zMm });
      continue;
    }
    if (
      point.kind === "wall" &&
      point.roomPlacementId &&
      point.wallIndex !== undefined &&
      point.wallOffsetMm !== undefined
    ) {
      const room = input.rooms.find(
        (entry) => entry.placementId === point.roomPlacementId,
      );
      if (!room) continue;
      const world = offsetToWorldOnWall(room, point.wallIndex, point.wallOffsetMm);
      add({ xMm: world.x, zMm: world.z });
    }
  }

  for (const vertex of input.draftVertices ?? []) add(vertex);

  return targets;
}

function nearestVertexTarget(
  xMm: number,
  zMm: number,
  targets: RoomVertex[],
  radiusMm: number,
  skip?: RoomVertex | null,
): RoomVertex | null {
  let best: { vertex: RoomVertex; distanceMm: number } | null = null;

  for (const target of targets) {
    if (skip && verticesEqual(target, skip)) continue;
    const distanceMm = Math.hypot(xMm - target.xMm, zMm - target.zMm);
    if (distanceMm > radiusMm) continue;
    if (!best || distanceMm < best.distanceMm) {
      best = { vertex: target, distanceMm };
    }
  }

  return best?.vertex ?? null;
}

function snapTargetOnConstrainedRay(
  from: RoomVertex,
  candidate: RoomVertex,
  targets: RoomVertex[],
  radiusMm: number,
  skip?: RoomVertex | null,
): RoomVertex | null {
  const dx = candidate.xMm - from.xMm;
  const dz = candidate.zMm - from.zMm;
  const len = Math.hypot(dx, dz);
  if (len < 1) return null;

  const ux = dx / len;
  const uz = dz / len;
  let best: { vertex: RoomVertex; perpDist: number } | null = null;

  for (const target of targets) {
    if (skip && verticesEqual(target, skip)) continue;
    const tx = target.xMm - from.xMm;
    const tz = target.zMm - from.zMm;
    const proj = tx * ux + tz * uz;
    if (proj < 50) continue;

    const perpDist = Math.hypot(tx - ux * proj, tz - uz * proj);
    if (perpDist > radiusMm) continue;
    if (!best || perpDist < best.perpDist) {
      best = { vertex: target, perpDist };
    }
  }

  return best?.vertex ?? null;
}

export function snapRoomDrawPoint(input: {
  cursorXMm: number;
  cursorZMm: number;
  lastVertex: RoomVertex | null;
  prevVertex: RoomVertex | null;
  angleSnapMode: RoomAngleSnapMode;
  snapTargets: RoomVertex[];
  draftVertices?: RoomVertex[];
  typedLengthMm?: number | null;
  typedInteriorAngleDeg?: number | null;
}): RoomDrawSnapResult {
  const {
    cursorXMm,
    cursorZMm,
    lastVertex,
    prevVertex,
    angleSnapMode,
    snapTargets,
    draftVertices,
    typedLengthMm,
    typedInteriorAngleDeg,
  } = input;

  const skip = lastVertex;
  const guides: SnapGuideSegment[] = [];

  const cursorTarget = nearestVertexTarget(
    cursorXMm,
    cursorZMm,
    snapTargets,
    VERTEX_SNAP_RADIUS_MM,
    skip,
  );
  if (cursorTarget) {
    return {
      xMm: cursorTarget.xMm,
      zMm: cursorTarget.zMm,
      snappedVertex: true,
      guides,
    };
  }

  if (!lastVertex) {
    return {
      xMm: Math.round(cursorXMm),
      zMm: Math.round(cursorZMm),
      snappedVertex: false,
      guides,
    };
  }

  let candidate: { xMm: number; zMm: number };
  let alignmentSnapped = false;

  if (
    typedInteriorAngleDeg !== null &&
    typedInteriorAngleDeg !== undefined &&
    prevVertex
  ) {
    const lengthMm =
      typedLengthMm ??
      segmentLengthMm(lastVertex, { xMm: cursorXMm, zMm: cursorZMm });
    candidate = pointFromInteriorAngle(
      lastVertex,
      prevVertex,
      typedInteriorAngleDeg,
      lengthMm,
    );
  } else if (angleSnapMode === "off" || angleSnapMode === "free") {
    candidate = { xMm: Math.round(cursorXMm), zMm: Math.round(cursorZMm) };
  } else {
    candidate = snapToAngleMode(
      lastVertex,
      cursorXMm,
      cursorZMm,
      angleSnapMode,
    );
  }

  if (
    angleSnapMode === "45" ||
    angleSnapMode === "ortho"
  ) {
    const snapRadiusMm =
      angleSnapMode === "45"
        ? SYMMETRY_SNAP_RADIUS_MM
        : CROSS_SECTION_SNAP_RADIUS_MM;
    const draft = draftVertices ?? [];

    let bestAlign: RoomVertex | null = null;
    let bestAlignDistMm = Infinity;
    let bestAlignGuides: SnapGuideSegment[] = [];

    function considerAlignment(
      point: RoomVertex | null,
      pointGuides: SnapGuideSegment[],
    ) {
      if (!point) return;
      const distMm = Math.hypot(
        point.xMm - cursorXMm,
        point.zMm - cursorZMm,
      );
      if (distMm > snapRadiusMm) return;
      if (distMm < bestAlignDistMm) {
        bestAlignDistMm = distMm;
        bestAlign = point;
        bestAlignGuides = pointGuides;
      }
    }

    const apex = dualCornerApexSnap({
      draftVertices: draft,
      cursorXMm,
      cursorZMm,
      angleSnapMode,
      snapRadiusMm,
    });
    considerAlignment(apex.vertex, apex.guides);

    const alignment = alignmentSnapOnRay({
      origin: lastVertex,
      candidate,
      cursorXMm,
      cursorZMm,
      draftVertices: draft,
      prevVertex,
      snapRadiusMm,
    });
    considerAlignment(alignment.vertex, alignment.guides);

    const crossRefs: RoomVertex[] = [...snapTargets];
    for (const vertex of draft) {
      if (!crossRefs.some((entry) => verticesEqual(entry, vertex))) {
        crossRefs.push(vertex);
      }
    }
    for (let i = 0; i < draft.length - 1; i++) {
      const a = draft[i];
      const b = draft[i + 1];
      crossRefs.push({
        xMm: Math.round((a.xMm + b.xMm) / 2),
        zMm: Math.round((a.zMm + b.zMm) / 2),
      });
    }

    const crossSection = crossSectionSnapOnRay({
      origin: lastVertex,
      candidate,
      cursorXMm,
      cursorZMm,
      references: crossRefs,
      prevVertex,
    });
    considerAlignment(crossSection, []);

    if (bestAlign) {
      candidate = bestAlign;
      guides.push(...bestAlignGuides);
      alignmentSnapped = true;
    }
  }

  if (typedLengthMm !== null && typedLengthMm !== undefined && !typedInteriorAngleDeg) {
    const dx = candidate.xMm - lastVertex.xMm;
    const dz = candidate.zMm - lastVertex.zMm;
    const dist = Math.hypot(dx, dz);
    if (dist > 1) {
      candidate = {
        xMm: Math.round(lastVertex.xMm + (dx / dist) * typedLengthMm),
        zMm: Math.round(lastVertex.zMm + (dz / dist) * typedLengthMm),
      };
    }
  }

  const rayTarget = snapTargetOnConstrainedRay(
    lastVertex,
    candidate,
    snapTargets,
    RAY_VERTEX_SNAP_RADIUS_MM,
    skip,
  );
  if (rayTarget) {
    return {
      xMm: rayTarget.xMm,
      zMm: rayTarget.zMm,
      snappedVertex: true,
      guides,
    };
  }

  const candidateTarget = nearestVertexTarget(
    candidate.xMm,
    candidate.zMm,
    snapTargets,
    VERTEX_SNAP_RADIUS_MM,
    skip,
  );
  if (candidateTarget) {
    return {
      xMm: candidateTarget.xMm,
      zMm: candidateTarget.zMm,
      snappedVertex: true,
      guides,
    };
  }

  return {
    ...candidate,
    snappedVertex: alignmentSnapped,
    guides,
  };
}

export function interiorAngleDeg(
  a: RoomVertex,
  b: RoomVertex,
  c: RoomVertex,
): number {
  const v1x = a.xMm - b.xMm;
  const v1z = a.zMm - b.zMm;
  const v2x = c.xMm - b.xMm;
  const v2z = c.zMm - b.zMm;
  const dot = v1x * v2x + v1z * v2z;
  const len1 = Math.hypot(v1x, v1z);
  const len2 = Math.hypot(v2x, v2z);
  if (len1 < 1 || len2 < 1) return 90;
  const cos = Math.max(-1, Math.min(1, dot / (len1 * len2)));
  return Math.round((Math.acos(cos) * 180) / Math.PI);
}

export function segmentApproachAxis(segment: RoomWallSegment): "x" | "z" {
  return Math.abs(segment.x2 - segment.x1) >= Math.abs(segment.z2 - segment.z1)
    ? "x"
    : "z";
}

export function segmentOutwardSign(
  segment: RoomWallSegment,
  axis: "x" | "z",
): 1 | -1 {
  if (axis === "x") {
    return segment.outwardNormalX >= 0 ? 1 : -1;
  }
  return segment.outwardNormalZ >= 0 ? 1 : -1;
}

export function linkApproachAxis(
  room: PlacedRoom,
  wallIndex: number,
): "x" | "z" {
  const segment = roomWallSegments(room).find((item) => item.wallIndex === wallIndex);
  return segment ? segmentApproachAxis(segment) : "x";
}

export function linkOutwardNormal(
  room: PlacedRoom,
  wallIndex: number,
): { xMm: number; zMm: number } {
  const segment = roomWallSegments(room).find((item) => item.wallIndex === wallIndex);
  if (!segment) return { xMm: 0, zMm: -1 };
  return {
    xMm: segment.outwardNormalX * 1000,
    zMm: segment.outwardNormalZ * 1000,
  };
}

export function linkOutwardSign(
  room: PlacedRoom,
  wallIndex: number,
): 1 | -1 {
  const segment = roomWallSegments(room).find((item) => item.wallIndex === wallIndex);
  if (!segment) return -1;
  return segmentOutwardSign(segment, segmentApproachAxis(segment));
}

export function verticesToLocalM(
  vertices: RoomVertex[],
  centerXMm: number,
  centerZMm: number,
  options?: { reverseWinding?: boolean },
): Array<[number, number]> {
  const MM_TO_M = 0.001;
  const ordered = options?.reverseWinding ? [...vertices].reverse() : vertices;
  return ordered.map((vertex) => {
    const localX = (vertex.xMm - centerXMm) * MM_TO_M;
    const localZ = (vertex.zMm - centerZMm) * MM_TO_M;
    // ShapeGeometry uses XY; mesh rotation -PI/2 on X maps world Z = -shapeY.
    return [localX, -localZ] as [number, number];
  });
}
