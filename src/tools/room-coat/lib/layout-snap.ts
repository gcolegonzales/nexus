import {
  floorBoundsFromRooms,
  furnishingRect,
  gapBetweenRects,
  roomRect,
  type OrientedRect,
} from "@/tools/room-coat/lib/layout-bounds";
import { buildFurnishingFaceSnapPoints } from "@/tools/room-coat/lib/furnishing-snap-points";
import {
  offsetToWorldOnWall,
  solidWallSegments,
  wallEdges,
} from "@/tools/room-coat/lib/wall-openings";
import {
  furnishSnapWorldMm,
  inwardSnapWorldMm,
  isWallSnapPoint,
  snapPointWorldMm,
} from "@/tools/room-coat/lib/snap-point-utils";
import type { SnapGuideSegment } from "@/tools/room-coat/lib/snap-guides";
import { snapGuidesForPoint } from "@/tools/room-coat/lib/snap-guides";
import {
  resolveWallCenterLineSnap,
  type WallCenterLineSnap,
} from "@/tools/room-coat/lib/wall-center-line-snap";
import {
  activeMeasureLine,
  collectMeasureLineSnapCandidates,
} from "@/tools/room-coat/lib/measure-line-snap";
import { floorGridCellSizeM } from "@/tools/room-coat/lib/units";
import type {
  Furnishing,
  Hallway,
  PlacedRoom,
  RoomCoatViewSettings,
  SnapPoint,
  UnitPreference,
  WallSide,
} from "@/tools/room-coat/types/state";

const MM_TO_M = 0.001;

export type SnapSourceKind =
  | "grid"
  | "room-wall"
  | "wall-midpoint"
  | "segment-midpoint"
  | "room-corner"
  | "room-center"
  | "floor-center"
  | "object-edge"
  | "object-center"
  | "furnishing-face"
  | "snap-point"
  | "room-align"
  | "measure-start"
  | "measure-end"
  | "measure-midpoint"
  | "measure-line";

export interface SnapSource {
  kind: SnapSourceKind;
  label?: string;
}

export interface SnapCandidate {
  xMm: number;
  zMm: number;
  rotationDeg?: 0 | 90 | 180 | 270;
  source: SnapSource;
  distanceMm: number;
  guides?: SnapGuideSegment[];
}

export interface SnapResolveInput {
  xMm: number;
  zMm: number;
  widthMm: number;
  depthMm: number;
  rotationDeg?: 0 | 90 | 180 | 270;
  rooms: PlacedRoom[];
  furnishings: Furnishing[];
  snapPoints: SnapPoint[];
  hallways?: Hallway[];
  unit: UnitPreference;
  snapMode: RoomCoatViewSettings["snapMode"];
  excludeFurnishingId?: string;
  excludePlacementId?: string;
  /** When no snap is in range, use the raw pointer instead of grid fallback. */
  freeWhenUnmatched?: boolean;
  /** Sticky wall-center line from the previous furnish drag frame. */
  stickyWallCenterLine?: WallCenterLineSnap | null;
  /** Active measure tape on this floor — snap-point placement can target it. */
  measureStart?: { xMm: number; zMm: number; label?: string } | null;
  measureEnd?: { xMm: number; zMm: number; label?: string } | null;
}

export interface SnapResult {
  xMm: number;
  zMm: number;
  rotationDeg: 0 | 90 | 180 | 270;
  source: SnapSource | null;
  guides: SnapGuideSegment[];
  stickyWallCenterLine?: WallCenterLineSnap | null;
}

function gridStepMm(unit: UnitPreference): number {
  return Math.round(floorGridCellSizeM(unit) / MM_TO_M);
}

function orientedSize(
  widthMm: number,
  depthMm: number,
  rotationDeg: 0 | 90 | 180 | 270,
): { widthMm: number; depthMm: number } {
  const swap = rotationDeg === 90 || rotationDeg === 270;
  return {
    widthMm: swap ? depthMm : widthMm,
    depthMm: swap ? widthMm : depthMm,
  };
}

function rectAt(
  centerXMm: number,
  centerZMm: number,
  widthMm: number,
  depthMm: number,
): OrientedRect {
  const halfW = widthMm / 2;
  const halfD = depthMm / 2;
  return {
    minX: centerXMm - halfW,
    maxX: centerXMm + halfW,
    minZ: centerZMm - halfD,
    maxZ: centerZMm + halfD,
    centerX: centerXMm,
    centerZ: centerZMm,
    widthMm,
    depthMm,
  };
}

function pushCandidate(
  candidates: SnapCandidate[],
  candidate: Omit<SnapCandidate, "distanceMm">,
  pointerX: number,
  pointerZ: number,
) {
  candidates.push({
    ...candidate,
    distanceMm: Math.hypot(candidate.xMm - pointerX, candidate.zMm - pointerZ),
  });
}

function allowGrid(mode: RoomCoatViewSettings["snapMode"]): boolean {
  return mode === "all" || mode === "grid-walls" || mode === "grid";
}

function allowGeometry(mode: RoomCoatViewSettings["snapMode"]): boolean {
  return mode === "all" || mode === "grid-walls";
}

function wallIndexLabel(wallIndex: number): string {
  return `Wall ${wallIndex + 1}`;
}

function addRoomWallMidpointCandidates(
  candidates: SnapCandidate[],
  room: PlacedRoom,
  pointerX: number,
  pointerZ: number,
  rotationDeg: 0 | 90 | 180 | 270,
) {
  for (const edge of wallEdges(room)) {
    const wallName = wallIndexLabel(edge.wallIndex);
    const mid = offsetToWorldOnWall(room, edge.wallIndex, edge.lengthMm / 2);
    pushCandidate(
      candidates,
      {
        xMm: Math.round(mid.x),
        zMm: Math.round(mid.z),
        rotationDeg,
        source: {
          kind: "wall-midpoint",
          label: `${wallName} wall center · ${room.name}`,
        },
      },
      pointerX,
      pointerZ,
    );

    for (const segment of solidWallSegments(room, edge.wallIndex)) {
      const center = offsetToWorldOnWall(
        room,
        edge.wallIndex,
        (segment.startMm + segment.endMm) / 2,
      );
      pushCandidate(
        candidates,
        {
          xMm: Math.round(center.x),
          zMm: Math.round(center.z),
          rotationDeg,
          source: {
            kind: "segment-midpoint",
            label: `${wallName} wall center · ${room.name}`,
          },
        },
        pointerX,
        pointerZ,
      );
    }
  }
}

export function collectSnapCandidates(input: SnapResolveInput): SnapCandidate[] {
  const {
    xMm,
    zMm,
    widthMm,
    depthMm,
    rotationDeg = 0,
    rooms,
    furnishings,
    snapPoints,
    unit,
    snapMode,
    excludeFurnishingId,
    excludePlacementId,
  } = input;

  if (snapMode === "off") return [];

  const candidates: SnapCandidate[] = [];
  const size = orientedSize(widthMm, depthMm, rotationDeg);

  const measureLine = activeMeasureLine(
    input.measureStart ?? null,
    input.measureEnd ?? null,
  );
  if (measureLine && allowGeometry(snapMode)) {
    for (const hit of collectMeasureLineSnapCandidates(measureLine, xMm, zMm)) {
      candidates.push({
        xMm: hit.xMm,
        zMm: hit.zMm,
        rotationDeg,
        source: { kind: hit.kind, label: hit.label },
        distanceMm: hit.distanceMm,
        guides: hit.guides,
      });
    }
  }

  if (allowGrid(snapMode)) {
    const step = gridStepMm(unit);
    pushCandidate(
      candidates,
      {
        xMm: Math.round(xMm / step) * step,
        zMm: Math.round(zMm / step) * step,
        rotationDeg,
        source: { kind: "grid", label: "Grid" },
      },
      xMm,
      zMm,
    );
  }

  const floorBounds = floorBoundsFromRooms(rooms);
  if (floorBounds && allowGeometry(snapMode)) {
    pushCandidate(
      candidates,
      {
        xMm: floorBounds.centerX,
        zMm: floorBounds.centerZ,
        rotationDeg,
        source: { kind: "floor-center", label: "Floor center" },
      },
      xMm,
      zMm,
    );
  }

  for (const point of snapPoints) {
    const insetMm = Math.max(size.depthMm / 2, 200);
    const world = isWallSnapPoint(point)
      ? furnishSnapWorldMm(point, rooms, insetMm)
      : snapPointWorldMm(point, rooms);
    pushCandidate(
      candidates,
      {
        xMm: world.xMm,
        zMm: world.zMm,
        rotationDeg: point.rotationDeg ?? rotationDeg,
        source: {
          kind: "snap-point",
          label: point.label ?? "Snap point",
        },
      },
      xMm,
      zMm,
    );
  }

  if (allowGeometry(snapMode)) {
    const openingInsetMm = Math.max(size.depthMm / 2, 200);
    for (const room of rooms) {
      if (excludePlacementId && room.placementId === excludePlacementId) continue;
      for (const opening of room.wallOpenings) {
        const midOffset = (opening.startMm + opening.endMm) / 2;
        const world = inwardSnapWorldMm(
          room,
          opening.wallIndex,
          midOffset,
          openingInsetMm,
        );
        pushCandidate(
          candidates,
          {
            xMm: world.xMm,
            zMm: world.zMm,
            rotationDeg,
            source: {
              kind: "snap-point",
              label: `Door · ${room.name}`,
            },
          },
          xMm,
          zMm,
        );
      }
    }
  }

  for (const room of rooms) {
    if (excludePlacementId && room.placementId === excludePlacementId) continue;
    const rect = roomRect(room);

    if (allowGeometry(snapMode)) {
      addRoomWallMidpointCandidates(candidates, room, xMm, zMm, rotationDeg);

      const targets = [
        { x: rect.minX + size.widthMm / 2, z: rect.centerZ, label: "West wall" },
        { x: rect.maxX - size.widthMm / 2, z: rect.centerZ, label: "East wall" },
        { x: rect.centerX, z: rect.minZ + size.depthMm / 2, label: "North wall" },
        { x: rect.centerX, z: rect.maxZ - size.depthMm / 2, label: "South wall" },
        { x: rect.minX + size.widthMm / 2, z: rect.minZ + size.depthMm / 2, label: "NW corner" },
        { x: rect.maxX - size.widthMm / 2, z: rect.minZ + size.depthMm / 2, label: "NE corner" },
        { x: rect.minX + size.widthMm / 2, z: rect.maxZ - size.depthMm / 2, label: "SW corner" },
        { x: rect.maxX - size.widthMm / 2, z: rect.maxZ - size.depthMm / 2, label: "SE corner" },
        { x: rect.centerX, z: rect.centerZ, label: `${room.name} center` },
      ];

      for (const target of targets) {
        pushCandidate(
          candidates,
          {
            xMm: Math.round(target.x),
            zMm: Math.round(target.z),
            rotationDeg,
            source: {
              kind: target.label.includes("corner")
                ? "room-corner"
                : target.label.includes("center")
                  ? "room-center"
                  : "room-wall",
              label: target.label,
            },
          },
          xMm,
          zMm,
        );
      }
    }
  }

  for (const item of furnishings) {
    if (excludeFurnishingId && item.id === excludeFurnishingId) continue;
    const rect = furnishingRect(item);
    if (allowGeometry(snapMode)) {
      for (const snap of buildFurnishingFaceSnapPoints(item)) {
        pushCandidate(
          candidates,
          {
            xMm: snap.xMm,
            zMm: snap.zMm,
            rotationDeg,
            source: { kind: "furnishing-face", label: snap.label },
          },
          xMm,
          zMm,
        );
      }

      pushCandidate(
        candidates,
        {
          xMm: rect.centerX,
          zMm: rect.centerZ,
          rotationDeg,
          source: { kind: "object-center", label: item.label },
        },
        xMm,
        zMm,
      );

      const edgeTargets = [
        { x: rect.maxX + size.widthMm / 2, z: rect.centerZ },
        { x: rect.minX - size.widthMm / 2, z: rect.centerZ },
        { x: rect.centerX, z: rect.maxZ + size.depthMm / 2 },
        { x: rect.centerX, z: rect.minZ - size.depthMm / 2 },
      ];
      for (const target of edgeTargets) {
        pushCandidate(
          candidates,
          {
            xMm: Math.round(target.x),
            zMm: Math.round(target.z),
            rotationDeg,
            source: { kind: "object-edge", label: item.label },
          },
          xMm,
          zMm,
        );
      }
    }
  }

  return candidates;
}

const SNAP_RADIUS: Record<SnapSourceKind, number> = {
  "measure-start": 300,
  "measure-end": 300,
  "measure-midpoint": 280,
  "measure-line": 220,
  "snap-point": 320,
  "wall-midpoint": 260,
  "segment-midpoint": 240,
  "furnishing-face": 140,
  "object-edge": 120,
  "object-center": 120,
  "room-wall": 120,
  "room-corner": 100,
  "room-center": 120,
  "floor-center": 150,
  grid: 80,
  "room-align": 120,
};

const SNAP_PRIORITY: SnapSourceKind[] = [
  "measure-start",
  "measure-end",
  "measure-midpoint",
  "snap-point",
  "wall-midpoint",
  "segment-midpoint",
  "furnishing-face",
  "measure-line",
  "object-edge",
  "object-center",
  "room-wall",
  "room-corner",
  "room-center",
  "floor-center",
  "room-align",
  "grid",
];

const LINE_SNAP_OVERRIDES_POINT = new Set<SnapSourceKind>([
  "wall-midpoint",
  "segment-midpoint",
  "room-wall",
  "room-corner",
  "room-center",
  "floor-center",
  "object-edge",
  "object-center",
  "grid",
  "room-align",
]);

function lineSnapBeatsPointBest(best: SnapCandidate | null): boolean {
  if (!best) return true;
  if (best.source.kind === "snap-point" || best.source.kind === "furnishing-face") {
    return false;
  }
  return LINE_SNAP_OVERRIDES_POINT.has(best.source.kind);
}

function allowWallCenterLine(mode: RoomCoatViewSettings["snapMode"]): boolean {
  return mode === "all" || mode === "grid-walls";
}

function tryWallCenterLineSnap(
  input: SnapResolveInput,
  rotationDeg: 0 | 90 | 180 | 270,
  best: SnapCandidate | null,
): SnapResult | null {
  if (!input.freeWhenUnmatched || !allowWallCenterLine(input.snapMode)) return null;

  const lineSnap = resolveWallCenterLineSnap({
    pointerXMm: input.xMm,
    pointerZMm: input.zMm,
    rooms: input.rooms,
    stickyLine: input.stickyWallCenterLine ?? null,
  });

  if (!lineSnap || !lineSnapBeatsPointBest(best)) return null;

  return {
    xMm: lineSnap.xMm,
    zMm: lineSnap.zMm,
    rotationDeg,
    source: { kind: "wall-midpoint", label: lineSnap.label },
    guides: lineSnap.guides,
    stickyWallCenterLine: lineSnap.stickyLine,
  };
}

export function resolveSnap(input: SnapResolveInput): SnapResult {
  const rotationDeg = input.rotationDeg ?? 0;
  if (input.snapMode === "off") {
    return {
      xMm: Math.round(input.xMm),
      zMm: Math.round(input.zMm),
      rotationDeg,
      source: null,
      guides: [],
      stickyWallCenterLine: null,
    };
  }

  const candidates = collectSnapCandidates(input);
  let best: SnapCandidate | null = null;

  for (const priority of SNAP_PRIORITY) {
    const radius = SNAP_RADIUS[priority];
    const tier = candidates
      .filter(
        (candidate) =>
          candidate.source.kind === priority &&
          candidate.distanceMm <= radius,
      )
      .sort((a, b) => a.distanceMm - b.distanceMm);
    if (tier.length > 0) {
      best = tier[0];
      break;
    }
  }

  if (!best) {
    const lineResult = tryWallCenterLineSnap(input, rotationDeg, null);
    if (lineResult) return lineResult;

    if (input.freeWhenUnmatched) {
      return {
        xMm: Math.round(input.xMm),
        zMm: Math.round(input.zMm),
        rotationDeg,
        source: null,
        guides: [],
        stickyWallCenterLine: null,
      };
    }

    const step = allowGrid(input.snapMode) ? gridStepMm(input.unit) : 1;
    const xMm = Math.round(input.xMm / step) * step;
    const zMm = Math.round(input.zMm / step) * step;
    const kind = allowGrid(input.snapMode) ? ("grid" as const) : null;
    return {
      xMm,
      zMm,
      rotationDeg,
      source: kind ? { kind, label: "Grid" } : null,
      guides: snapGuidesForPoint({
        xMm,
        zMm,
        kind,
        rooms: input.rooms,
        hallways: input.hallways ?? [],
      }),
    };
  }

  const lineResult = tryWallCenterLineSnap(input, rotationDeg, best);
  if (lineResult) return lineResult;

  return {
    xMm: Math.round(best.xMm),
    zMm: Math.round(best.zMm),
    rotationDeg: best.rotationDeg ?? rotationDeg,
    source: best.source,
    guides:
      best.guides ??
      snapGuidesForPoint({
        xMm: best.xMm,
        zMm: best.zMm,
        kind: best.source.kind,
        rooms: input.rooms,
        hallways: input.hallways ?? [],
      }),
    stickyWallCenterLine: null,
  };
}

export interface RoomMoveSnapInput {
  placementId: string;
  originXMm: number;
  originZMm: number;
  room: PlacedRoom;
  otherRooms: PlacedRoom[];
  unit: UnitPreference;
  snapMode: RoomCoatViewSettings["snapMode"];
}

export function resolveRoomMoveSnap(input: RoomMoveSnapInput): SnapResult {
  const { placementId, originXMm, originZMm, room, otherRooms, unit, snapMode } =
    input;

  const candidates: SnapCandidate[] = [];
  const pointerX = originXMm;
  const pointerZ = originZMm;

  if (allowGrid(snapMode)) {
    const step = gridStepMm(unit);
    pushCandidate(
      candidates,
      {
        xMm: Math.round(originXMm / step) * step,
        zMm: Math.round(originZMm / step) * step,
        source: { kind: "grid", label: "Grid" },
      },
      pointerX,
      pointerZ,
    );
  }

  const moving = {
    ...room,
    originXMm,
    originZMm,
  };
  const movingRect = roomRect(moving);

  for (const other of otherRooms) {
    if (other.placementId === placementId) continue;
    const otherRect = roomRect(other);

    const alignTargets = [
      {
        x: otherRect.minX + movingRect.widthMm / 2,
        z: originZMm,
        label: `Align west · ${other.name}`,
      },
      {
        x: otherRect.maxX - movingRect.widthMm / 2,
        z: originZMm,
        label: `Align east · ${other.name}`,
      },
      {
        x: originXMm,
        z: otherRect.minZ + movingRect.depthMm / 2,
        label: `Align north · ${other.name}`,
      },
      {
        x: originXMm,
        z: otherRect.maxZ - movingRect.depthMm / 2,
        label: `Align south · ${other.name}`,
      },
      { x: otherRect.centerX, z: otherRect.centerZ, label: `Center · ${other.name}` },
    ];

    for (const target of alignTargets) {
      pushCandidate(
        candidates,
        {
          xMm: Math.round(target.x),
          zMm: Math.round(target.z),
          source: { kind: "room-align", label: target.label },
        },
        pointerX,
        pointerZ,
      );
    }

    const edgeGutter = 0;
    const adjacentTargets = [
      { x: otherRect.maxX + movingRect.widthMm / 2 + edgeGutter, z: otherRect.centerZ },
      { x: otherRect.minX - movingRect.widthMm / 2 - edgeGutter, z: otherRect.centerZ },
      { x: otherRect.centerX, z: otherRect.maxZ + movingRect.depthMm / 2 + edgeGutter },
      { x: otherRect.centerX, z: otherRect.minZ - movingRect.depthMm / 2 - edgeGutter },
    ];
    for (const target of adjacentTargets) {
      pushCandidate(
        candidates,
        {
          xMm: Math.round(target.x),
          zMm: Math.round(target.z),
          source: { kind: "room-align", label: `Snap · ${other.name}` },
        },
        pointerX,
        pointerZ,
      );
    }
  }

  let best: SnapCandidate | null = null;
  for (const priority of SNAP_PRIORITY) {
    const radius = SNAP_RADIUS[priority];
    const tier = candidates
      .filter(
        (candidate) =>
          candidate.source.kind === priority &&
          candidate.distanceMm <= radius,
      )
      .sort((a, b) => a.distanceMm - b.distanceMm);
    if (tier.length > 0) {
      best = tier[0];
      break;
    }
  }

  if (!best) {
    return {
      xMm: Math.round(originXMm),
      zMm: Math.round(originZMm),
      rotationDeg: 0,
      source: null,
      guides: [],
    };
  }

  return {
    xMm: best.xMm,
    zMm: best.zMm,
    rotationDeg: 0,
    source: best.source,
    guides: [],
  };
}

export interface ClearanceLabel {
  label: string;
  distanceMm: number;
}

export function nearestClearances(
  item: Pick<Furnishing, "centerXMm" | "centerZMm" | "widthMm" | "depthMm" | "rotationDeg">,
  rooms: PlacedRoom[],
  furnishings: Furnishing[],
  excludeId?: string,
): ClearanceLabel[] {
  const rect = furnishingRect({
    ...item,
    id: "",
    unitId: "",
    floorId: "",
    label: "",
    heightMm: 0,
  });

  const labels: ClearanceLabel[] = [];

  for (const room of rooms) {
    const roomBox = roomRect(room);
    const gap = gapBetweenRects(rect, roomBox);
    if (gap === 0) continue;
    labels.push({ label: `to ${room.name}`, distanceMm: gap });
  }

  for (const other of furnishings) {
    if (excludeId && other.id === excludeId) continue;
    const otherRect = furnishingRect(other);
    if (gapBetweenRects(rect, otherRect) === 0) continue;
    const gap = gapBetweenRects(rect, otherRect);
    labels.push({ label: `to ${other.label}`, distanceMm: gap });
  }

  return labels.sort((a, b) => a.distanceMm - b.distanceMm).slice(0, 3);
}

export function walkwayWarning(
  item: Pick<Furnishing, "centerXMm" | "centerZMm" | "widthMm" | "depthMm" | "rotationDeg">,
  rooms: PlacedRoom[],
  furnishings: Furnishing[],
  excludeId?: string,
  minWalkwayMm = 914,
): boolean {
  const clearances = nearestClearances(item, rooms, furnishings, excludeId);
  return clearances.some((entry) => entry.distanceMm > 0 && entry.distanceMm < minWalkwayMm);
}

export function rectFromCenter(
  centerXMm: number,
  centerZMm: number,
  widthMm: number,
  depthMm: number,
  rotationDeg: 0 | 90 | 180 | 270,
): OrientedRect {
  const size = orientedSize(widthMm, depthMm, rotationDeg);
  return rectAt(centerXMm, centerZMm, size.widthMm, size.depthMm);
}
