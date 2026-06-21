import type { Hallway, WallSide } from "@/tools/room-coat/types/state";
import { listHallwaySegmentWalls } from "@/tools/room-coat/lib/hallway-geometry";
import {
  parseHallwaySurfaceId,
  parseRoomWallSurfaceId,
} from "@/tools/room-coat/lib/editor-surfaces";

/** Clockwise from north when viewed from above. */
const ROOM_WALL_NUMBERS: Record<WallSide, number> = {
  north: 1,
  east: 2,
  south: 3,
  west: 4,
};

export function roomWallLabelNumber(wall: WallSide): number {
  return ROOM_WALL_NUMBERS[wall];
}

export function hallwayWallLabelNumber(
  hallway: Hallway,
  segIndex: number,
  side: 0 | 1,
): number {
  const walls = listHallwaySegmentWalls(hallway);
  const index = walls.findIndex(
    (wall) => wall.segIndex === segIndex && wall.side === side,
  );
  return index >= 0 ? index + 1 : 1;
}

export function wallLabelTextForSurfaceId(
  surfaceId: string,
  hallway?: Hallway,
): string | null {
  const roomWall = parseRoomWallSurfaceId(surfaceId);
  if (roomWall) {
    return String(roomWallLabelNumber(roomWall.wall));
  }

  const hallwayWall = parseHallwaySurfaceId(surfaceId);
  if (hallwayWall?.category === "wall" && hallway) {
    return String(
      hallwayWallLabelNumber(
        hallway,
        hallwayWall.segIndex,
        hallwayWall.sideIndex as 0 | 1,
      ),
    );
  }

  return null;
}

export function wallLabelKey(surfaceId: string): string | null {
  const roomWall = parseRoomWallSurfaceId(surfaceId);
  if (roomWall) {
    return `room:${roomWall.placementId}:${roomWall.wall}`;
  }

  const hallwayWall = parseHallwaySurfaceId(surfaceId);
  if (hallwayWall?.category === "wall") {
    return `hallway:${hallwayWall.hallwayId}:${hallwayWall.segIndex}:${hallwayWall.sideIndex}`;
  }

  return null;
}
