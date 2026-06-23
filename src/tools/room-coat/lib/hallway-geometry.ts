import type { Hallway, HallwayWaypoint } from "@/tools/room-coat/types/state";
import { DEFAULT_ROOM_COAT } from "@/tools/room-coat/types/state";
import type { RoomMeshOptions, SurfaceMeshSpec } from "@/tools/room-coat/lib/room-geometry";
import { FLOOR_SURFACE_Y_M } from "@/tools/room-coat/lib/room-geometry";
import {
  hallwaySegmentAxis,
  simplifyHallwayWaypoints,
} from "@/tools/room-coat/lib/hallway-draft";
import { solidHallwayWallSegments } from "@/tools/room-coat/lib/hallway-openings";
import { logHallway } from "@/tools/room-coat/lib/hallway-debug";

const MM = 0.001;
const BASEBOARD_HEIGHT_M = 0.08;
const BASEBOARD_DEPTH_M = 0.02;
const FLOOR_COLOR = "#64748b";
const MIN_SEGMENT_M = 0.08;

export type HallwayMeshOptions = RoomMeshOptions;

type WallSideIdx = 0 | 1;

interface SegmentTrim {
  startExtendMm: number;
  endExtendMm: number;
  startInnerTrimMm: number;
  endInnerTrimMm: number;
  innerWallAtStart: WallSideIdx | null;
  innerWallAtEnd: WallSideIdx | null;
}

function snapSegmentEndpoints(
  a: HallwayWaypoint,
  b: HallwayWaypoint,
): [HallwayWaypoint, HallwayWaypoint] {
  const axis = hallwaySegmentAxis(a, b);
  if (axis === "horizontal") {
    const zMm = Math.round((a.zMm + b.zMm) / 2);
    return [
      { xMm: a.xMm, zMm },
      { xMm: b.xMm, zMm },
    ];
  }
  if (axis === "vertical") {
    const xMm = Math.round((a.xMm + b.xMm) / 2);
    return [
      { xMm, zMm: a.zMm },
      { xMm, zMm: b.zMm },
    ];
  }
  return [a, b];
}

function segmentDirection(
  a: HallwayWaypoint,
  b: HallwayWaypoint,
): { axis: "horizontal" | "vertical"; sign: 1 | -1 } | null {
  const axis = hallwaySegmentAxis(a, b);
  if (!axis) return null;
  if (axis === "horizontal") {
    return { axis, sign: (b.xMm >= a.xMm ? 1 : -1) as 1 | -1 };
  }
  return { axis, sign: (b.zMm >= a.zMm ? 1 : -1) as 1 | -1 };
}

function cross2d(ax: number, az: number, bx: number, bz: number): number {
  return ax * bz - az * bx;
}

function leftWallIndex(
  axis: "horizontal" | "vertical",
  sign: 1 | -1,
): WallSideIdx {
  if (axis === "horizontal") {
    return sign === 1 ? 1 : 0;
  }
  return sign === 1 ? 0 : 1;
}

function innerWallAtJunction(
  axis: "horizontal" | "vertical",
  sign: 1 | -1,
  turn: number,
): WallSideIdx {
  const left = leftWallIndex(axis, sign);
  return turn > 0 ? left : ((left === 0 ? 1 : 0) as WallSideIdx);
}

function computeSegmentTrims(
  points: HallwayWaypoint[],
  widthMm: number,
): SegmentTrim[] {
  const half = widthMm / 2;
  const trims: SegmentTrim[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const trim: SegmentTrim = {
      startExtendMm: i === 0 ? half : 0,
      endExtendMm: i === points.length - 2 ? half : 0,
      startInnerTrimMm: 0,
      endInnerTrimMm: 0,
      innerWallAtStart: null,
      innerWallAtEnd: null,
    };

    const curr = segmentDirection(points[i], points[i + 1]);
    if (!curr) {
      trims.push(trim);
      continue;
    }

    if (i > 0) {
      const prev = segmentDirection(points[i - 1], points[i]);
      if (prev) {
        const pv =
          prev.axis === "horizontal"
            ? { x: prev.sign, z: 0 }
            : { x: 0, z: prev.sign };
        const cv =
          curr.axis === "horizontal"
            ? { x: curr.sign, z: 0 }
            : { x: 0, z: curr.sign };
        const turn = cross2d(pv.x, pv.z, cv.x, cv.z);
        if (turn !== 0) {
          trim.innerWallAtStart = innerWallAtJunction(
            curr.axis,
            curr.sign,
            turn,
          );
          trim.startInnerTrimMm = half;
        }
      }
    }

    if (i < points.length - 2) {
      const next = segmentDirection(points[i + 1], points[i + 2]);
      if (next) {
        const cv =
          curr.axis === "horizontal"
            ? { x: curr.sign, z: 0 }
            : { x: 0, z: curr.sign };
        const nv =
          next.axis === "horizontal"
            ? { x: next.sign, z: 0 }
            : { x: 0, z: next.sign };
        const turn = cross2d(cv.x, cv.z, nv.x, nv.z);
        if (turn !== 0) {
          trim.innerWallAtEnd = innerWallAtJunction(curr.axis, curr.sign, turn);
          trim.endInnerTrimMm = half;
        }
      }
    }

    trims.push(trim);
  }

  return trims;
}

/** Span along segment axis in path order (start → end). */
function pathAxisSpan(
  pathStartMm: number,
  pathEndMm: number,
  trim: SegmentTrim,
  wallSide: WallSideIdx | null,
  halfWidthMm: number,
): { lo: number; hi: number; lengthMm: number; centerMm: number } | null {
  const dir = pathEndMm >= pathStartMm ? 1 : -1;
  let pathLo = Math.min(pathStartMm, pathEndMm);
  let pathHi = Math.max(pathStartMm, pathEndMm);

  if (dir > 0) {
    pathLo -= trim.startExtendMm;
    pathHi += trim.endExtendMm;
  } else {
    pathHi += trim.startExtendMm;
    pathLo -= trim.endExtendMm;
  }

  if (wallSide !== null) {
    const trimFromStart =
      trim.innerWallAtStart === wallSide ? trim.startInnerTrimMm : 0;
    const trimFromEnd =
      trim.innerWallAtEnd === wallSide ? trim.endInnerTrimMm : 0;
    const extendFromStart =
      trim.innerWallAtStart !== wallSide && trim.startInnerTrimMm > 0
        ? halfWidthMm
        : 0;
    const extendFromEnd =
      trim.innerWallAtEnd !== wallSide && trim.endInnerTrimMm > 0
        ? halfWidthMm
        : 0;

    if (dir > 0) {
      pathLo += trimFromStart - extendFromStart;
      pathHi -= trimFromEnd - extendFromEnd;
    } else {
      pathHi -= trimFromStart - extendFromStart;
      pathLo += trimFromEnd - extendFromEnd;
    }
  }

  const lengthMm = pathHi - pathLo;
  if (lengthMm < 80) return null;
  return { lo: pathLo, hi: pathHi, lengthMm, centerMm: (pathLo + pathHi) / 2 };
}

/** Floor span extends into turn junctions so each leg measures wall-to-wall. */
function pathFloorAxisSpan(
  pathStartMm: number,
  pathEndMm: number,
  trim: SegmentTrim,
  halfWidthMm: number,
  segIndex: number,
  segmentCount: number,
): { lo: number; hi: number; lengthMm: number; centerMm: number } | null {
  const span = pathAxisSpan(pathStartMm, pathEndMm, trim, null, halfWidthMm);
  if (!span) return null;

  const dir = pathEndMm >= pathStartMm ? 1 : -1;
  let lo = span.lo;
  let hi = span.hi;

  if (segIndex > 0) {
    if (dir > 0) lo -= halfWidthMm;
    else hi += halfWidthMm;
  }
  if (segIndex < segmentCount - 1) {
    if (dir > 0) hi += halfWidthMm;
    else lo -= halfWidthMm;
  }

  const lengthMm = hi - lo;
  if (lengthMm < 80) return null;
  return { lo, hi, lengthMm, centerMm: (lo + hi) / 2 };
}

export function hallwayTurnCornerCount(points: HallwayWaypoint[]): number {
  if (points.length < 3) return 0;
  let corners = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const prev = segmentDirection(points[i - 1]!, points[i]!);
    const next = segmentDirection(points[i]!, points[i + 1]!);
    if (!prev || !next) continue;
    const pv =
      prev.axis === "horizontal"
        ? { x: prev.sign, z: 0 }
        : { x: 0, z: prev.sign };
    const nv =
      next.axis === "horizontal"
        ? { x: next.sign, z: 0 }
        : { x: 0, z: next.sign };
    if (cross2d(pv.x, pv.z, nv.x, nv.z) !== 0) corners += 1;
  }
  return corners;
}

/** Total hallway floor area without double-counting turn junction overlaps. */
export function hallwayFloorAreaMm2(hallway: Hallway): number {
  const { points } = simplifyHallwayWaypoints(hallway.waypointsMm);
  if (points.length < 2) return 0;

  const widthMm = hallway.widthMm;
  let centerlineLengthMm = 0;
  for (let i = 0; i < points.length - 1; i++) {
    centerlineLengthMm += Math.hypot(
      points[i + 1]!.xMm - points[i]!.xMm,
      points[i + 1]!.zMm - points[i]!.zMm,
    );
  }

  const corners = hallwayTurnCornerCount(points);
  return Math.round(
    widthMm * centerlineLengthMm + widthMm * widthMm - corners * widthMm * widthMm,
  );
}

function hallwayWallSurfaceId(
  prefix: string,
  wallSide: WallSideIdx,
  partIndex: number,
  partCount: number,
): string {
  if (partCount <= 1) return `${prefix}:wall:${wallSide}`;
  return `${prefix}:wall:${wallSide}:${partIndex}`;
}

function hallwayBaseboardSurfaceId(
  prefix: string,
  wallSide: WallSideIdx,
  partIndex: number,
  partCount: number,
): string {
  if (partCount <= 1) return `${prefix}:baseboard:${wallSide}`;
  return `${prefix}:baseboard:${wallSide}:${partIndex}`;
}

function horizontalWallSpecs(
  hallway: Hallway,
  segIndex: number,
  prefix: string,
  wallSide: WallSideIdx,
  layout: { lo: number; hi: number; lengthMm: number; centerMm: number },
  cz: number,
  w: number,
  h: number,
): SurfaceMeshSpec[] {
  const segments = solidHallwayWallSegments(hallway, segIndex, wallSide);
  const zOffset = wallSide === 0 ? -w / 2 : w / 2;
  const rotY = wallSide === 0 ? 0 : Math.PI;
  const specs: SurfaceMeshSpec[] = [];

  segments.forEach((segment, partIndex) => {
    const partCenterMm = layout.lo + (segment.startMm + segment.endMm) / 2;
    const wallCx = partCenterMm * MM;
    const wallLen = segment.lengthMm * MM;

    specs.push({
      surfaceId: hallwayWallSurfaceId(prefix, wallSide, partIndex, segments.length),
      category: "wall",
      position: [wallCx, h / 2, cz + zOffset],
      rotation: [0, rotY, 0],
      size: [wallLen, h],
    });
    specs.push({
      surfaceId: hallwayBaseboardSurfaceId(prefix, wallSide, partIndex, segments.length),
      category: "baseboard",
      position: [
        wallCx,
        BASEBOARD_HEIGHT_M / 2,
        cz + zOffset + (wallSide === 0 ? 1 : -1) * (BASEBOARD_DEPTH_M / 2),
      ],
      rotation: [0, rotY, 0],
      size: [wallLen, BASEBOARD_HEIGHT_M],
    });
  });

  return specs;
}

function verticalWallSpecs(
  hallway: Hallway,
  segIndex: number,
  prefix: string,
  wallSide: WallSideIdx,
  layout: { lo: number; hi: number; lengthMm: number; centerMm: number },
  cx: number,
  w: number,
  h: number,
): SurfaceMeshSpec[] {
  const segments = solidHallwayWallSegments(hallway, segIndex, wallSide);
  const xOffset = wallSide === 0 ? -w / 2 : w / 2;
  const rotY = wallSide === 0 ? Math.PI / 2 : -Math.PI / 2;
  const specs: SurfaceMeshSpec[] = [];

  segments.forEach((segment, partIndex) => {
    const partCenterMm = layout.lo + (segment.startMm + segment.endMm) / 2;
    const wallCz = partCenterMm * MM;
    const wallLen = segment.lengthMm * MM;

    specs.push({
      surfaceId: hallwayWallSurfaceId(prefix, wallSide, partIndex, segments.length),
      category: "wall",
      position: [cx + xOffset, h / 2, wallCz],
      rotation: [0, rotY, 0],
      size: [wallLen, h],
    });
    specs.push({
      surfaceId: hallwayBaseboardSurfaceId(prefix, wallSide, partIndex, segments.length),
      category: "baseboard",
      position: [
        cx + xOffset + (wallSide === 0 ? 1 : -1) * (BASEBOARD_DEPTH_M / 2),
        BASEBOARD_HEIGHT_M / 2,
        wallCz,
      ],
      rotation: [0, rotY, 0],
      size: [wallLen, BASEBOARD_HEIGHT_M],
    });
  });

  return specs;
}

function horizontalSegmentSpecs(
  hallway: Hallway,
  segIndex: number,
  segmentCount: number,
  start: HallwayWaypoint,
  end: HallwayWaypoint,
  trim: SegmentTrim,
  showCeiling: boolean,
): SurfaceMeshSpec[] {
  const h = hallway.heightMm * MM;
  const w = hallway.widthMm * MM;
  const half = hallway.widthMm / 2;
  const zMm = start.zMm;

  const floorSpan = pathFloorAxisSpan(
    start.xMm,
    end.xMm,
    trim,
    half,
    segIndex,
    segmentCount,
  );
  if (!floorSpan) return [];

  const len = floorSpan.lengthMm * MM;
  const cx = floorSpan.centerMm * MM;
  const cz = zMm * MM;
  const prefix = `${hallway.id}:seg:${segIndex}`;

  const specs: SurfaceMeshSpec[] = [
    {
      surfaceId: `${prefix}:floor`,
      category: "floor",
      position: [cx, FLOOR_SURFACE_Y_M, cz],
      rotation: [-Math.PI / 2, 0, 0],
      size: [len, w],
      color: FLOOR_COLOR,
    },
  ];

  if (showCeiling) {
    specs.push({
      surfaceId: `${prefix}:ceiling`,
      category: "ceiling",
      position: [cx, h, cz],
      rotation: [-Math.PI / 2, 0, 0],
      size: [len, w],
    });
  }

  for (const wallSide of [0, 1] as const) {
    const layout = pathAxisSpan(start.xMm, end.xMm, trim, wallSide, half);
    if (!layout) continue;
    specs.push(
      ...horizontalWallSpecs(
        hallway,
        segIndex,
        prefix,
        wallSide,
        layout,
        cz,
        w,
        h,
      ),
    );
  }

  return specs;
}

function verticalSegmentSpecs(
  hallway: Hallway,
  segIndex: number,
  segmentCount: number,
  start: HallwayWaypoint,
  end: HallwayWaypoint,
  trim: SegmentTrim,
  showCeiling: boolean,
): SurfaceMeshSpec[] {
  const h = hallway.heightMm * MM;
  const w = hallway.widthMm * MM;
  const half = hallway.widthMm / 2;
  const xMm = start.xMm;

  const floorSpan = pathFloorAxisSpan(
    start.zMm,
    end.zMm,
    trim,
    half,
    segIndex,
    segmentCount,
  );
  if (!floorSpan) return [];

  const len = floorSpan.lengthMm * MM;
  const cx = xMm * MM;
  const cz = floorSpan.centerMm * MM;
  const prefix = `${hallway.id}:seg:${segIndex}`;

  const specs: SurfaceMeshSpec[] = [
    {
      surfaceId: `${prefix}:floor`,
      category: "floor",
      position: [cx, FLOOR_SURFACE_Y_M, cz],
      rotation: [-Math.PI / 2, 0, 0],
      size: [w, len],
      color: FLOOR_COLOR,
    },
  ];

  if (showCeiling) {
    specs.push({
      surfaceId: `${prefix}:ceiling`,
      category: "ceiling",
      position: [cx, h, cz],
      rotation: [-Math.PI / 2, 0, 0],
      size: [w, len],
    });
  }

  for (const wallSide of [0, 1] as const) {
    const layout = pathAxisSpan(start.zMm, end.zMm, trim, wallSide, half);
    if (!layout) continue;
    specs.push(
      ...verticalWallSpecs(
        hallway,
        segIndex,
        prefix,
        wallSide,
        layout,
        cx,
        w,
        h,
      ),
    );
  }

  return specs;
}

function cornerCeilingPatchSpecs(
  hallway: Hallway,
  point: HallwayWaypoint,
  cornerIndex: number,
): SurfaceMeshSpec[] {
  const w = hallway.widthMm * MM;
  const h = hallway.heightMm * MM;
  const cx = point.xMm * MM;
  const cz = point.zMm * MM;
  const prefix = `${hallway.id}:corner:${cornerIndex}`;

  return [
    {
      surfaceId: `${prefix}:ceiling`,
      category: "ceiling",
      position: [cx, h, cz],
      rotation: [-Math.PI / 2, 0, 0],
      size: [w, w],
    },
  ];
}

function diagonalSegmentSpecs(
  hallway: Hallway,
  segIndex: number,
  start: HallwayWaypoint,
  end: HallwayWaypoint,
  showCeiling: boolean,
): SurfaceMeshSpec[] {
  const dx = end.xMm - start.xMm;
  const dz = end.zMm - start.zMm;
  const lenM = Math.hypot(dx, dz) * MM;
  if (lenM < 0.05) return [];

  const w = hallway.widthMm * MM;
  const h = hallway.heightMm * MM;
  const cx = ((start.xMm + end.xMm) / 2) * MM;
  const cz = ((start.zMm + end.zMm) / 2) * MM;
  const rotY = Math.atan2(dx, dz);
  const prefix = `${hallway.id}:seg:${segIndex}`;

  const specs: SurfaceMeshSpec[] = [
    {
      surfaceId: `${prefix}:floor`,
      category: "floor",
      position: [cx, FLOOR_SURFACE_Y_M, cz],
      rotation: [-Math.PI / 2, rotY, 0],
      size: [lenM, w],
      color: FLOOR_COLOR,
    },
  ];

  if (showCeiling) {
    specs.push({
      surfaceId: `${prefix}:ceiling`,
      category: "ceiling",
      position: [cx, h, cz],
      rotation: [-Math.PI / 2, rotY, 0],
      size: [lenM, w],
    });
  }

  return specs;
}

function specsForSegment(
  hallway: Hallway,
  segIndex: number,
  segmentCount: number,
  a: HallwayWaypoint,
  b: HallwayWaypoint,
  trim: SegmentTrim,
  showCeiling: boolean,
): SurfaceMeshSpec[] {
  const [start, end] = snapSegmentEndpoints(a, b);
  const axis = hallwaySegmentAxis(start, end);
  if (!axis) {
    return diagonalSegmentSpecs(hallway, segIndex, start, end, showCeiling);
  }

  if (axis === "horizontal") {
    return horizontalSegmentSpecs(
      hallway,
      segIndex,
      segmentCount,
      start,
      end,
      trim,
      showCeiling,
    );
  }

  return verticalSegmentSpecs(
    hallway,
    segIndex,
    segmentCount,
    start,
    end,
    trim,
    showCeiling,
  );
}

export interface HallwaySegmentWall {
  segIndex: number;
  side: 0 | 1;
  axis: "horizontal" | "vertical";
  /** Fixed coordinate: z for horizontal walls, x for vertical walls. */
  fixedMm: number;
  loMm: number;
  hiMm: number;
  lengthMm: number;
  normalX: number;
  normalZ: number;
}

/** World-space layout of each selectable hallway segment wall. */
export function listHallwaySegmentWalls(hallway: Hallway): HallwaySegmentWall[] {
  const { points } = simplifyHallwayWaypoints(hallway.waypointsMm);
  if (points.length < 2) return [];

  const half = hallway.widthMm / 2;
  const trims = computeSegmentTrims(points, hallway.widthMm);
  const walls: HallwaySegmentWall[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const [start, end] = snapSegmentEndpoints(points[i], points[i + 1]);
    const axis = hallwaySegmentAxis(start, end);
    if (!axis) continue;

    for (const side of [0, 1] as const) {
      if (axis === "horizontal") {
        const layout = pathAxisSpan(start.xMm, end.xMm, trims[i], side, half);
        if (!layout) continue;
        walls.push({
          segIndex: i,
          side,
          axis: "horizontal",
          fixedMm: start.zMm + (side === 0 ? -half : half),
          loMm: layout.lo,
          hiMm: layout.hi,
          lengthMm: layout.lengthMm,
          normalX: 0,
          normalZ: side === 0 ? -1 : 1,
        });
      } else {
        const layout = pathAxisSpan(start.zMm, end.zMm, trims[i], side, half);
        if (!layout) continue;
        walls.push({
          segIndex: i,
          side,
          axis: "vertical",
          fixedMm: start.xMm + (side === 0 ? -half : half),
          loMm: layout.lo,
          hiMm: layout.hi,
          lengthMm: layout.lengthMm,
          normalX: side === 0 ? -1 : 1,
          normalZ: 0,
        });
      }
    }
  }

  return walls;
}

/** Floor segment bounds for live hallway preview — matches final mesh extensions. */
export function hallwayPreviewFloorSegments(
  points: HallwayWaypoint[],
  widthMm: number,
): Array<{ x1Mm: number; z1Mm: number; x2Mm: number; z2Mm: number }> {
  const { points: normalized } = simplifyHallwayWaypoints(points);
  if (normalized.length < 2) return [];

  const half = widthMm / 2;
  const trims = computeSegmentTrims(normalized, widthMm);
  const segments: Array<{ x1Mm: number; z1Mm: number; x2Mm: number; z2Mm: number }> =
    [];
  const segmentCount = normalized.length - 1;

  for (let i = 0; i < segmentCount; i++) {
    const [start, end] = snapSegmentEndpoints(normalized[i]!, normalized[i + 1]!);
    const axis = hallwaySegmentAxis(start, end);
    if (!axis) continue;

    const trim = trims[i]!;
    if (axis === "horizontal") {
      const span = pathFloorAxisSpan(
        start.xMm,
        end.xMm,
        trim,
        half,
        i,
        segmentCount,
      );
      if (!span) continue;
      segments.push({
        x1Mm: span.lo,
        z1Mm: start.zMm,
        x2Mm: span.hi,
        z2Mm: start.zMm,
      });
    } else {
      const span = pathFloorAxisSpan(
        start.zMm,
        end.zMm,
        trim,
        half,
        i,
        segmentCount,
      );
      if (!span) continue;
      segments.push({
        x1Mm: start.xMm,
        z1Mm: span.lo,
        x2Mm: start.xMm,
        z2Mm: span.hi,
      });
    }
  }

  return segments;
}

const PREVIEW_HALLWAY_ID = "__hallway_preview__";

/** Full hallway surface specs for live draw preview — matches created hallway mesh. */
export function buildHallwayPreviewSpecs(
  points: HallwayWaypoint[],
  widthMm: number,
  heightMm = 2438,
  showCeiling = false,
): SurfaceMeshSpec[] {
  if (points.length < 2) return [];
  return buildHallwaySurfaceSpecs(
    {
      id: PREVIEW_HALLWAY_ID,
      unitId: "",
      floorId: "",
      name: "Preview",
      widthMm,
      heightMm,
      waypointsMm: points,
      coat: { ...DEFAULT_ROOM_COAT },
      surfaceOverrides: {},
      wallOpenings: [],
    },
    { showCeiling },
  );
}

export function buildHallwaySurfaceSpecs(
  hallway: Hallway,
  options: HallwayMeshOptions = { showCeiling: false },
): SurfaceMeshSpec[] {
  if (hallway.waypointsMm.length < 2) return [];

  const showCeiling = options.showCeiling ?? false;
  const { points } = simplifyHallwayWaypoints(hallway.waypointsMm);
  if (points.length < 2) return [];

  const meshHallway = { ...hallway, waypointsMm: points };
  const trims = computeSegmentTrims(points, meshHallway.widthMm);
  const specs: SurfaceMeshSpec[] = [];
  let builtSegments = 0;
  let skippedSegments = 0;
  const segmentCount = points.length - 1;

  for (let i = 0; i < segmentCount; i++) {
    const segSpecs = specsForSegment(
      meshHallway,
      i,
      segmentCount,
      points[i]!,
      points[i + 1]!,
      trims[i]!,
      showCeiling,
    );
    if (segSpecs.length === 0) {
      skippedSegments++;
      logHallway("skip invalid hallway segment", {
        hallwayId: hallway.id,
        segIndex: i,
        from: points[i],
        to: points[i + 1],
      });
      continue;
    }
    builtSegments++;
    specs.push(...segSpecs);
  }

  if (showCeiling) {
    for (let i = 1; i < points.length - 1; i++) {
      specs.push(...cornerCeilingPatchSpecs(meshHallway, points[i]!, i));
    }
  }

  logHallway("built mesh specs", {
    hallwayId: hallway.id,
    inputWaypoints: hallway.waypointsMm.length,
    normalizedWaypoints: points.length,
    builtSegments,
    skippedSegments,
    surfaceCount: specs.length,
    widthMm: hallway.widthMm,
    points,
  });

  return specs;
}

export interface HallwayFloorGridRect {
  centerXM: number;
  centerZM: number;
  widthM: number;
  depthM: number;
}

/** Non-overlapping floor grid tiles aligned to extended hallway segment floors. */
export function hallwayFloorGridRects(hallway: Hallway): HallwayFloorGridRect[] {
  const { points } = simplifyHallwayWaypoints(hallway.waypointsMm);
  if (points.length < 2) return [];

  const half = hallway.widthMm / 2;
  const widthM = hallway.widthMm * MM;
  const trims = computeSegmentTrims(points, hallway.widthMm);
  const rects: HallwayFloorGridRect[] = [];
  const segmentCount = points.length - 1;

  for (let index = 0; index < segmentCount; index += 1) {
    const [start, end] = snapSegmentEndpoints(points[index]!, points[index + 1]!);
    const axis = hallwaySegmentAxis(start, end);
    if (!axis) continue;

    const trim = trims[index]!;

    if (axis === "horizontal") {
      const span = pathFloorAxisSpan(
        start.xMm,
        end.xMm,
        trim,
        half,
        index,
        segmentCount,
      );
      if (!span) continue;
      rects.push({
        centerXM: ((span.lo + span.hi) / 2) * MM,
        centerZM: start.zMm * MM,
        widthM: span.lengthMm * MM,
        depthM: widthM,
      });
      continue;
    }

    const span = pathFloorAxisSpan(
      start.zMm,
      end.zMm,
      trim,
      half,
      index,
      segmentCount,
    );
    if (!span) continue;
    rects.push({
      centerXM: start.xMm * MM,
      centerZM: ((span.lo + span.hi) / 2) * MM,
      widthM,
      depthM: span.lengthMm * MM,
    });
  }

  return rects;
}
