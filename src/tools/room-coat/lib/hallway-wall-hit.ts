import type { Hallway, HallwayWaypoint, PlacedRoom } from "@/tools/room-coat/types/state";
import { logHallway } from "@/tools/room-coat/lib/hallway-debug";
import { findWallHit, type WallHit } from "@/tools/room-coat/lib/wall-openings";
import {
  listHallwaySegmentWalls,
  type HallwaySegmentWall,
} from "@/tools/room-coat/lib/hallway-geometry";
import type { HallwayWallLink } from "@/tools/room-coat/lib/wall-links";
import {
  hallwayWallLink,
  isHallwayWallLink,
} from "@/tools/room-coat/lib/wall-links";

import type { WallPlacement } from "@/tools/room-coat/lib/hallway-draft";

const MIN_HALLWAY_WIDTH_MM = 600;

export interface WallHitAttachInfo {
  pointerXMm?: number;
  pointerZMm?: number;
  faceNormalX?: number;
  faceNormalZ?: number;
}

export interface HallwayWallHit {
  hallway: Hallway;
  segIndex: number;
  side: 0 | 1;
  xMm: number;
  zMm: number;
  offsetMm: number;
  faceNormalX: number;
  faceNormalZ: number;
}

export type EndpointWallHit =
  | { kind: "room"; hit: WallHit & { distanceMm: number } }
  | { kind: "hallway"; hit: HallwayWallHit & { distanceMm: number } };

function distanceToSegmentWall(
  layout: HallwaySegmentWall,
  xMm: number,
  zMm: number,
): {
  distanceMm: number;
  offsetMm: number;
  x: number;
  z: number;
} | null {
  if (layout.axis === "horizontal") {
    const clampedX = Math.max(layout.loMm, Math.min(layout.hiMm, xMm));
    const dx = xMm - clampedX;
    const dz = zMm - layout.fixedMm;
    const distanceMm = Math.hypot(dx, dz);
    return {
      distanceMm,
      offsetMm: clampedX - layout.loMm,
      x: clampedX,
      z: layout.fixedMm,
    };
  }

  const clampedZ = Math.max(layout.loMm, Math.min(layout.hiMm, zMm));
  const dx = xMm - layout.fixedMm;
  const dz = zMm - clampedZ;
  const distanceMm = Math.hypot(dx, dz);
  return {
    distanceMm,
    offsetMm: clampedZ - layout.loMm,
    x: layout.fixedMm,
    z: clampedZ,
  };
}

export function clampHallwayWallOffset(
  layout: HallwaySegmentWall,
  offsetMm: number,
  widthMm: number,
): number {
  const half = widthMm / 2;
  return Math.max(half, Math.min(layout.lengthMm - half, offsetMm));
}

export function openingSpanOnHallwayWall(
  layout: HallwaySegmentWall,
  offsetMm: number,
  widthMm: number,
): { startMm: number; endMm: number } {
  const half = widthMm / 2;
  const clamped = clampHallwayWallOffset(layout, offsetMm, widthMm);
  return {
    startMm: Math.max(0, clamped - half),
    endMm: Math.min(layout.lengthMm, clamped + half),
  };
}

export function offsetToWorldOnHallwayWall(
  hallway: Hallway,
  segIndex: number,
  side: 0 | 1,
  offsetMm: number,
): { x: number; z: number } | null {
  const layout = listHallwaySegmentWalls(hallway).find(
    (wall) => wall.segIndex === segIndex && wall.side === side,
  );
  if (!layout) return null;

  if (layout.axis === "horizontal") {
    return { x: layout.loMm + offsetMm, z: layout.fixedMm };
  }
  return { x: layout.fixedMm, z: layout.loMm + offsetMm };
}

export function projectPointToHallwayWall(
  hallway: Hallway,
  segIndex: number,
  side: 0 | 1,
  xMm: number,
  zMm: number,
): {
  offsetMm: number;
  distanceMm: number;
  x: number;
  z: number;
} | null {
  const layout = listHallwaySegmentWalls(hallway).find(
    (wall) => wall.segIndex === segIndex && wall.side === side,
  );
  if (!layout) return null;
  return distanceToSegmentWall(layout, xMm, zMm);
}

export function findHallwayWallHit(
  hallways: Hallway[],
  xMm: number,
  zMm: number,
  maxDistanceMm = 280,
  excludeHallwayId?: string,
): HallwayWallHit | null {
  let best: (HallwayWallHit & { distanceMm: number }) | null = null;

  for (const hallway of hallways) {
    if (excludeHallwayId && hallway.id === excludeHallwayId) continue;

    for (const layout of listHallwaySegmentWalls(hallway)) {
      const projected = distanceToSegmentWall(layout, xMm, zMm);
      if (!projected || projected.distanceMm > maxDistanceMm) continue;

      if (!best || projected.distanceMm < best.distanceMm) {
        best = {
          hallway,
          segIndex: layout.segIndex,
          side: layout.side,
          xMm: projected.x,
          zMm: projected.z,
          offsetMm: projected.offsetMm,
          faceNormalX: layout.normalX,
          faceNormalZ: layout.normalZ,
          distanceMm: projected.distanceMm,
        };
      }
    }
  }

  if (!best) return null;
  const { distanceMm: _, ...hit } = best;
  return hit;
}

export function findEndpointWallHit(
  rooms: PlacedRoom[],
  hallways: Hallway[],
  xMm: number,
  zMm: number,
  maxDistanceMm = 280,
  excludeHallwayId?: string,
): EndpointWallHit | null {
  const roomHit = findWallHit(rooms, xMm, zMm, maxDistanceMm);
  const hallwayHit = findHallwayWallHit(
    hallways,
    xMm,
    zMm,
    maxDistanceMm,
    excludeHallwayId,
  );

  let roomDist = Infinity;
  if (roomHit) {
    roomDist = Math.hypot(xMm - roomHit.x, zMm - roomHit.z);
  }

  let hallwayDist = Infinity;
  if (hallwayHit) {
    hallwayDist = Math.hypot(xMm - hallwayHit.xMm, zMm - hallwayHit.zMm);
  }

  if (roomDist === Infinity && hallwayDist === Infinity) return null;
  if (hallwayDist <= roomDist && hallwayHit) {
    return { kind: "hallway", hit: { ...hallwayHit, distanceMm: hallwayDist } };
  }
  if (roomHit) {
    return { kind: "room", hit: { ...roomHit, distanceMm: roomDist } };
  }
  return hallwayHit
    ? { kind: "hallway", hit: { ...hallwayHit, distanceMm: hallwayDist } }
    : null;
}

export function hallwayWallHitToLink(
  hit: HallwayWallHit,
  widthMm: number,
): HallwayWallLink {
  const layout = listHallwaySegmentWalls(hit.hallway).find(
    (wall) => wall.segIndex === hit.segIndex && wall.side === hit.side,
  );
  const offsetMm = layout
    ? clampHallwayWallOffset(layout, hit.offsetMm, widthMm)
    : hit.offsetMm;
  return hallwayWallLink(hit.hallway.id, hit.segIndex, hit.side, offsetMm);
}

export function pointFromHallwayLink(
  hallway: Hallway,
  link: HallwayWallLink,
): HallwayWaypoint | null {
  const world = offsetToWorldOnHallwayWall(
    hallway,
    link.segIndex,
    link.side,
    link.offsetMm,
  );
  if (!world) return null;
  return { xMm: world.x, zMm: world.z };
}

export function centerlinePointFromHallwayLink(
  hallway: Hallway,
  link: HallwayWallLink,
  widthMm: number,
  hit?: WallHitAttachInfo,
  approachFrom?: HallwayWaypoint,
): HallwayWaypoint | null {
  const onWall = pointFromHallwayLink(hallway, link);
  if (!onWall) return null;

  const layout = getHallwayWallLayout(hallway, link.segIndex, link.side);
  if (!layout) return onWall;

  const half = widthMm / 2;
  let centerline: HallwayWaypoint;

  if (hit && Math.hypot(hit.faceNormalX ?? 0, hit.faceNormalZ ?? 0) > 0.01) {
    centerline = {
      xMm: onWall.xMm + (hit.faceNormalX ?? 0) * half,
      zMm: onWall.zMm + (hit.faceNormalZ ?? 0) * half,
    };
  } else if (approachFrom) {
    const dx = approachFrom.xMm - onWall.xMm;
    const dz = approachFrom.zMm - onWall.zMm;
    const dot = dx * layout.normalX + dz * layout.normalZ;
    const side = dot >= 0 ? 1 : -1;
    centerline = {
      xMm: onWall.xMm + layout.normalX * side * half,
      zMm: onWall.zMm + layout.normalZ * side * half,
    };
  } else {
    centerline = {
      xMm: onWall.xMm + layout.normalX * half,
      zMm: onWall.zMm + layout.normalZ * half,
    };
  }

  logHallway("centerline from hallway wall", {
    hallwayId: hallway.id,
    segIndex: link.segIndex,
    side: link.side,
    onWall,
    centerline,
  });

  return centerline;
}

export function axisAlignedHallwayCenterline(
  hallway: Hallway,
  link: HallwayWallLink,
  widthMm: number,
  adjacent: HallwayWaypoint,
  hit?: WallHitAttachInfo,
): HallwayWaypoint | null {
  const centerline = centerlinePointFromHallwayLink(
    hallway,
    link,
    widthMm,
    hit,
    adjacent,
  );
  if (!centerline) return null;

  const layout = getHallwayWallLayout(hallway, link.segIndex, link.side);
  if (!layout) return centerline;

  if (layout.axis === "horizontal") {
    return { xMm: adjacent.xMm, zMm: centerline.zMm };
  }
  return { xMm: centerline.xMm, zMm: adjacent.zMm };
}

export function createWallPlacementFromHallwayHit(
  hallway: Hallway,
  hit: HallwayWallHit,
  widthMm: number,
  approachFrom?: HallwayWaypoint,
): {
  link: HallwayWallLink;
  widthMm: number;
  faceNormalX: number;
  faceNormalZ: number;
} {
  const layout = getHallwayWallLayout(hallway, hit.segIndex, hit.side);
  const offsetMm = layout
    ? clampHallwayWallOffset(layout, hit.offsetMm, widthMm)
    : hit.offsetMm;

  let faceNormalX = hit.faceNormalX;
  let faceNormalZ = hit.faceNormalZ;
  if (approachFrom && layout) {
    const onWall = offsetToWorldOnHallwayWall(
      hallway,
      hit.segIndex,
      hit.side,
      offsetMm,
    );
    if (onWall) {
      const dx = approachFrom.xMm - onWall.x;
      const dz = approachFrom.zMm - onWall.z;
      const dot = dx * layout.normalX + dz * layout.normalZ;
      faceNormalX = dot >= 0 ? layout.normalX : -layout.normalX;
      faceNormalZ = dot >= 0 ? layout.normalZ : -layout.normalZ;
    }
  }

  return {
    link: hallwayWallLink(hallway.id, hit.segIndex, hit.side, offsetMm),
    widthMm,
    faceNormalX,
    faceNormalZ,
  };
}

export function openingSpanForHallwayLink(
  hallway: Hallway,
  link: HallwayWallLink,
  widthMm: number,
): { startMm: number; endMm: number } | null {
  const layout = getHallwayWallLayout(hallway, link.segIndex, link.side);
  if (!layout) return null;
  return openingSpanOnHallwayWall(layout, link.offsetMm, widthMm);
}

export function getHallwayWallLayout(
  hallway: Hallway,
  segIndex: number,
  side: 0 | 1,
): HallwaySegmentWall | undefined {
  return listHallwaySegmentWalls(hallway).find(
    (wall) => wall.segIndex === segIndex && wall.side === side,
  );
}

export function offsetFromHallwayWallPointer(
  hallway: Hallway,
  segIndex: number,
  side: 0 | 1,
  xMm: number,
  zMm: number,
  widthMm: number,
): number {
  const projected = projectPointToHallwayWall(hallway, segIndex, side, xMm, zMm);
  if (!projected) return 0;
  const layout = getHallwayWallLayout(hallway, segIndex, side);
  if (!layout) return projected.offsetMm;
  return clampHallwayWallOffset(layout, projected.offsetMm, widthMm);
}

export function setHallwayPlacementCenter(
  hallway: Hallway,
  placement: WallPlacement,
  offsetMm: number,
): WallPlacement {
  if (!isHallwayWallLink(placement.link)) return placement;
  const layout = getHallwayWallLayout(
    hallway,
    placement.link.segIndex,
    placement.link.side,
  );
  if (!layout) return placement;
  return {
    ...placement,
    link: {
      ...placement.link,
      offsetMm: clampHallwayWallOffset(layout, offsetMm, placement.widthMm),
    },
  };
}

export function setHallwayPlacementSpan(
  hallway: Hallway,
  placement: WallPlacement,
  startMm: number,
  endMm: number,
): WallPlacement {
  if (!isHallwayWallLink(placement.link)) return placement;
  const layout = getHallwayWallLayout(
    hallway,
    placement.link.segIndex,
    placement.link.side,
  );
  if (!layout) return placement;
  const lo = Math.max(0, Math.min(startMm, endMm));
  const hi = Math.min(layout.lengthMm, Math.max(startMm, endMm));
  const widthMm = Math.max(MIN_HALLWAY_WIDTH_MM, hi - lo);
  const offsetMm = (lo + hi) / 2;
  return {
    ...placement,
    widthMm,
    link: {
      ...placement.link,
      offsetMm: clampHallwayWallOffset(layout, offsetMm, widthMm),
    },
  };
}

export function hallwayWallHitFromPointer(
  hallway: Hallway,
  segIndex: number,
  side: 0 | 1,
  worldXM: number,
  worldZM: number,
  faceNormalX = 0,
  faceNormalZ = 0,
): HallwayWallHit | null {
  const MM_TO_M = 0.001;
  const pointerXMm = worldXM / MM_TO_M;
  const pointerZMm = worldZM / MM_TO_M;
  const projected = projectPointToHallwayWall(
    hallway,
    segIndex,
    side,
    pointerXMm,
    pointerZMm,
  );
  if (!projected) return null;

  const layout = getHallwayWallLayout(hallway, segIndex, side);
  const len = Math.hypot(faceNormalX, faceNormalZ);
  const nx =
    len > 0.001
      ? faceNormalX / len
      : layout?.normalX ?? 0;
  const nz =
    len > 0.001
      ? faceNormalZ / len
      : layout?.normalZ ?? 0;

  return {
    hallway,
    segIndex,
    side,
    xMm: projected.x,
    zMm: projected.z,
    offsetMm: projected.offsetMm,
    faceNormalX: nx,
    faceNormalZ: nz,
  };
}
