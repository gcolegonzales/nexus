import type { Hallway } from "@/tools/room-coat/types/state";
import { listHallwaySegmentWalls } from "@/tools/room-coat/lib/hallway-geometry";
import {
  parseHallwaySurfaceId,
  parseRoomWallSurfaceId,
} from "@/tools/room-coat/lib/editor-surfaces";

export function roomWallLabelNumber(wallIndex: number): number {
  return wallIndex + 1;
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
    return String(roomWallLabelNumber(roomWall.wallIndex));
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
    return `room:${roomWall.placementId}:${roomWall.wallIndex}`;
  }

  const hallwayWall = parseHallwaySurfaceId(surfaceId);
  if (hallwayWall?.category === "wall") {
    return `hallway:${hallwayWall.hallwayId}:${hallwayWall.segIndex}:${hallwayWall.sideIndex}`;
  }

  return null;
}
