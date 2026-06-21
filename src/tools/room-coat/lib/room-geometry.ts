import type { Door, PlacedRoom, WallSide } from "@/tools/room-coat/types/state";
import {
  solidWallSegments,
  wallSegmentCenter,
} from "@/tools/room-coat/lib/wall-openings";

const MM_TO_M = 0.001;
const BASEBOARD_HEIGHT_M = 0.08;
const BASEBOARD_DEPTH_M = 0.02;
const FLOOR_COLOR = "#64748b";

const WALL_SIDES: WallSide[] = ["north", "south", "east", "west"];

export interface SurfaceMeshSpec {
  surfaceId: string;
  category: "wall" | "baseboard" | "ceiling" | "door" | "floor";
  position: [number, number, number];
  rotation: [number, number, number];
  size: [number, number];
  color?: string;
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
  return [room.originXMm * MM_TO_M, 0, room.originZMm * MM_TO_M];
}

function wallPlaneSpec(
  room: PlacedRoom,
  wall: WallSide,
  segIndex: number,
  startMm: number,
  endMm: number,
  category: "wall" | "baseboard",
  h: number,
  w: number,
  l: number,
): SurfaceMeshSpec {
  const id = room.placementId;
  const segLenM = (endMm - startMm) * MM_TO_M;
  const midMm = (startMm + endMm) / 2;

  if (category === "wall") {
    switch (wall) {
      case "north":
        return {
          surfaceId: `${id}:wall:${wall}:${segIndex}`,
          category: "wall",
          position: [(-room.widthMm / 2 + midMm) * MM_TO_M, h / 2, -l / 2],
          rotation: [0, 0, 0],
          size: [segLenM, h],
        };
      case "south":
        return {
          surfaceId: `${id}:wall:${wall}:${segIndex}`,
          category: "wall",
          position: [(-room.widthMm / 2 + midMm) * MM_TO_M, h / 2, l / 2],
          rotation: [0, Math.PI, 0],
          size: [segLenM, h],
        };
      case "west":
        return {
          surfaceId: `${id}:wall:${wall}:${segIndex}`,
          category: "wall",
          position: [-w / 2, h / 2, (-room.lengthMm / 2 + midMm) * MM_TO_M],
          rotation: [0, Math.PI / 2, 0],
          size: [segLenM, h],
        };
      case "east":
        return {
          surfaceId: `${id}:wall:${wall}:${segIndex}`,
          category: "wall",
          position: [w / 2, h / 2, (-room.lengthMm / 2 + midMm) * MM_TO_M],
          rotation: [0, -Math.PI / 2, 0],
          size: [segLenM, h],
        };
    }
  }

  const bbH = BASEBOARD_HEIGHT_M;
  switch (wall) {
    case "north":
      return {
        surfaceId: `${id}:baseboard:${wall}:${segIndex}`,
        category: "baseboard",
        position: [
          (-room.widthMm / 2 + midMm) * MM_TO_M,
          bbH / 2,
          -l / 2 + BASEBOARD_DEPTH_M / 2,
        ],
        rotation: [0, 0, 0],
        size: [segLenM, bbH],
      };
    case "south":
      return {
        surfaceId: `${id}:baseboard:${wall}:${segIndex}`,
        category: "baseboard",
        position: [
          (-room.widthMm / 2 + midMm) * MM_TO_M,
          bbH / 2,
          l / 2 - BASEBOARD_DEPTH_M / 2,
        ],
        rotation: [0, Math.PI, 0],
        size: [segLenM, bbH],
      };
    case "west":
      return {
        surfaceId: `${id}:baseboard:${wall}:${segIndex}`,
        category: "baseboard",
        position: [
          -w / 2 + BASEBOARD_DEPTH_M / 2,
          bbH / 2,
          (-room.lengthMm / 2 + midMm) * MM_TO_M,
        ],
        rotation: [0, Math.PI / 2, 0],
        size: [segLenM, bbH],
      };
    case "east":
      return {
        surfaceId: `${id}:baseboard:${wall}:${segIndex}`,
        category: "baseboard",
        position: [
          w / 2 - BASEBOARD_DEPTH_M / 2,
          bbH / 2,
          (-room.lengthMm / 2 + midMm) * MM_TO_M,
        ],
        rotation: [0, -Math.PI / 2, 0],
        size: [segLenM, bbH],
      };
  }
}

export function buildRoomSurfaceSpecs(
  room: PlacedRoom,
  options: RoomMeshOptions,
): SurfaceMeshSpec[] {
  const { width: w, length: l, height: h } = roomDimensionsM(room);
  const id = room.placementId;
  const specs: SurfaceMeshSpec[] = [];

  if (options.showFloor !== false) {
    specs.push({
      surfaceId: `${id}:floor`,
      category: "floor",
      position: [0, 0.001, 0],
      rotation: [-Math.PI / 2, 0, 0],
      size: [w, l],
      color: FLOOR_COLOR,
    });
  }

  for (const wall of WALL_SIDES) {
    const segments = solidWallSegments(room, wall);
    segments.forEach((segment, segIndex) => {
      specs.push(
        wallPlaneSpec(room, wall, segIndex, segment.startMm, segment.endMm, "wall", h, w, l),
      );
      specs.push(
        wallPlaneSpec(
          room,
          wall,
          segIndex,
          segment.startMm,
          segment.endMm,
          "baseboard",
          h,
          w,
          l,
        ),
      );
    });
  }

  if (options.showCeiling) {
    specs.push({
      surfaceId: `${id}:ceiling`,
      category: "ceiling",
      position: [0, h, 0],
      rotation: [-Math.PI / 2, 0, 0],
      size: [w, l],
    });
  }

  for (const door of room.doors) {
    specs.push(buildDoorSpec(id, door, w, l, h));
  }

  void wallSegmentCenter;
  return specs;
}

function buildDoorSpec(
  roomId: string,
  door: Door,
  w: number,
  l: number,
  h: number,
): SurfaceMeshSpec {
  const doorW = door.widthMm * MM_TO_M;
  const doorH = door.heightMm * MM_TO_M;
  const offset = door.offsetFromCornerMm * MM_TO_M;

  const { position, rotation, planeSize } = doorPlacement(
    door.wall,
    doorW,
    doorH,
    offset,
    w,
    l,
    h,
  );

  return {
    surfaceId: `${roomId}:door:${door.id}`,
    category: "door",
    position,
    rotation,
    size: planeSize,
  };
}

function doorPlacement(
  wall: WallSide,
  doorW: number,
  doorH: number,
  offset: number,
  roomW: number,
  roomL: number,
  roomH: number,
): {
  position: [number, number, number];
  rotation: [number, number, number];
  planeSize: [number, number];
} {
  void roomH;
  switch (wall) {
    case "north": {
      const x = -roomW / 2 + offset + doorW / 2;
      return {
        position: [x, doorH / 2, -roomL / 2 + 0.01],
        rotation: [0, 0, 0],
        planeSize: [doorW, doorH],
      };
    }
    case "south": {
      const x = -roomW / 2 + offset + doorW / 2;
      return {
        position: [x, doorH / 2, roomL / 2 - 0.01],
        rotation: [0, Math.PI, 0],
        planeSize: [doorW, doorH],
      };
    }
    case "west": {
      const z = -roomL / 2 + offset + doorW / 2;
      return {
        position: [-roomW / 2 + 0.01, doorH / 2, z],
        rotation: [0, Math.PI / 2, 0],
        planeSize: [doorW, doorH],
      };
    }
    case "east": {
      const z = -roomL / 2 + offset + doorW / 2;
      return {
        position: [roomW / 2 - 0.01, doorH / 2, z],
        rotation: [0, -Math.PI / 2, 0],
        planeSize: [doorW, doorH],
      };
    }
  }
}

export function cameraDistanceForRoom(room: PlacedRoom): number {
  const { width, length, height } = roomDimensionsM(room);
  return Math.max(width, length, height) * 2.2;
}

export function cameraDistanceForBounds(
  widthM: number,
  lengthM: number,
  heightM: number,
): number {
  return Math.max(widthM, lengthM, heightM) * 2.2;
}
