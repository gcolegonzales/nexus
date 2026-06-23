import { floorBoundsFromRooms, furnishingRect, roomRect } from "@/tools/room-coat/lib/layout-bounds";
import { buildFurnishingFaceSnapPoints } from "@/tools/room-coat/lib/furnishing-snap-points";
import { roomVertices } from "@/tools/room-coat/lib/room-shape";
import { floorGridCellSizeM } from "@/tools/room-coat/lib/units";
import { isWallSnapPoint } from "@/tools/room-coat/lib/snap-point-utils";
import {
  offsetToWorldOnWall,
  openingsForWall,
  projectPointToWall,
  solidWallSegments,
  wallEdges,
} from "@/tools/room-coat/lib/wall-openings";
import type {
  Furnishing,
  Hallway,
  PlacedRoom,
  RoomCoatViewSettings,
  SnapPoint,
  UnitPreference,
} from "@/tools/room-coat/types/state";

import type { SnapGuideSegment } from "@/tools/room-coat/lib/snap-guides";
import { snapGuidesForPoint } from "@/tools/room-coat/lib/snap-guides";

const MM_TO_M = 0.001;
const PARALLEL_ALIGN_RADIUS_MM = 480;
const PERPENDICULAR_ALIGN_RADIUS_MM = 420;
const HALLWAY_EDGE_RADIUS_MM = 280;
const ANCHOR_EDGE_ATTACH_RADIUS_MM = 280;

export type MeasureSnapKind =
  | "snap-point"
  | "opening-center"
  | "opening-edge"
  | "between-features"
  | "room-corner"
  | "vertex"
  | "wall-endpoint"
  | "wall-midpoint"
  | "segment-midpoint"
  | "wall-edge"
  | "parallel-align"
  | "perpendicular-align"
  | "object-corner"
  | "object-edge-mid"
  | "object-center"
  | "furnishing-face"
  | "room-center"
  | "hallway-corner"
  | "hallway-midpoint"
  | "hallway-edge"
  | "floor-center"
  | "grid";

export interface MeasureSnapSource {
  kind: MeasureSnapKind;
  label: string;
}

export interface MeasureSnapCandidate {
  xMm: number;
  zMm: number;
  source: MeasureSnapSource;
  distanceMm: number;
  guides?: SnapGuideSegment[];
}

export interface MeasureSnapInput {
  xMm: number;
  zMm: number;
  rooms: PlacedRoom[];
  hallways: Hallway[];
  furnishings: Furnishing[];
  snapPoints: SnapPoint[];
  unit: UnitPreference;
  snapMode: RoomCoatViewSettings["snapMode"];
  /** Other measure endpoint — enables parallel, perpendicular, and symmetry snaps. */
  anchor?: { xMm: number; zMm: number } | null;
}

export interface MeasureSnapResult {
  xMm: number;
  zMm: number;
  source: MeasureSnapSource | null;
  guides: SnapGuideSegment[];
}

function gridStepMm(unit: UnitPreference): number {
  return Math.round(floorGridCellSizeM(unit) / MM_TO_M);
}

function allowGrid(mode: RoomCoatViewSettings["snapMode"]): boolean {
  return mode === "all" || mode === "grid-walls" || mode === "grid";
}

function pushCandidate(
  candidates: MeasureSnapCandidate[],
  candidate: Omit<MeasureSnapCandidate, "distanceMm">,
  pointerX: number,
  pointerZ: number,
) {
  candidates.push({
    ...candidate,
    distanceMm: Math.hypot(candidate.xMm - pointerX, candidate.zMm - pointerZ),
  });
}

function wallLabel(wallIndex: number): string {
  return `Wall ${wallIndex + 1}`;
}

interface LayoutEdge {
  x1Mm: number;
  z1Mm: number;
  x2Mm: number;
  z2Mm: number;
  label: string;
}

function edgeSegmentGuide(edge: LayoutEdge): SnapGuideSegment {
  return {
    x1Mm: Math.round(edge.x1Mm),
    z1Mm: Math.round(edge.z1Mm),
    x2Mm: Math.round(edge.x2Mm),
    z2Mm: Math.round(edge.z2Mm),
  };
}

function edgeDirection(edge: LayoutEdge): { dx: number; dz: number; len: number } {
  const dx = edge.x2Mm - edge.x1Mm;
  const dz = edge.z2Mm - edge.z1Mm;
  return { dx, dz, len: Math.hypot(dx, dz) };
}

function edgesParallel(a: LayoutEdge, b: LayoutEdge, angleTolDeg = 4): boolean {
  const ad = edgeDirection(a);
  const bd = edgeDirection(b);
  if (ad.len < 1 || bd.len < 1) return false;
  const dot = Math.abs(
    (ad.dx / ad.len) * (bd.dx / bd.len) + (ad.dz / ad.len) * (bd.dz / bd.len),
  );
  return dot > Math.cos((angleTolDeg * Math.PI) / 180);
}

function edgesPerpendicular(a: LayoutEdge, b: LayoutEdge, angleTolDeg = 4): boolean {
  const ad = edgeDirection(a);
  const bd = edgeDirection(b);
  if (ad.len < 1 || bd.len < 1) return false;
  const dot = Math.abs(
    (ad.dx / ad.len) * (bd.dx / bd.len) + (ad.dz / ad.len) * (bd.dz / bd.len),
  );
  return dot < Math.sin((angleTolDeg * Math.PI) / 180);
}

function distancePointToEdge(
  px: number,
  pz: number,
  edge: LayoutEdge,
): number {
  const projected = projectOntoSegment(
    edge.x1Mm,
    edge.z1Mm,
    edge.x2Mm,
    edge.z2Mm,
    px,
    pz,
  );
  return projected?.distanceMm ?? Infinity;
}

function collectLayoutEdges(
  rooms: PlacedRoom[],
  hallways: Hallway[],
): LayoutEdge[] {
  const edges: LayoutEdge[] = [];

  for (const room of rooms) {
    for (const edge of wallEdges(room)) {
      edges.push({
        x1Mm: edge.x1,
        z1Mm: edge.z1,
        x2Mm: edge.x2,
        z2Mm: edge.z2,
        label: `${wallLabel(edge.wallIndex)} · ${room.name}`,
      });
    }
  }

  for (const hallway of hallways) {
    const points = hallway.waypointsMm;
    for (let index = 0; index < points.length - 1; index += 1) {
      const a = points[index]!;
      const b = points[index + 1]!;
      edges.push({
        x1Mm: a.xMm,
        z1Mm: a.zMm,
        x2Mm: b.xMm,
        z2Mm: b.zMm,
        label: `Hallway segment ${index + 1}`,
      });
    }
  }

  return edges;
}

function edgesNearPoint(
  edges: LayoutEdge[],
  xMm: number,
  zMm: number,
  radiusMm: number,
): LayoutEdge[] {
  return edges.filter(
    (edge) => distancePointToEdge(xMm, zMm, edge) <= radiusMm,
  );
}

function closestPointOnLineThrough(
  ax: number,
  az: number,
  dirX: number,
  dirZ: number,
  px: number,
  pz: number,
): { xMm: number; zMm: number; distanceMm: number } | null {
  const len = Math.hypot(dirX, dirZ);
  if (len < 0.001) return null;
  const ux = dirX / len;
  const uz = dirZ / len;
  const x = ax + ux * ((px - ax) * ux + (pz - az) * uz);
  const z = az + uz * ((px - ax) * ux + (pz - az) * uz);
  return { xMm: x, zMm: z, distanceMm: Math.hypot(px - x, pz - z) };
}

function intersectRayWithLine(
  origin: { xMm: number; zMm: number },
  rayDirX: number,
  rayDirZ: number,
  linePoint: { xMm: number; zMm: number },
  lineDirX: number,
  lineDirZ: number,
): { xMm: number; zMm: number } | null {
  const denom = rayDirX * lineDirZ - rayDirZ * lineDirX;
  if (Math.abs(denom) < 1e-6) return null;
  const ox = linePoint.xMm - origin.xMm;
  const oz = linePoint.zMm - origin.zMm;
  const t = (ox * lineDirZ - oz * lineDirX) / denom;
  return {
    xMm: origin.xMm + rayDirX * t,
    zMm: origin.zMm + rayDirZ * t,
  };
}

function projectOntoSegment(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  px: number,
  pz: number,
): { xMm: number; zMm: number; distanceMm: number } | null {
  const dx = bx - ax;
  const dz = bz - az;
  const lenSq = dx * dx + dz * dz;
  if (lenSq < 1) return null;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / lenSq));
  const x = ax + dx * t;
  const z = az + dz * t;
  return { xMm: x, zMm: z, distanceMm: Math.hypot(px - x, pz - z) };
}

function addMeasureEdgeAlignmentCandidates(
  candidates: MeasureSnapCandidate[],
  input: {
    anchor: { xMm: number; zMm: number };
    xMm: number;
    zMm: number;
    rooms: PlacedRoom[];
    hallways: Hallway[];
  },
) {
  const { anchor, xMm, zMm, rooms, hallways } = input;
  const edges = collectLayoutEdges(rooms, hallways);
  const anchorEdges = edgesNearPoint(
    edges,
    anchor.xMm,
    anchor.zMm,
    ANCHOR_EDGE_ATTACH_RADIUS_MM,
  );

  if (anchorEdges.length === 0) return;

  for (const anchorEdge of anchorEdges) {
    const { dx, dz, len } = edgeDirection(anchorEdge);
    if (len < 1) continue;

    for (const targetEdge of edges) {
      if (!edgesParallel(anchorEdge, targetEdge)) continue;
      if (distancePointToEdge(xMm, zMm, targetEdge) > PARALLEL_ALIGN_RADIUS_MM) {
        continue;
      }

      const parallel = closestPointOnLineThrough(
        anchor.xMm,
        anchor.zMm,
        dx,
        dz,
        xMm,
        zMm,
      );
      if (!parallel || parallel.distanceMm > PARALLEL_ALIGN_RADIUS_MM) continue;

      pushCandidate(
        candidates,
        {
          xMm: Math.round(parallel.xMm),
          zMm: Math.round(parallel.zMm),
          source: {
            kind: "parallel-align",
            label: `Parallel · ${targetEdge.label}`,
          },
          guides: [
            edgeSegmentGuide(anchorEdge),
            edgeSegmentGuide(targetEdge),
          ],
        },
        xMm,
        zMm,
      );
    }

    const perpX = -dz / len;
    const perpZ = dx / len;
    for (const targetEdge of edges) {
      if (!edgesPerpendicular(anchorEdge, targetEdge)) continue;
      if (
        distancePointToEdge(xMm, zMm, targetEdge) > PERPENDICULAR_ALIGN_RADIUS_MM
      ) {
        continue;
      }

      const hit = intersectRayWithLine(
        anchor,
        perpX,
        perpZ,
        { xMm: targetEdge.x1Mm, zMm: targetEdge.z1Mm },
        targetEdge.x2Mm - targetEdge.x1Mm,
        targetEdge.z2Mm - targetEdge.z1Mm,
      );
      if (!hit) continue;

      const distanceMm = Math.hypot(hit.xMm - xMm, hit.zMm - zMm);
      if (distanceMm > PERPENDICULAR_ALIGN_RADIUS_MM) continue;

      pushCandidate(
        candidates,
        {
          xMm: Math.round(hit.xMm),
          zMm: Math.round(hit.zMm),
          source: {
            kind: "perpendicular-align",
            label: `Perpendicular · ${targetEdge.label}`,
          },
          guides: [
            edgeSegmentGuide(anchorEdge),
            edgeSegmentGuide(targetEdge),
          ],
        },
        xMm,
        zMm,
      );
    }
  }
}

function addWallFeatureCandidates(
  candidates: MeasureSnapCandidate[],
  room: PlacedRoom,
  pointerX: number,
  pointerZ: number,
) {
  for (const edge of wallEdges(room)) {
    const wallName = wallLabel(edge.wallIndex);
    pushCandidate(
      candidates,
      {
        xMm: Math.round(edge.x1),
        zMm: Math.round(edge.z1),
        source: {
          kind: "wall-endpoint",
          label: `${wallName} start · ${room.name}`,
        },
      },
      pointerX,
      pointerZ,
    );
    pushCandidate(
      candidates,
      {
        xMm: Math.round(edge.x2),
        zMm: Math.round(edge.z2),
        source: {
          kind: "wall-endpoint",
          label: `${wallName} end · ${room.name}`,
        },
      },
      pointerX,
      pointerZ,
    );

    pushCandidate(
      candidates,
      {
        xMm: Math.round((edge.x1 + edge.x2) / 2),
        zMm: Math.round((edge.z1 + edge.z2) / 2),
        source: {
          kind: "wall-midpoint",
          label: `${wallName} middle · ${room.name}`,
        },
        guides: [
          {
            x1Mm: Math.round(edge.x1),
            z1Mm: Math.round(edge.z1),
            x2Mm: Math.round(edge.x2),
            z2Mm: Math.round(edge.z2),
          },
        ],
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
          source: {
            kind: "segment-midpoint",
            label: `${wallName} segment middle · ${room.name}`,
          },
          guides: [
            {
              x1Mm: Math.round(edge.x1),
              z1Mm: Math.round(edge.z1),
              x2Mm: Math.round(edge.x2),
              z2Mm: Math.round(edge.z2),
            },
          ],
        },
        pointerX,
        pointerZ,
      );
    }

    const offsets = new Set<number>([0, edge.lengthMm]);
    for (const opening of openingsForWall(room, edge.wallIndex)) {
      offsets.add(Math.min(opening.startMm, opening.endMm));
      offsets.add(Math.max(opening.startMm, opening.endMm));

      const start = offsetToWorldOnWall(
        room,
        edge.wallIndex,
        Math.min(opening.startMm, opening.endMm),
      );
      const end = offsetToWorldOnWall(
        room,
        edge.wallIndex,
        Math.max(opening.startMm, opening.endMm),
      );
      const center = offsetToWorldOnWall(
        room,
        edge.wallIndex,
        (Math.min(opening.startMm, opening.endMm) +
          Math.max(opening.startMm, opening.endMm)) /
          2,
      );

      pushCandidate(
        candidates,
        {
          xMm: Math.round(start.x),
          zMm: Math.round(start.z),
          source: {
            kind: "opening-edge",
            label: `Opening edge · ${room.name} ${wallName}`,
          },
        },
        pointerX,
        pointerZ,
      );
      pushCandidate(
        candidates,
        {
          xMm: Math.round(end.x),
          zMm: Math.round(end.z),
          source: {
            kind: "opening-edge",
            label: `Opening edge · ${room.name} ${wallName}`,
          },
        },
        pointerX,
        pointerZ,
      );
      pushCandidate(
        candidates,
        {
          xMm: Math.round(center.x),
          zMm: Math.round(center.z),
          source: {
            kind: "opening-center",
            label: `Opening center · ${room.name} ${wallName}`,
          },
        },
        pointerX,
        pointerZ,
      );
    }

    const sorted = [...offsets].sort((a, b) => a - b);
    for (let index = 0; index < sorted.length - 1; index += 1) {
      const start = sorted[index]!;
      const end = sorted[index + 1]!;
      if (end - start < 80) continue;
      const midOffset = (start + end) / 2;
      const mid = offsetToWorldOnWall(room, edge.wallIndex, midOffset);
      const betweenLabel =
        start === 0 || end === edge.lengthMm
          ? `${wallName} span middle · ${room.name}`
          : `${wallName} between openings middle · ${room.name}`;
      pushCandidate(
        candidates,
        {
          xMm: Math.round(mid.x),
          zMm: Math.round(mid.z),
          source: {
            kind: "between-features",
            label: betweenLabel,
          },
        },
        pointerX,
        pointerZ,
      );
    }

    const projected = projectPointToWall(room, edge.wallIndex, pointerX, pointerZ);
    if (projected && projected.distanceMm <= 320) {
      pushCandidate(
        candidates,
        {
          xMm: Math.round(projected.x),
          zMm: Math.round(projected.z),
          source: {
            kind: "wall-edge",
            label: `${wallName} wall · ${room.name}`,
          },
        },
        pointerX,
        pointerZ,
      );
    }
  }
}

export function collectMeasureSnapCandidates(
  input: MeasureSnapInput,
): MeasureSnapCandidate[] {
  const {
    xMm,
    zMm,
    rooms,
    hallways,
    furnishings,
    snapPoints,
    unit,
    snapMode,
    anchor,
  } = input;

  const candidates: MeasureSnapCandidate[] = [];

  if (anchor) {
    addMeasureEdgeAlignmentCandidates(candidates, {
      anchor,
      xMm,
      zMm,
      rooms,
      hallways,
    });
  }

  if (allowGrid(snapMode)) {
    const step = gridStepMm(unit);
    pushCandidate(
      candidates,
      {
        xMm: Math.round(xMm / step) * step,
        zMm: Math.round(zMm / step) * step,
        source: { kind: "grid", label: "Grid" },
      },
      xMm,
      zMm,
    );
  }

  const floorBounds = floorBoundsFromRooms(rooms);
  if (floorBounds) {
    pushCandidate(
      candidates,
      {
        xMm: Math.round(floorBounds.centerX),
        zMm: Math.round(floorBounds.centerZ),
        source: { kind: "floor-center", label: "Floor center" },
      },
      xMm,
      zMm,
    );
  }

  for (const point of snapPoints) {
    if (point.kind === "wall" && isWallSnapPoint(point)) {
      const room = rooms.find(
        (item) => item.placementId === point.roomPlacementId,
      );
      if (!room || point.wallIndex === undefined || point.wallOffsetMm === undefined) continue;
      const world = offsetToWorldOnWall(room, point.wallIndex, point.wallOffsetMm);
      pushCandidate(
        candidates,
        {
          xMm: Math.round(world.x),
          zMm: Math.round(world.z),
          source: {
            kind: "snap-point",
            label: point.label ?? "Entrance marker",
          },
        },
        xMm,
        zMm,
      );
      continue;
    }
    pushCandidate(
      candidates,
      {
        xMm: point.xMm,
        zMm: point.zMm,
        source: {
          kind: "snap-point",
          label: point.label ?? "Snap point",
        },
      },
      xMm,
      zMm,
    );
  }

  for (const room of rooms) {
    const rect = roomRect(room);
    const vertices = roomVertices(room);
    vertices.forEach((vertex, index) => {
      pushCandidate(
        candidates,
        {
          xMm: vertex.xMm,
          zMm: vertex.zMm,
          source: {
            kind: "vertex",
            label: `Corner ${index + 1} · ${room.name}`,
          },
        },
        xMm,
        zMm,
      );
    });

    for (let index = 0; index < vertices.length; index += 1) {
      const a = vertices[index]!;
      const b = vertices[(index + 1) % vertices.length]!;
      const wallName = wallLabel(index);
      pushCandidate(
        candidates,
        {
          xMm: Math.round((a.xMm + b.xMm) / 2),
          zMm: Math.round((a.zMm + b.zMm) / 2),
          source: {
            kind: "wall-midpoint",
            label: `${wallName} middle · ${room.name}`,
          },
          guides: [
            {
              x1Mm: a.xMm,
              z1Mm: a.zMm,
              x2Mm: b.xMm,
              z2Mm: b.zMm,
            },
          ],
        },
        xMm,
        zMm,
      );
    }

    pushCandidate(
      candidates,
      {
        xMm: Math.round(rect.centerX),
        zMm: Math.round(rect.centerZ),
        source: {
          kind: "room-center",
          label: `${room.name} center`,
        },
      },
      xMm,
      zMm,
    );

    addWallFeatureCandidates(candidates, room, xMm, zMm);
  }

  for (const item of furnishings) {
    const rect = furnishingRect(item);

    for (const snap of buildFurnishingFaceSnapPoints(item)) {
      pushCandidate(
        candidates,
        {
          xMm: snap.xMm,
          zMm: snap.zMm,
          source: { kind: "furnishing-face", label: snap.label },
        },
        xMm,
        zMm,
      );
    }

    pushCandidate(
      candidates,
      {
        xMm: Math.round(rect.centerX),
        zMm: Math.round(rect.centerZ),
        source: { kind: "object-center", label: `${item.label} center` },
      },
      xMm,
      zMm,
    );

    const corners = [
      { x: rect.minX, z: rect.minZ },
      { x: rect.maxX, z: rect.minZ },
      { x: rect.minX, z: rect.maxZ },
      { x: rect.maxX, z: rect.maxZ },
    ];
    for (const corner of corners) {
      pushCandidate(
        candidates,
        {
          xMm: Math.round(corner.x),
          zMm: Math.round(corner.z),
          source: { kind: "object-corner", label: `${item.label} corner` },
        },
        xMm,
        zMm,
      );
    }

    const edgeMids = [
      { x: rect.centerX, z: rect.minZ, label: "north middle" },
      { x: rect.centerX, z: rect.maxZ, label: "south middle" },
      { x: rect.minX, z: rect.centerZ, label: "west middle" },
      { x: rect.maxX, z: rect.centerZ, label: "east middle" },
    ];
    for (const edge of edgeMids) {
      pushCandidate(
        candidates,
        {
          xMm: Math.round(edge.x),
          zMm: Math.round(edge.z),
          source: {
            kind: "object-edge-mid",
            label: `${item.label} ${edge.label}`,
          },
          guides: [
            edge.label.startsWith("north") || edge.label.startsWith("south")
              ? {
                  x1Mm: Math.round(rect.minX),
                  z1Mm: Math.round(edge.z),
                  x2Mm: Math.round(rect.maxX),
                  z2Mm: Math.round(edge.z),
                }
              : {
                  x1Mm: Math.round(edge.x),
                  z1Mm: Math.round(rect.minZ),
                  x2Mm: Math.round(edge.x),
                  z2Mm: Math.round(rect.maxZ),
                },
          ],
        },
        xMm,
        zMm,
      );
    }
  }

  for (const hallway of hallways) {
    const points = hallway.waypointsMm;
    for (let index = 0; index < points.length; index += 1) {
      const point = points[index]!;
      pushCandidate(
        candidates,
        {
          xMm: point.xMm,
          zMm: point.zMm,
          source: {
            kind: "hallway-corner",
            label: `Hallway corner ${index + 1}`,
          },
        },
        xMm,
        zMm,
      );
      if (index < points.length - 1) {
        const next = points[index + 1]!;
        pushCandidate(
          candidates,
          {
            xMm: Math.round((point.xMm + next.xMm) / 2),
            zMm: Math.round((point.zMm + next.zMm) / 2),
            source: {
              kind: "hallway-midpoint",
              label: `Hallway segment ${index + 1} middle`,
            },
            guides: [
              {
                x1Mm: point.xMm,
                z1Mm: point.zMm,
                x2Mm: next.xMm,
                z2Mm: next.zMm,
              },
            ],
          },
          xMm,
          zMm,
        );

        const projected = projectOntoSegment(
          point.xMm,
          point.zMm,
          next.xMm,
          next.zMm,
          xMm,
          zMm,
        );
        if (projected && projected.distanceMm <= HALLWAY_EDGE_RADIUS_MM) {
          pushCandidate(
            candidates,
            {
              xMm: Math.round(projected.xMm),
              zMm: Math.round(projected.zMm),
              source: {
                kind: "hallway-edge",
                label: `Hallway edge ${index + 1}`,
              },
              guides: [
                {
                  x1Mm: point.xMm,
                  z1Mm: point.zMm,
                  x2Mm: next.xMm,
                  z2Mm: next.zMm,
                },
              ],
            },
            xMm,
            zMm,
          );
        }
      }
    }
  }

  return candidates;
}

const MEASURE_SNAP_RADIUS: Record<MeasureSnapKind, number> = {
  "snap-point": 320,
  "opening-center": 280,
  "opening-edge": 260,
  "between-features": 260,
  "wall-endpoint": 260,
  vertex: 240,
  "room-corner": 240,
  "object-corner": 220,
  "furnishing-face": 220,
  "wall-midpoint": 300,
  "segment-midpoint": 280,
  "parallel-align": PARALLEL_ALIGN_RADIUS_MM,
  "perpendicular-align": PERPENDICULAR_ALIGN_RADIUS_MM,
  "wall-edge": 200,
  "object-edge-mid": 280,
  "object-center": 180,
  "room-center": 180,
  "hallway-corner": 220,
  "hallway-midpoint": 280,
  "hallway-edge": HALLWAY_EDGE_RADIUS_MM,
  "floor-center": 200,
  grid: 100,
};

const MEASURE_SNAP_PRIORITY: MeasureSnapKind[] = [
  "snap-point",
  "furnishing-face",
  "opening-center",
  "opening-edge",
  "wall-endpoint",
  "vertex",
  "room-corner",
  "object-corner",
  "wall-midpoint",
  "segment-midpoint",
  "object-edge-mid",
  "hallway-midpoint",
  "parallel-align",
  "perpendicular-align",
  "between-features",
  "object-center",
  "room-center",
  "hallway-corner",
  "hallway-edge",
  "wall-edge",
  "floor-center",
  "grid",
];

export function resolveMeasureSnap(input: MeasureSnapInput): MeasureSnapResult {
  const candidates = collectMeasureSnapCandidates(input);
  let best: MeasureSnapCandidate | null = null;

  for (const priority of MEASURE_SNAP_PRIORITY) {
    const radius = MEASURE_SNAP_RADIUS[priority];
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
    const step = allowGrid(input.snapMode) ? gridStepMm(input.unit) : 1;
    const xMm = Math.round(input.xMm / step) * step;
    const zMm = Math.round(input.zMm / step) * step;
    const kind = allowGrid(input.snapMode) ? ("grid" as const) : null;
    return {
      xMm,
      zMm,
      source: kind ? { kind, label: "Grid" } : null,
      guides: snapGuidesForPoint({
        xMm,
        zMm,
        kind,
        rooms: input.rooms,
        hallways: input.hallways,
      }),
    };
  }

  return {
    xMm: best.xMm,
    zMm: best.zMm,
    source: best.source,
    guides:
      best.guides ??
      snapGuidesForPoint({
        xMm: best.xMm,
        zMm: best.zMm,
        kind: best.source.kind,
        rooms: input.rooms,
        hallways: input.hallways,
      }),
  };
}
