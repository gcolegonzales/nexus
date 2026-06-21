import type { Hallway, HallwayWaypoint, WallSide } from "@/tools/room-coat/types/state";

export type RoomWallLink = {
  kind: "room";
  placementId: string;
  wall: WallSide;
  offsetMm: number;
};

export type HallwayWallLink = {
  kind: "hallway";
  hallwayId: string;
  segIndex: number;
  side: 0 | 1;
  offsetMm: number;
};

export type WallLink = RoomWallLink | HallwayWallLink;

export function isRoomWallLink(link: WallLink): link is RoomWallLink {
  return link.kind === "room";
}

export function isHallwayWallLink(link: WallLink): link is HallwayWallLink {
  return link.kind === "hallway";
}

export function roomWallLink(
  placementId: string,
  wall: WallSide,
  offsetMm: number,
): RoomWallLink {
  return { kind: "room", placementId, wall, offsetMm };
}

export function hallwayWallLink(
  hallwayId: string,
  segIndex: number,
  side: 0 | 1,
  offsetMm: number,
): HallwayWallLink {
  return { kind: "hallway", hallwayId, segIndex, side, offsetMm };
}

export function wallLinkKey(link: WallLink): string {
  if (isRoomWallLink(link)) {
    return `room:${link.placementId}:${link.wall}:${Math.round(link.offsetMm)}`;
  }
  return `hallway:${link.hallwayId}:${link.segIndex}:${link.side}:${Math.round(link.offsetMm)}`;
}

export function hallwayWallHighlightKey(
  hallwayId: string,
  segIndex: number,
  side: 0 | 1,
): string {
  return `${hallwayId}:${segIndex}:${side}`;
}

export function hallwayForLink(
  hallways: Hallway[],
  link: HallwayWallLink,
): Hallway | undefined {
  return hallways.find((hallway) => hallway.id === link.hallwayId);
}
