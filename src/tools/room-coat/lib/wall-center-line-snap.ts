import { linkApproachAxis } from "@/tools/room-coat/lib/room-shape";
import {
  offsetToWorldOnWall,
  projectPointToWall,
  wallEdges,
} from "@/tools/room-coat/lib/wall-openings";
import type { SnapGuideSegment } from "@/tools/room-coat/lib/snap-guides";
import type { PlacedRoom } from "@/tools/room-coat/types/state";

/** Perpendicular distance to engage a wall-center trace line. */
export const WALL_CENTER_LINE_ENGAGE_MM = 150;
/** Stay snapped until roughly 20–30px off the line at typical editor zoom. */
export const WALL_CENTER_LINE_RELEASE_MM = 280;
/** Initial engage only when the pointer is this close to the wall surface. */
export const WALL_CENTER_LINE_WALL_PROXIMITY_MM = 280;
const LINE_ALONG_PADDING_MM = 120;

export interface WallCenterLineSnap {
  roomPlacementId: string;
  wallIndex: number;
  lockAxis: "x" | "z";
  lockValueMm: number;
}

function wallIndexLabel(wallIndex: number): string {
  return `Wall ${wallIndex + 1}`;
}

export function wallCenterLineGuide(
  room: PlacedRoom,
  wallIndex: number,
): SnapGuideSegment {
  const edge = wallEdges(room).find((item) => item.wallIndex === wallIndex);
  if (!edge) {
    return { x1Mm: 0, z1Mm: 0, x2Mm: 0, z2Mm: 0 };
  }
  return {
    x1Mm: Math.round(edge.x1),
    z1Mm: Math.round(edge.z1),
    x2Mm: Math.round(edge.x2),
    z2Mm: Math.round(edge.z2),
  };
}

function lineMetrics(
  room: PlacedRoom,
  wallIndex: number,
  pointerXMm: number,
  pointerZMm: number,
): {
  perpendicularMm: number;
  distanceFromWallMm: number;
  alongLine: boolean;
  snap: WallCenterLineSnap;
} | null {
  const edge = wallEdges(room).find((item) => item.wallIndex === wallIndex);
  const projected = projectPointToWall(room, wallIndex, pointerXMm, pointerZMm);
  if (!edge || !projected) return null;

  const mid = offsetToWorldOnWall(room, wallIndex, edge.lengthMm / 2);
  const axis = linkApproachAxis(room, wallIndex);

  if (axis === "z") {
    return {
      perpendicularMm: Math.abs(pointerXMm - mid.x),
      distanceFromWallMm: projected.distanceMm,
      alongLine:
        projected.offsetMm >= -LINE_ALONG_PADDING_MM &&
        projected.offsetMm <= edge.lengthMm + LINE_ALONG_PADDING_MM,
      snap: {
        roomPlacementId: room.placementId,
        wallIndex,
        lockAxis: "x",
        lockValueMm: Math.round(mid.x),
      },
    };
  }

  return {
    perpendicularMm: Math.abs(pointerZMm - mid.z),
    distanceFromWallMm: projected.distanceMm,
    alongLine:
      projected.offsetMm >= -LINE_ALONG_PADDING_MM &&
      projected.offsetMm <= edge.lengthMm + LINE_ALONG_PADDING_MM,
    snap: {
      roomPlacementId: room.placementId,
      wallIndex,
      lockAxis: "z",
      lockValueMm: Math.round(mid.z),
    },
  };
}

function nearestWallCenterLine(
  pointerXMm: number,
  pointerZMm: number,
  rooms: PlacedRoom[],
  maxPerpendicularMm: number,
): { snap: WallCenterLineSnap; room: PlacedRoom; perpendicularMm: number } | null {
  let best: {
    snap: WallCenterLineSnap;
    room: PlacedRoom;
    perpendicularMm: number;
  } | null = null;

  for (const room of rooms) {
    for (const edge of wallEdges(room)) {
      const metrics = lineMetrics(
        room,
        edge.wallIndex,
        pointerXMm,
        pointerZMm,
      );
      if (
        !metrics ||
        !metrics.alongLine ||
        metrics.perpendicularMm > maxPerpendicularMm ||
        metrics.distanceFromWallMm < 0 ||
        metrics.distanceFromWallMm > WALL_CENTER_LINE_WALL_PROXIMITY_MM
      ) {
        continue;
      }
      if (!best || metrics.perpendicularMm < best.perpendicularMm) {
        best = {
          snap: metrics.snap,
          room,
          perpendicularMm: metrics.perpendicularMm,
        };
      }
    }
  }

  return best;
}

export function projectOntoWallCenterLine(
  pointerXMm: number,
  pointerZMm: number,
  line: WallCenterLineSnap,
): { xMm: number; zMm: number } {
  if (line.lockAxis === "x") {
    return {
      xMm: line.lockValueMm,
      zMm: Math.round(pointerZMm),
    };
  }
  return {
    xMm: Math.round(pointerXMm),
    zMm: line.lockValueMm,
  };
}

export function wallCenterLineSnapLabel(
  room: PlacedRoom,
  wallIndex: number,
): string {
  return `${wallIndexLabel(wallIndex)} wall center · ${room.name}`;
}

export function resolveWallCenterLineSnap(input: {
  pointerXMm: number;
  pointerZMm: number;
  rooms: PlacedRoom[];
  stickyLine: WallCenterLineSnap | null;
}): {
  label: string;
  guides: SnapGuideSegment[];
  stickyLine: WallCenterLineSnap | null;
  xMm: number;
  zMm: number;
} | null {
  const { pointerXMm, pointerZMm, rooms, stickyLine } = input;

  if (stickyLine) {
    const room = rooms.find(
      (item) => item.placementId === stickyLine.roomPlacementId,
    );
    if (room) {
      const metrics = lineMetrics(
        room,
        stickyLine.wallIndex,
        pointerXMm,
        pointerZMm,
      );
      if (
        metrics &&
        metrics.alongLine &&
        metrics.perpendicularMm <= WALL_CENTER_LINE_RELEASE_MM
      ) {
        const projected = projectOntoWallCenterLine(
          pointerXMm,
          pointerZMm,
          stickyLine,
        );
        return {
          xMm: projected.xMm,
          zMm: projected.zMm,
          stickyLine,
          label: wallCenterLineSnapLabel(room, stickyLine.wallIndex),
          guides: [wallCenterLineGuide(room, stickyLine.wallIndex)],
        };
      }
    }
  }

  const nearest = nearestWallCenterLine(
    pointerXMm,
    pointerZMm,
    rooms,
    WALL_CENTER_LINE_ENGAGE_MM,
  );
  if (!nearest) return null;

  const projected = projectOntoWallCenterLine(
    pointerXMm,
    pointerZMm,
    nearest.snap,
  );
  return {
    xMm: projected.xMm,
    zMm: projected.zMm,
    stickyLine: nearest.snap,
    label: wallCenterLineSnapLabel(nearest.room, nearest.snap.wallIndex),
    guides: [wallCenterLineGuide(nearest.room, nearest.snap.wallIndex)],
  };
}
