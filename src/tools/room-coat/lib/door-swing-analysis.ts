import { roomWallSegments } from "@/tools/room-coat/lib/room-shape";
import { wallSegmentByIndex } from "@/tools/room-coat/lib/wall-openings";
import type { Door, DoorHingeSide, Furnishing, PlacedRoom } from "@/tools/room-coat/types/state";

/** Maximum door swing in the opening direction (never through the wall plane). */
export const MAX_DOOR_SWING_RAD = Math.PI;
/** Target door open angle for swing preview (full half-plane until obstructed). */
export const TARGET_DOOR_SWING_RAD = Math.PI;
const ANGLE_STEP_RAD = (2 * Math.PI) / 360;

export interface DoorSwingObstruction {
  clearAngleRad: number;
  maxAngleRad: number;
  obstructed: boolean;
}

type Vec2 = { x: number; z: number };

function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, z: a.z + b.z };
}

function scale(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, z: v.z * s };
}

function rotate(v: Vec2, angleRad: number): Vec2 {
  const c = Math.cos(angleRad);
  const s = Math.sin(angleRad);
  return { x: v.x * c - v.z * s, z: v.x * s + v.z * c };
}

function cross2d(a: Vec2, b: Vec2): number {
  return a.x * b.z - a.z * b.x;
}

function segSegHit(
  a: Vec2,
  b: Vec2,
  c: Vec2,
  d: Vec2,
  ignoreNearA = 0.02,
): boolean {
  const ax = a.x;
  const az = a.z;
  const bx = b.x;
  const bz = b.z;
  const cx = c.x;
  const cz = c.z;
  const dx = d.x;
  const dz = d.z;
  const denom = (bx - ax) * (dz - cz) - (bz - az) * (dx - cx);
  if (Math.abs(denom) < 1e-9) return false;
  const t = ((cx - ax) * (dz - cz) - (cz - az) * (dx - cx)) / denom;
  const u = ((cx - ax) * (bz - az) - (cz - az) * (bx - ax)) / denom;
  if (t <= ignoreNearA || t > 1) return false;
  return u > 0.02 && u < 0.98;
}

function furnishingSegments(item: Furnishing): Array<[Vec2, Vec2]> {
  const halfW = item.widthMm / 2;
  const halfD = item.depthMm / 2;
  const cx = item.centerXMm;
  const cz = item.centerZMm;
  const rot = (item.rotationDeg * Math.PI) / 180;
  const corners = [
    { x: -halfW, z: -halfD },
    { x: halfW, z: -halfD },
    { x: halfW, z: halfD },
    { x: -halfW, z: halfD },
  ].map((point) => add({ x: cx, z: cz }, rotate(point, rot)));
  const segments: Array<[Vec2, Vec2]> = [];
  for (let i = 0; i < corners.length; i++) {
    segments.push([corners[i], corners[(i + 1) % corners.length]]);
  }
  return segments;
}

export type DoorSwingInput = Pick<
  Door,
  "wallIndex" | "offsetFromCornerMm" | "widthMm" | "hingeSide" | "swingsInward"
>;

function wallFrame(room: PlacedRoom, wallIndex: number) {
  const edge = wallSegmentByIndex(room, wallIndex);
  if (!edge) return null;
  const along = wallSegmentAlongDir(edge);
  const inward = { x: -edge.outwardNormalX, z: -edge.outwardNormalZ };
  return { edge, along, inward };
}

/** Unit vector from wall corner-1 toward corner-2 (same parameterization as offsets). */
export function wallSegmentAlongDir(edge: {
  x1: number;
  z1: number;
  x2: number;
  z2: number;
}): Vec2 {
  const dx = edge.x2 - edge.x1;
  const dz = edge.z2 - edge.z1;
  const len = Math.hypot(dx, dz) || 1;
  return { x: dx / len, z: dz / len };
}

/** Three.js Y rotation so local +X aligns with wallSegmentAlongDir. */
export function wallSegmentAlongRotationY(edge: {
  x1: number;
  z1: number;
  x2: number;
  z2: number;
}): number {
  const along = wallSegmentAlongDir(edge);
  return Math.atan2(-along.z, along.x);
}

/** Rotation sign so a 90° sweep from closedDir reaches the chosen room side. */
function swingSignForTarget(closedDir: Vec2, targetDir: Vec2): number {
  return cross2d(closedDir, targetDir) >= 0 ? 1 : -1;
}

export function doorGeometry(
  room: PlacedRoom,
  door: DoorSwingInput,
): {
  hinge: Vec2;
  closedDir: Vec2;
  swingSign: number;
  widthMm: number;
  inward: Vec2;
} | null {
  const frame = wallFrame(room, door.wallIndex);
  if (!frame) return null;
  const { edge, along, inward } = frame;

  const hingeSide: DoorHingeSide = door.hingeSide ?? "left";
  const hingeOffsetMm =
    hingeSide === "left"
      ? door.offsetFromCornerMm
      : door.offsetFromCornerMm + door.widthMm;
  const t = hingeOffsetMm / edge.lengthMm;
  const hinge = {
    x: edge.x1 + (edge.x2 - edge.x1) * t,
    z: edge.z1 + (edge.z2 - edge.z1) * t,
  };

  const closedDir = hingeSide === "left" ? along : scale(along, -1);
  const swingsInward = door.swingsInward !== false;
  const targetDir = swingsInward ? inward : scale(inward, -1);
  const swingSign = swingSignForTarget(closedDir, targetDir);

  return {
    hinge,
    closedDir,
    swingSign,
    widthMm: door.widthMm,
    inward,
  };
}

function panelHitsObstacle(
  hinge: Vec2,
  closedDir: Vec2,
  swingSign: number,
  widthMm: number,
  angleRad: number,
  obstacles: Array<[Vec2, Vec2]>,
): boolean {
  const openDir = rotate(closedDir, angleRad * swingSign);
  const tip = add(hinge, scale(openDir, widthMm));
  for (const [a, b] of obstacles) {
    if (segSegHit(hinge, tip, a, b)) return true;
  }
  return false;
}

/** True when the door can swing 90° into the requested half-space (not through the wall). */
export function canDoorSwingInward(
  room: PlacedRoom,
  door: DoorSwingInput,
  swingsInward: boolean,
): boolean {
  const geometry = doorGeometry(room, { ...door, swingsInward });
  if (!geometry) return false;

  const targetDir = swingsInward ? geometry.inward : scale(geometry.inward, -1);
  const openDir = rotate(geometry.closedDir, (Math.PI / 2) * geometry.swingSign);
  const alignment = openDir.x * targetDir.x + openDir.z * targetDir.z;
  return alignment >= 0.85;
}

export function toggledHingeSide(door: DoorSwingInput): DoorHingeSide {
  return door.hingeSide === "right" ? "left" : "right";
}

/** Returns the opposite swing direction if valid, otherwise null. */
export function toggledSwingInwardIfValid(
  room: PlacedRoom,
  door: DoorSwingInput,
): boolean | null {
  const next = door.swingsInward === false;
  return canDoorSwingInward(room, door, next) ? next : null;
}

/** True when a sweep keeps the panel tip on the interior/exterior half-space. */
function sweepStaysOnSwingSide(
  closedDir: Vec2,
  swingSign: number,
  inward: Vec2,
  swingsInward: boolean,
  sweepRad: number,
): boolean {
  if (sweepRad <= 1e-4) return true;
  const openDir = rotate(closedDir, sweepRad * swingSign);
  const sideDot = openDir.x * inward.x + openDir.z * inward.z;
  return swingsInward ? sideDot >= -0.05 : sideDot <= 0.05;
}

function collectSwingObstacles(
  room: PlacedRoom,
  door: DoorSwingInput,
  furnishings: Furnishing[],
  allRooms: PlacedRoom[],
  excludeDoorId?: string,
): Array<[Vec2, Vec2]> {
  const obstacles: Array<[Vec2, Vec2]> = [];

  for (const placedRoom of allRooms) {
    for (const segment of roomWallSegments(placedRoom)) {
      if (
        placedRoom.placementId === room.placementId &&
        segment.wallIndex === door.wallIndex
      ) {
        continue;
      }
      obstacles.push([
        { x: segment.x1, z: segment.z1 },
        { x: segment.x2, z: segment.z2 },
      ]);
    }

    for (const other of placedRoom.doors) {
      if (
        placedRoom.placementId === room.placementId &&
        excludeDoorId &&
        other.id === excludeDoorId
      ) {
        continue;
      }
      const otherGeo = doorGeometry(placedRoom, other);
      if (!otherGeo) continue;
      obstacles.push([
        otherGeo.hinge,
        add(otherGeo.hinge, scale(otherGeo.closedDir, other.widthMm)),
      ]);
    }
  }

  for (const item of furnishings) {
    obstacles.push(...furnishingSegments(item));
  }

  return obstacles;
}

export function analyzeDoorSwing(
  room: PlacedRoom,
  door: DoorSwingInput,
  furnishings: Furnishing[] = [],
  allRooms: PlacedRoom[] = [room],
  excludeDoorId?: string,
): DoorSwingObstruction {
  const geometry = doorGeometry(room, door);
  if (!geometry) {
    return {
      clearAngleRad: MAX_DOOR_SWING_RAD,
      maxAngleRad: MAX_DOOR_SWING_RAD,
      obstructed: false,
    };
  }

  const { hinge, closedDir, swingSign, widthMm, inward } = geometry;
  const swingsInward = door.swingsInward !== false;
  const obstacles = collectSwingObstacles(
    room,
    door,
    furnishings,
    allRooms,
    excludeDoorId,
  );

  let maxAllowedRad = MAX_DOOR_SWING_RAD;
  for (let angle = ANGLE_STEP_RAD; angle <= MAX_DOOR_SWING_RAD; angle += ANGLE_STEP_RAD) {
    if (
      !sweepStaysOnSwingSide(
        closedDir,
        swingSign,
        inward,
        swingsInward,
        angle,
      )
    ) {
      maxAllowedRad = Math.max(0, angle - ANGLE_STEP_RAD);
      break;
    }
  }

  const intendedSweepRad = Math.min(TARGET_DOOR_SWING_RAD, maxAllowedRad);
  let clearAngleRad = intendedSweepRad;
  for (let angle = ANGLE_STEP_RAD; angle <= intendedSweepRad; angle += ANGLE_STEP_RAD) {
    if (panelHitsObstacle(hinge, closedDir, swingSign, widthMm, angle, obstacles)) {
      clearAngleRad = Math.max(0, angle - ANGLE_STEP_RAD);
      break;
    }
  }

  return {
    clearAngleRad,
    maxAngleRad: intendedSweepRad,
    obstructed: clearAngleRad < intendedSweepRad - 1e-4,
  };
}

/** Three.js Y rotation so the door leaf extends along the closed wall direction. */
export function doorPanelRotationY(
  room: PlacedRoom,
  door: DoorSwingInput,
): number {
  const geometry = doorGeometry(room, door);
  if (!geometry) return 0;
  // Three.js +Y rotation maps local +X to (cos θ, 0, −sin θ) in XZ.
  return Math.atan2(-geometry.closedDir.z, geometry.closedDir.x);
}

export function doorClosedPanelAngleRad(
  room: PlacedRoom,
  door: DoorSwingInput,
): number {
  const geometry = doorGeometry(room, door);
  if (!geometry) return 0;
  return Math.atan2(geometry.closedDir.z, geometry.closedDir.x);
}

export function doorSwingSign(room: PlacedRoom, door: DoorSwingInput): number {
  return doorGeometry(room, door)?.swingSign ?? 1;
}

export function doorClosedDirUnit(
  room: PlacedRoom,
  door: DoorSwingInput,
): Vec2 | null {
  const geometry = doorGeometry(room, door);
  if (!geometry) return null;
  return geometry.closedDir;
}

/** Sample an arc by rotating the closed direction — never uses ellipse angle wrapping. */
export function sampleDoorSwingArcLocalM(
  hingeXM: number,
  hingeZM: number,
  floorYM: number,
  closedDir: Vec2,
  swingSign: number,
  radiusM: number,
  startSweepRad: number,
  endSweepRad: number,
  segments = 32,
): Array<[number, number, number]> {
  if (endSweepRad <= startSweepRad + 1e-6) {
    return [[hingeXM, floorYM, hingeZM]];
  }
  const points: Array<[number, number, number]> = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const sweep = startSweepRad + (endSweepRad - startSweepRad) * t;
    const dir = rotate(closedDir, sweep * swingSign);
    points.push([
      hingeXM + dir.x * radiusM,
      floorYM,
      hingeZM + dir.z * radiusM,
    ]);
  }
  return points;
}

export function doorSwingTipLocalM(
  hingeXM: number,
  hingeZM: number,
  closedDir: Vec2,
  swingSign: number,
  radiusM: number,
  sweepRad: number,
): [number, number] {
  const dir = rotate(closedDir, sweepRad * swingSign);
  return [hingeXM + dir.x * radiusM, hingeZM + dir.z * radiusM];
}
