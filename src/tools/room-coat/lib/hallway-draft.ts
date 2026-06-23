import { logHallway } from "@/tools/room-coat/lib/hallway-debug";
import type {
  Hallway,
  HallwayWaypoint,
  PlacedRoom,
  SnapPoint,
  WallOpening,
  WallSide,
} from "@/tools/room-coat/types/state";
import {
  axisAlignedHallwayCenterline,
  centerlinePointFromHallwayLink,
  createWallPlacementFromHallwayHit,
  findEndpointWallHit,
  findHallwayWallHit,
  clampHallwayWallOffset,
  getHallwayWallLayout,
  openingSpanForHallwayLink,
  pointFromHallwayLink,
  type HallwayWallHit,
  type WallHitAttachInfo,
} from "@/tools/room-coat/lib/hallway-wall-hit";
import { listHallwaySegmentWalls } from "@/tools/room-coat/lib/hallway-geometry";
import { openingsForHallwayWall } from "@/tools/room-coat/lib/hallway-openings";
import {
  collectHallwayEntranceTargets,
  collectHallwayContinuationTargets,
  resolveHallwayDrawLineSnap,
  shouldSnapPointToEntranceCenter,
  snapEndpointToEntrance,
  targetToPlacement,
  type HallwayEntranceLineSnap,
} from "@/tools/room-coat/lib/hallway-entrance-snaps";
import {
  linkApproachAxis,
  linkOutwardNormal,
  linkOutwardSign,
  snapToAngleMode,
  type RoomAngleSnapMode,
} from "@/tools/room-coat/lib/room-shape";
import {
  findWallHit,
  offsetToWorldOnWall,
  openingsForWall,
  projectPointToWall,
  wallEdges,
} from "@/tools/room-coat/lib/wall-openings";
import {
  hallwayForLink,
  hallwayWallHighlightKey,
  isHallwayWallLink,
  isRoomWallLink,
  roomWallLink,
  hallwayWallLink,
  wallLinkKey,
  type HallwayWallLink,
  type RoomWallLink,
  type WallLink,
} from "@/tools/room-coat/lib/wall-links";

export type { HallwayWallLink, RoomWallLink, WallLink };
export {
  hallwayWallHighlightKey,
  isHallwayWallLink,
  isRoomWallLink,
  roomWallLink,
};
export type { HallwayWallHit, WallHitAttachInfo };
export { createWallPlacementFromHallwayHit, findHallwayWallHit };

export type HallwayDrawPhase =
  | "idle"
  | "placing-start"
  | "pick-end"
  | "align-exit"
  | "placing-end"
  | "dragging"
  | "ready";

export interface WallPlacement {
  link: WallLink;
  widthMm: number;
  faceNormalX: number;
  faceNormalZ: number;
}

export interface HallwayDrawDraft {
  phase: HallwayDrawPhase;
  widthMm: number;
  points: HallwayWaypoint[];
  links: Array<WallLink | null>;
  preview: HallwayWaypoint | null;
  wallPlacement: WallPlacement | null;
  /** Fixed entrance placement while picking the exit wall. */
  startPlacement: WallPlacement | null;
  /** Fixed exit placement while aligning the path between portals. */
  endPlacement: WallPlacement | null;
}

export const MIN_HALLWAY_WIDTH_MM = 600;

export const DEFAULT_HALLWAY_WIDTH_MM = 914;
export const PREVIEW_HALLWAY_COLOR = "#22d3ee";
export const PREVIEW_HALLWAY_EMISSIVE = "#0891b2";
export const PREVIEW_OPENING_COLOR = "#f97316";
export const PREVIEW_OPENING_EMISSIVE = "#ea580c";

const MIN_SEGMENT_MM = 200;

export function createHallwayDrawDraft(): HallwayDrawDraft {
  return {
    phase: "idle",
    widthMm: DEFAULT_HALLWAY_WIDTH_MM,
    points: [],
    links: [],
    preview: null,
    wallPlacement: null,
    startPlacement: null,
    endPlacement: null,
  };
}

export function draftHint(draft: HallwayDrawDraft): string {
  switch (draft.phase) {
    case "idle":
      return "Click a room wall for entrance A — snaps to orange door markers. Adjust opening, then pick the exit wall.";
    case "placing-start":
      return "Entrance A: gold = slide along wall · cyan = width · click green center or Pick exit wall when ready. Purple arrow = manual path instead.";
    case "pick-end":
      return "Entrance A set. Click the exit wall (entrance B) — snaps to door markers.";
    case "align-exit":
      return "Both portals set. Click a green snap guide or drag the purple arrow — hallway draws only after you pick a route.";
    case "placing-end":
      return "Orange outline = wall cutout. Adjust the opening, then click Create hallway or the green center handle.";
    case "dragging":
      return "Drag the end handle straight to lengthen the path, or sideways to turn 90°. Click a wall to finish.";
    case "ready":
      return draft.links[draft.links.length - 1]
        ? "Path complete. Click Create hallway, drag the end handle straight to lengthen, or sideways to add a turn."
        : "Drag the end handle straight to lengthen, sideways to turn, or click the end wall (orange outline) then Create hallway.";
  }
}

export function resolveHallwayExitNormal(
  room: PlacedRoom,
  wallIndex: number,
  offsetMm: number,
  approachFrom?: HallwayWaypoint,
): { x: number; z: number } {
  const outward = linkOutwardNormal(room, wallIndex);
  if (!approachFrom) {
    return { x: outward.xMm, z: outward.zMm };
  }

  const onWall = offsetToWorldOnWall(room, wallIndex, offsetMm);
  if (linkApproachAxis(room, wallIndex) === "z") {
    const dz = approachFrom.zMm - onWall.z;
    const sign =
      Math.abs(dz) > 20
        ? (Math.sign(dz) as 1 | -1)
        : linkOutwardSign(room, wallIndex);
    return { x: 0, z: sign };
  }

  const dx = approachFrom.xMm - onWall.x;
  const sign =
    Math.abs(dx) > 20
      ? (Math.sign(dx) as 1 | -1)
      : linkOutwardSign(room, wallIndex);
  return { x: sign, z: 0 };
}

export function createWallPlacementFromHit(
  room: PlacedRoom,
  hit: {
    wallIndex: number;
    offsetMm: number;
    faceNormalX?: number;
    faceNormalZ?: number;
  },
  widthMm: number,
  approachFrom?: HallwayWaypoint,
): WallPlacement {
  const clamped = clampWallOffset(room, hit.wallIndex, hit.offsetMm, widthMm);
  const exit = resolveHallwayExitNormal(room, hit.wallIndex, clamped, approachFrom);
  return {
    link: roomWallLink(room.placementId, hit.wallIndex, clamped),
    widthMm,
    faceNormalX: exit.x,
    faceNormalZ: exit.z,
  };
}

export function placementOpeningSpan(
  room: PlacedRoom | null,
  hallways: Hallway[],
  placement: WallPlacement,
): { startMm: number; endMm: number } {
  if (isHallwayWallLink(placement.link)) {
    const hallway = hallwayForLink(hallways, placement.link);
    if (!hallway) return { startMm: 0, endMm: placement.widthMm };
    return (
      openingSpanForHallwayLink(hallway, placement.link, placement.widthMm) ?? {
        startMm: 0,
        endMm: placement.widthMm,
      }
    );
  }
  if (!room) return { startMm: 0, endMm: placement.widthMm };
  return openingSpanForLink(room, placement.link, placement.widthMm);
}

export function setPlacementCenter(
  room: PlacedRoom,
  placement: WallPlacement,
  offsetMm: number,
): WallPlacement {
  if (!isRoomWallLink(placement.link)) return placement;
  return {
    ...placement,
    link: {
      ...placement.link,
      offsetMm: clampWallOffset(
        room,
        placement.link.wallIndex,
        offsetMm,
        placement.widthMm,
      ),
    },
  };
}

export function offsetFromWallPointer(
  room: PlacedRoom,
  wallIndex: number,
  xMm: number,
  zMm: number,
  widthMm: number,
): number {
  const projected = projectPointToWall(room, wallIndex, xMm, zMm);
  if (!projected) return 0;
  return clampWallOffset(room, wallIndex, projected.offsetMm, widthMm);
}

export function setPlacementSpan(
  room: PlacedRoom,
  placement: WallPlacement,
  startMm: number,
  endMm: number,
): WallPlacement {
  if (!isRoomWallLink(placement.link)) return placement;
  const link = placement.link;
  const edge = wallEdges(room).find((item) => item.wallIndex === link.wallIndex);
  if (!edge) return placement;
  const lo = Math.max(0, Math.min(startMm, endMm));
  const hi = Math.min(edge.lengthMm, Math.max(startMm, endMm));
  const widthMm = Math.max(MIN_HALLWAY_WIDTH_MM, hi - lo);
  const offsetMm = (lo + hi) / 2;
  return {
    ...placement,
    widthMm,
    link: {
      ...link,
      offsetMm: clampWallOffset(room, link.wallIndex, offsetMm, widthMm),
    },
  };
}

export function commitWallPlacementPoint(
  room: PlacedRoom | null,
  hallways: Hallway[],
  placement: WallPlacement,
  approachFrom?: HallwayWaypoint,
): { point: HallwayWaypoint; link: WallLink } {
  if (isHallwayWallLink(placement.link)) {
    const hallway = hallwayForLink(hallways, placement.link);
    if (!hallway) {
      return { point: { xMm: 0, zMm: 0 }, link: placement.link };
    }
    const point =
      centerlinePointFromHallwayLink(
        hallway,
        placement.link,
        placement.widthMm,
        {
          faceNormalX: placement.faceNormalX,
          faceNormalZ: placement.faceNormalZ,
        },
        approachFrom,
      ) ?? { xMm: 0, zMm: 0 };
    return { point, link: placement.link };
  }

  if (!room) {
    return { point: { xMm: 0, zMm: 0 }, link: placement.link };
  }

  const hit: WallHitAttachInfo = {
    faceNormalX: placement.faceNormalX,
    faceNormalZ: placement.faceNormalZ,
  };
  const link = placement.link;
  const point = centerlinePointFromWallHit(
    room,
    link,
    placement.widthMm,
    hit,
    approachFrom,
  );
  return { point, link };
}

export function pullPointFromWallStart(
  room: PlacedRoom | null,
  hallways: Hallway[],
  placement: WallPlacement,
  cursorX: number,
  cursorZ: number,
): HallwayWaypoint | null {
  const { point: start } = commitWallPlacementPoint(
    room,
    hallways,
    placement,
  );

  if (isHallwayWallLink(placement.link)) {
    const hallway = hallwayForLink(hallways, placement.link);
    const layout = hallway
      ? getHallwayWallLayout(hallway, placement.link.segIndex, placement.link.side)
      : null;
    if (!layout) return null;

    if (layout.axis === "horizontal") {
      const delta = cursorZ - start.zMm;
      const outward =
        Math.abs(delta) < MIN_SEGMENT_MM
          ? layout.normalZ * MIN_SEGMENT_MM
          : Math.sign(delta) === Math.sign(layout.normalZ)
            ? delta
            : layout.normalZ * MIN_SEGMENT_MM;
      return { xMm: start.xMm, zMm: Math.round(start.zMm + outward) };
    }

    const delta = cursorX - start.xMm;
    const outward =
      Math.abs(delta) < MIN_SEGMENT_MM
        ? layout.normalX * MIN_SEGMENT_MM
        : Math.sign(delta) === Math.sign(layout.normalX)
          ? delta
          : layout.normalX * MIN_SEGMENT_MM;
    return { xMm: Math.round(start.xMm + outward), zMm: start.zMm };
  }

  if (!room || !isRoomWallLink(placement.link)) return null;

  const exit = resolveHallwayExitNormal(
    room,
    placement.link.wallIndex,
    placement.link.offsetMm,
  );
  const axis = linkApproachAxis(room, placement.link.wallIndex);

  if (axis === "z") {
    const exitSign = (exit.z || linkOutwardSign(room, placement.link.wallIndex)) as 1 | -1;
    const delta = cursorZ - start.zMm;
    const outward =
      Math.abs(delta) < MIN_SEGMENT_MM
        ? exitSign * MIN_SEGMENT_MM
        : Math.sign(delta) === exitSign
          ? delta
          : exitSign * MIN_SEGMENT_MM;
    return { xMm: start.xMm, zMm: Math.round(start.zMm + outward) };
  }

  const exitSign = (exit.x || linkOutwardSign(room, placement.link.wallIndex)) as 1 | -1;
  const delta = cursorX - start.xMm;
  const outward =
    Math.abs(delta) < MIN_SEGMENT_MM
      ? exitSign * MIN_SEGMENT_MM
      : Math.sign(delta) === exitSign
        ? delta
        : exitSign * MIN_SEGMENT_MM;
  return { xMm: Math.round(start.xMm + outward), zMm: start.zMm };
}

export function allDraftPoints(draft: HallwayDrawDraft): HallwayWaypoint[] {
  if (draft.preview) return [...draft.points, draft.preview];
  return draft.points;
}

export function wallApproachAxis(wall: WallSide): "x" | "z" {
  return wall === "north" || wall === "south" ? "z" : "x";
}

export function wallOutwardSign(wall: WallSide): 1 | -1 {
  switch (wall) {
    case "north":
    case "west":
      return -1;
    case "south":
    case "east":
      return 1;
  }
}

export function pointFromLink(
  room: PlacedRoom,
  link: RoomWallLink,
): HallwayWaypoint {
  const world = offsetToWorldOnWall(room, link.wallIndex, link.offsetMm);
  return { xMm: world.x, zMm: world.z };
}

export function wallOutwardNormal(wall: WallSide): { xMm: number; zMm: number } {
  switch (wall) {
    case "north":
      return { xMm: 0, zMm: -1 };
    case "south":
      return { xMm: 0, zMm: 1 };
    case "west":
      return { xMm: -1, zMm: 0 };
    case "east":
      return { xMm: 1, zMm: 0 };
  }
}

/** Place corridor centerline half-width on the clicked/approach side of the wall. */
export function centerlinePointFromWallHit(
  room: PlacedRoom,
  link: RoomWallLink,
  widthMm: number,
  hit?: WallHitAttachInfo,
  approachFrom?: HallwayWaypoint,
): HallwayWaypoint {
  const onWall = pointFromLink(room, link);
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
    const normal = linkOutwardNormal(room, link.wallIndex);
    const dot = dx * normal.xMm + dz * normal.zMm;
    const side = dot >= 0 ? 1 : -1;
    centerline = {
      xMm: onWall.xMm + normal.xMm * side * half,
      zMm: onWall.zMm + normal.zMm * side * half,
    };
  } else {
    const sign = linkOutwardSign(room, link.wallIndex);
    if (linkApproachAxis(room, link.wallIndex) === "z") {
      centerline = { xMm: onWall.xMm, zMm: onWall.zMm + sign * half };
    } else {
      centerline = { xMm: onWall.xMm + sign * half, zMm: onWall.zMm };
    }
  }

  logHallway("centerline from wall", {
    wall: link.wallIndex,
    offsetMm: link.offsetMm,
    onWall,
    centerline,
    faceNormal: hit ? { x: hit.faceNormalX, z: hit.faceNormalZ } : undefined,
    approachFrom,
  });

  return centerline;
}

/** Keep the start/end centerline on the same axis as the adjacent path point. */
export function axisAlignedWallCenterline(
  room: PlacedRoom,
  link: RoomWallLink,
  widthMm: number,
  adjacent: HallwayWaypoint,
  hit?: WallHitAttachInfo,
): HallwayWaypoint {
  const centerline = centerlinePointFromWallHit(
    room,
    link,
    widthMm,
    hit,
    adjacent,
  );
  if (linkApproachAxis(room, link.wallIndex) === "z") {
    return { xMm: adjacent.xMm, zMm: centerline.zMm };
  }
  return { xMm: centerline.xMm, zMm: adjacent.zMm };
}

function anchorStartToWall(
  room: PlacedRoom,
  link: RoomWallLink,
  widthMm: number,
  nextPoint: HallwayWaypoint,
): HallwayWaypoint {
  return axisAlignedWallCenterline(room, link, widthMm, nextPoint);
}

/** Append an orthogonal bend + wall centerline instead of dragging a corner onto the wall. */
export function appendHallwayEndWall(
  room: PlacedRoom | null,
  hallways: Hallway[],
  link: WallLink,
  widthMm: number,
  points: HallwayWaypoint[],
  links: Array<WallLink | null>,
  linkAtIndex: number,
): { points: HallwayWaypoint[]; links: Array<WallLink | null> } {
  if (isHallwayWallLink(link)) {
    const hallway = hallwayForLink(hallways, link);
    if (!hallway) return { points, links };
    const approach = points[linkAtIndex];
    const wallPt =
      axisAlignedHallwayCenterline(hallway, link, widthMm, approach) ??
      centerlinePointFromHallwayLink(hallway, link, widthMm, undefined, approach) ??
      approach;
    return appendEndWallPoints(
      room,
      hallways,
      widthMm,
      points,
      links,
      linkAtIndex,
      approach,
      wallPt,
      link,
    );
  }

  if (!room || !isRoomWallLink(link)) return { points, links };

  const approach = points[linkAtIndex];
  const wallPt = centerlinePointFromWallHit(
    room,
    link,
    widthMm,
    undefined,
    approach,
  );
  return appendEndWallPoints(
    room,
    hallways,
    widthMm,
    points,
    links,
    linkAtIndex,
    approach,
    wallPt,
    link,
  );
}

function appendEndWallPoints(
  room: PlacedRoom | null,
  hallways: Hallway[],
  widthMm: number,
  points: HallwayWaypoint[],
  links: Array<WallLink | null>,
  linkAtIndex: number,
  approach: HallwayWaypoint,
  wallPt: HallwayWaypoint,
  link: WallLink,
): { points: HallwayWaypoint[]; links: Array<WallLink | null> } {
  const syncedLink = syncLinkToCenterline(room, hallways, link, wallPt, widthMm);

  if (
    hallwaySegmentAxis(approach, wallPt) &&
    Math.hypot(approach.xMm - wallPt.xMm, approach.zMm - wallPt.zMm) < 60
  ) {
    const nextPoints = [...points];
    const nextLinks = [...links];
    while (nextLinks.length < nextPoints.length) nextLinks.push(null);
    nextPoints[linkAtIndex] = wallPt;
    nextLinks[linkAtIndex] = syncedLink;
    return { points: nextPoints, links: nextLinks };
  }

  let nextPoints = [...points];
  let nextLinks = [...links];
  while (nextLinks.length < nextPoints.length) nextLinks.push(null);
  nextLinks[linkAtIndex] = null;

  if (hallwaySegmentAxis(approach, wallPt)) {
    nextPoints = [...nextPoints, wallPt];
    nextLinks = [...nextLinks, syncedLink];
    return { points: nextPoints, links: nextLinks };
  }

  const bend =
    room && isRoomWallLink(link) && linkApproachAxis(room, link.wallIndex) === "z"
      ? { xMm: approach.xMm, zMm: wallPt.zMm }
      : isRoomWallLink(link)
        ? { xMm: wallPt.xMm, zMm: approach.zMm }
        : getHallwayWallLayout(
              hallwayForLink(hallways, link as HallwayWallLink)!,
              (link as HallwayWallLink).segIndex,
              (link as HallwayWallLink).side,
            )?.axis === "horizontal"
          ? { xMm: approach.xMm, zMm: wallPt.zMm }
          : { xMm: wallPt.xMm, zMm: approach.zMm };

  if (
    Math.hypot(bend.xMm - approach.xMm, bend.zMm - approach.zMm) >=
    MIN_HALLWAY_POINT_DISTANCE_MM
  ) {
    nextPoints = [...nextPoints, bend];
    nextLinks = [...nextLinks, null];
  }

  nextPoints = [...nextPoints, wallPt];
  nextLinks = [...nextLinks, syncedLink];
  return { points: nextPoints, links: nextLinks };
}

/** @deprecated use centerlinePointFromWallHit */
export function centerlinePointFromLink(
  room: PlacedRoom,
  link: WallLink,
  widthMm: number,
  approachFrom?: HallwayWaypoint,
): HallwayWaypoint {
  if (!isRoomWallLink(link)) {
    return { xMm: 0, zMm: 0 };
  }
  return centerlinePointFromWallHit(room, link, widthMm, undefined, approachFrom);
}

export function clampWallOffset(
  room: PlacedRoom,
  wallIndex: number,
  offsetMm: number,
  widthMm: number,
): number {
  const edge = wallEdges(room).find((item) => item.wallIndex === wallIndex);
  if (!edge) return offsetMm;
  const half = widthMm / 2 + 50;
  return Math.max(half, Math.min(edge.lengthMm - half, offsetMm));
}

export function openingSpanForLink(
  room: PlacedRoom,
  link: RoomWallLink,
  widthMm: number,
): { startMm: number; endMm: number } {
  const edge = wallEdges(room).find((item) => item.wallIndex === link.wallIndex);
  if (!edge) return { startMm: 0, endMm: widthMm };
  const half = widthMm / 2;
  return {
    startMm: Math.max(0, link.offsetMm - half),
    endMm: Math.min(edge.lengthMm, link.offsetMm + half),
  };
}

export function openingCoversSpan(
  opening: { startMm: number; endMm: number },
  startMm: number,
  endMm: number,
): boolean {
  const lo = Math.min(startMm, endMm);
  const hi = Math.max(startMm, endMm);
  const oLo = Math.min(opening.startMm, opening.endMm);
  const oHi = Math.max(opening.startMm, opening.endMm);
  return oLo <= lo + 80 && oHi >= hi - 80;
}

export function linkNeedsOpening(
  room: PlacedRoom,
  link: RoomWallLink,
  widthMm: number,
): { startMm: number; endMm: number } | null {
  const span = openingSpanForLink(room, link, widthMm);
  const covered = openingsForWall(room, link.wallIndex).some((opening) =>
    openingCoversSpan(opening, span.startMm, span.endMm),
  );
  return covered ? null : span;
}

export function hallwayLinkNeedsOpening(
  hallway: Hallway,
  link: HallwayWallLink,
  widthMm: number,
): { startMm: number; endMm: number } | null {
  const span = openingSpanForHallwayLink(hallway, link, widthMm);
  if (!span) return null;
  const covered = openingsForHallwayWall(
    hallway,
    link.segIndex,
    link.side,
  ).some((opening) => openingCoversSpan(opening, span.startMm, span.endMm));
  return covered ? null : span;
}

export type RoomHallwayConnectionOpening = {
  kind: "room";
  placementId: string;
  wallIndex: number;
  startMm: number;
  endMm: number;
};

export type HallwayBranchConnectionOpening = {
  kind: "hallway";
  hallwayId: string;
  segIndex: number;
  side: 0 | 1;
  startMm: number;
  endMm: number;
};

export type HallwayConnectionOpening =
  | RoomHallwayConnectionOpening
  | HallwayBranchConnectionOpening;

export function projectHitToLink(
  room: PlacedRoom,
  hit: {
    wallIndex: number;
    offsetMm: number;
    pointerXMm?: number;
    pointerZMm?: number;
    faceNormalX?: number;
    faceNormalZ?: number;
  },
  widthMm: number,
): { point: HallwayWaypoint; link: WallLink } {
  const clamped = clampWallOffset(room, hit.wallIndex, hit.offsetMm, widthMm);
  const link = roomWallLink(room.placementId, hit.wallIndex, clamped);
  return {
    point: centerlinePointFromWallHit(room, link, widthMm, hit),
    link,
  };
}

function segmentAxis(
  from: HallwayWaypoint,
  to: HallwayWaypoint,
): "x" | "z" | null {
  const dx = Math.abs(to.xMm - from.xMm);
  const dz = Math.abs(to.zMm - from.zMm);
  if (dx < 40 && dz < 40) return null;
  return dx >= dz ? "x" : "z";
}

function roomForLink(rooms: PlacedRoom[], link: WallLink) {
  if (!isRoomWallLink(link)) return undefined;
  return rooms.find((room) => room.placementId === link.placementId);
}

function orthogonalFromWallStart(
  start: HallwayWaypoint,
  link: RoomWallLink,
  room: PlacedRoom,
  cursorX: number,
  cursorZ: number,
): HallwayWaypoint {
  const onWall = pointFromLink(room, link);
  const axis = linkApproachAxis(room, link.wallIndex);
  if (axis === "z") {
    const exitSign = Math.sign(start.zMm - onWall.zMm) || linkOutwardSign(room, link.wallIndex);
    const delta = cursorZ - start.zMm;
    const outward =
      Math.abs(delta) < MIN_SEGMENT_MM
        ? exitSign * MIN_SEGMENT_MM
        : Math.sign(delta) === exitSign
          ? delta
          : exitSign * Math.max(MIN_SEGMENT_MM, Math.abs(delta));
    return { xMm: start.xMm, zMm: Math.round(start.zMm + outward) };
  }
  const exitSign = Math.sign(start.xMm - onWall.xMm) || linkOutwardSign(room, link.wallIndex);
  const delta = cursorX - start.xMm;
  const outward =
    Math.abs(delta) < MIN_SEGMENT_MM
      ? exitSign * MIN_SEGMENT_MM
      : Math.sign(delta) === exitSign
        ? delta
        : exitSign * Math.max(MIN_SEGMENT_MM, Math.abs(delta));
  return { xMm: Math.round(start.xMm + outward), zMm: start.zMm };
}

function collinearExtensionPoint(
  prev: HallwayWaypoint,
  last: HallwayWaypoint,
  cursorX: number,
  cursorZ: number,
): HallwayWaypoint | null {
  const axis = segmentAxis(prev, last);
  if (!axis) return null;

  const dir =
    axis === "x"
      ? ((Math.sign(last.xMm - prev.xMm) || 1) as 1 | -1)
      : ((Math.sign(last.zMm - prev.zMm) || 1) as 1 | -1);

  if (axis === "x") {
    const dx = Math.abs(cursorX - last.xMm);
    const dz = Math.abs(cursorZ - last.zMm);
    if (dz > Math.max(150, dx * 0.35)) return null;
    let xMm = Math.round(cursorX);
    const minX = prev.xMm + dir * MIN_HALLWAY_POINT_DISTANCE_MM;
    if (dir > 0 && xMm < minX) xMm = minX;
    if (dir < 0 && xMm > minX) xMm = minX;
    return { xMm, zMm: last.zMm };
  }

  const dx = Math.abs(cursorX - last.xMm);
  const dz = Math.abs(cursorZ - last.zMm);
  if (dx > Math.max(150, dz * 0.35)) return null;
  let zMm = Math.round(cursorZ);
  const minZ = prev.zMm + dir * MIN_HALLWAY_POINT_DISTANCE_MM;
  if (dir > 0 && zMm < minZ) zMm = minZ;
  if (dir < 0 && zMm > minZ) zMm = minZ;
  return { xMm: last.xMm, zMm };
}

function isCollinearExtensionPreview(
  draft: HallwayDrawDraft,
): boolean {
  if (!draft.preview || draft.points.length < 2) return false;
  const prev = draft.points[draft.points.length - 2];
  const last = draft.points[draft.points.length - 1];
  return (
    collinearExtensionPoint(
      prev,
      last,
      draft.preview.xMm,
      draft.preview.zMm,
    ) !== null
  );
}

/** Move the last waypoint straight along the current leg (same direction). */
export function extendHallwayEndPoint(
  points: HallwayWaypoint[],
  cursorX: number,
  cursorZ: number,
): HallwayWaypoint | null {
  if (points.length < 2) return null;
  const prev = points[points.length - 2];
  const last = points[points.length - 1];
  return collinearExtensionPoint(prev, last, cursorX, cursorZ);
}

function orthogonalTurn(
  prev: HallwayWaypoint,
  last: HallwayWaypoint,
  cursorX: number,
  cursorZ: number,
): HallwayWaypoint {
  const axis = segmentAxis(prev, last);
  if (!axis) {
    return { xMm: Math.round(cursorX), zMm: Math.round(cursorZ) };
  }
  if (axis === "x") {
    const dz = cursorZ - last.zMm;
    const zMm =
      last.zMm +
      (Math.abs(dz) < MIN_SEGMENT_MM ? MIN_SEGMENT_MM * Math.sign(dz || 1) : dz);
    return { xMm: last.xMm, zMm: Math.round(zMm) };
  }
  const dx = cursorX - last.xMm;
  const xMm =
    last.xMm +
    (Math.abs(dx) < MIN_SEGMENT_MM ? MIN_SEGMENT_MM * Math.sign(dx || 1) : dx);
  return { xMm: Math.round(xMm), zMm: last.zMm };
}

function orthogonalApproachWall(
  last: HallwayWaypoint,
  room: PlacedRoom,
  wallIndex: number,
): HallwayWaypoint {
  const edge = wallEdges(room).find((item) => item.wallIndex === wallIndex);
  if (!edge) return last;
  if (linkApproachAxis(room, wallIndex) === "z") {
    return { xMm: last.xMm, zMm: edge.z1 };
  }
  return { xMm: edge.x1, zMm: last.zMm };
}

/** Opening center follows hallway centerline where it meets the wall. */
export function linkAtWallApproach(
  room: PlacedRoom,
  wallIndex: number,
  last: HallwayWaypoint,
  widthMm: number,
  wallHit?: WallHitAttachInfo & { offsetMm?: number },
): { point: HallwayWaypoint; link: WallLink } {
  const approach = orthogonalApproachWall(last, room, wallIndex);
  const projected = projectPointToWall(room, wallIndex, approach.xMm, approach.zMm);
  const offsetMm = clampWallOffset(
    room,
    wallIndex,
    wallHit?.offsetMm ?? projected?.offsetMm ?? widthMm / 2,
    widthMm,
  );
  const link = roomWallLink(room.placementId, wallIndex, offsetMm);
  return {
    point: centerlinePointFromWallHit(room, link, widthMm, wallHit, last),
    link,
  };
}

export interface SnapHallwayPointOptions {
  snapPoints?: SnapPoint[];
  stickyEntranceLine?: HallwayEntranceLineSnap | null;
  excludeLinkKeys?: Set<string>;
  excludeHallwayIds?: Set<string>;
  /** Default ortho — 90° L-turns. 45° / free draw straight segments from the last point. */
  angleSnapMode?: RoomAngleSnapMode;
}

export function snapHallwayPoint(
  rooms: PlacedRoom[],
  hallways: Hallway[],
  draft: HallwayDrawDraft,
  xMm: number,
  zMm: number,
  options?: SnapHallwayPointOptions,
): {
  point: HallwayWaypoint;
  link: WallLink | null;
  stickyEntranceLine?: HallwayEntranceLineSnap | null;
} {
  const last = draft.points[draft.points.length - 1];
  const prev = draft.points.length >= 2 ? draft.points[draft.points.length - 2] : null;
  const startLink = draft.links[0];

  if (draft.points.length >= 1 && last) {
    const entranceTargets = options?.snapPoints
      ? collectHallwayEntranceTargets(
          rooms,
          hallways,
          options.snapPoints,
          options.excludeLinkKeys,
        )
      : [];
    const continuationTargets = collectHallwayContinuationTargets(
      hallways,
      options?.excludeHallwayIds,
    );
    if (entranceTargets.length > 0 || continuationTargets.length > 0) {
      const lineSnap = resolveHallwayDrawLineSnap({
        rooms,
        hallways,
        entranceTargets,
        continuationTargets,
        pointerXMm: xMm,
        pointerZMm: zMm,
        approachFrom: last,
        stickyLine: options?.stickyEntranceLine ?? null,
      });
      if (lineSnap) {
        if (
          shouldSnapPointToEntranceCenter(
            lineSnap.stickyLine.anchor,
            lineSnap.point,
          )
        ) {
          if (lineSnap.stickyLine.kind === "continuation") {
            return {
              point: {
                xMm: Math.round(lineSnap.stickyLine.anchor.xMm),
                zMm: Math.round(lineSnap.stickyLine.anchor.zMm),
              },
              link: null,
              stickyEntranceLine: null,
            };
          }
          if (lineSnap.entranceTarget) {
            const placement = targetToPlacement(lineSnap.entranceTarget);
            const committed = commitWallPlacementPoint(
              isRoomWallLink(placement.link)
                ? (rooms.find(
                    (room) =>
                      isRoomWallLink(placement.link) &&
                      room.placementId === placement.link.placementId,
                  ) ?? null)
                : null,
              hallways,
              placement,
              last,
            );
            return {
              ...committed,
              stickyEntranceLine: null,
            };
          }
        }
        return {
          point: lineSnap.point,
          link: null,
          stickyEntranceLine: lineSnap.stickyLine,
        };
      }
    }
  }

  const endpointHit = findEndpointWallHit(
    rooms,
    hallways,
    xMm,
    zMm,
    hallwayWallSnapRadiusMm(draft.widthMm),
  );
  if (
    endpointHit &&
    draft.points.length >= 1 &&
    draft.phase !== "placing-end"
  ) {
    if (options?.snapPoints) {
      const targets = collectHallwayEntranceTargets(
        rooms,
        hallways,
        options.snapPoints,
        options.excludeLinkKeys,
      );
      const snapped = snapEndpointToEntrance(
        rooms,
        hallways,
        endpointHit,
        targets,
        draft.widthMm,
        last,
      );
      if (snapped) {
        return { ...snapped, stickyEntranceLine: null };
      }
    }

    if (endpointHit.kind === "room") {
      return linkAtWallApproach(
        endpointHit.hit.room,
        endpointHit.hit.wallIndex,
        last,
        draft.widthMm,
      );
    }
    const { link, widthMm, faceNormalX, faceNormalZ } =
      createWallPlacementFromHallwayHit(
        endpointHit.hit.hallway,
        endpointHit.hit,
        draft.widthMm,
        last,
      );
    const point =
      centerlinePointFromHallwayLink(
        endpointHit.hit.hallway,
        link,
        widthMm,
        { faceNormalX, faceNormalZ },
        last,
      ) ?? last;
    return { point, link };
  }

  if (draft.points.length === 1 && startLink) {
    const angleSnapMode = options?.angleSnapMode ?? "ortho";
    if (isRoomWallLink(startLink)) {
      const room = roomForLink(rooms, startLink);
      if (room) {
        if (angleSnapMode === "45" || angleSnapMode === "free") {
          const aimed = snapToAngleMode(
            last,
            xMm,
            zMm,
            angleSnapMode === "45" ? "45" : "free",
          );
          return { point: { xMm: aimed.xMm, zMm: aimed.zMm }, link: null };
        }
        return {
          point: orthogonalFromWallStart(
            last,
            startLink,
            room,
            xMm,
            zMm,
          ),
          link: null,
        };
      }
    } else {
      const hallway = hallwayForLink(hallways, startLink);
      if (hallway) {
        const onWall = pointFromHallwayLink(hallway, startLink);
        if (onWall) {
          const layout = getHallwayWallLayout(
            hallway,
            startLink.segIndex,
            startLink.side,
          );
          if (layout?.axis === "horizontal") {
            return {
              point: {
                xMm: last.xMm,
                zMm: Math.round(
                  last.zMm +
                    (Math.abs(zMm - last.zMm) < MIN_SEGMENT_MM
                      ? layout.normalZ * MIN_SEGMENT_MM
                      : zMm - last.zMm),
                ),
              },
              link: null,
            };
          }
          return {
            point: {
              xMm: Math.round(
                last.xMm +
                  (Math.abs(xMm - last.xMm) < MIN_SEGMENT_MM
                    ? layout!.normalX * MIN_SEGMENT_MM
                    : xMm - last.xMm),
              ),
              zMm: last.zMm,
            },
            link: null,
          };
        }
      }
    }
  }

  if (draft.points.length >= 2 && prev) {
    const angleSnapMode = options?.angleSnapMode ?? "ortho";
    const collinear = collinearExtensionPoint(prev, last, xMm, zMm);
    if (collinear) {
      return { point: collinear, link: null };
    }
    if (angleSnapMode === "ortho" || angleSnapMode === "off") {
      return { point: orthogonalTurn(prev, last, xMm, zMm), link: null };
    }
    const aimed = snapToAngleMode(
      last,
      xMm,
      zMm,
      angleSnapMode === "45" ? "45" : "free",
    );
    return { point: { xMm: aimed.xMm, zMm: aimed.zMm }, link: null };
  }

  return { point: { xMm: Math.round(xMm), zMm: Math.round(zMm) }, link: null };
}

function snapPointToAxisFrom(
  anchor: HallwayWaypoint,
  point: HallwayWaypoint,
): HallwayWaypoint {
  const dx = Math.abs(point.xMm - anchor.xMm);
  const dz = Math.abs(point.zMm - anchor.zMm);
  if (dx >= dz) {
    return { xMm: Math.round(point.xMm), zMm: Math.round(anchor.zMm) };
  }
  return { xMm: Math.round(anchor.xMm), zMm: Math.round(point.zMm) };
}

const MIN_HALLWAY_POINT_DISTANCE_MM = 120;

function alignPreEndToFixedEnd(points: HallwayWaypoint[]): void {
  const last = points.length - 1;
  if (last < 1) return;
  const end = points[last];
  const prev = points[last - 1];
  const dx = Math.abs(end.xMm - prev.xMm);
  const dz = Math.abs(end.zMm - prev.zMm);
  if (dx >= dz) {
    points[last - 1] = { xMm: prev.xMm, zMm: end.zMm };
  } else {
    points[last - 1] = { xMm: end.xMm, zMm: prev.zMm };
  }
}

function pathHasNonAxisAlignedSegment(points: HallwayWaypoint[]): boolean {
  for (let i = 1; i < points.length; i++) {
    if (!hallwaySegmentAxis(points[i - 1], points[i])) return true;
  }
  return false;
}

/** Force a strict orthogonal centerline and drop redundant points. */
export function normalizeHallwayPath(
  points: HallwayWaypoint[],
  links: Array<WallLink | null> = [],
): { points: HallwayWaypoint[]; links: Array<WallLink | null> } {
  if (points.length < 2) {
    return { points: [...points], links: [...links] };
  }

  let pts = points.map((point) => ({ ...point }));
  let lks = [...links];
  while (lks.length < pts.length) lks.push(null);

  if (pathHasNonAxisAlignedSegment(pts)) {
    return simplifyCollinearWaypoints(pts, lks);
  }

  const alignChain = () => {
    const last = pts.length - 1;
    for (let i = 1; i < last; i++) {
      pts[i] = snapPointToAxisFrom(pts[i - 1], pts[i]);
    }
    alignPreEndToFixedEnd(pts);
    for (let i = 1; i < last - 1; i++) {
      pts[i] = snapPointToAxisFrom(pts[i - 1], pts[i]);
    }
    alignPreEndToFixedEnd(pts);
  };

  alignChain();

  let changed = true;
  while (changed && pts.length > 2) {
    changed = false;
    for (let i = 1; i < pts.length; i++) {
      const dist = Math.hypot(
        pts[i].xMm - pts[i - 1].xMm,
        pts[i].zMm - pts[i - 1].zMm,
      );
      if (dist >= MIN_HALLWAY_POINT_DISTANCE_MM) continue;
      if (i === pts.length - 1 && lks[i]) continue;
      if (i === 0) continue;
      pts.splice(i, 1);
      lks.splice(i, 1);
      changed = true;
      alignChain();
      break;
    }
  }

  return simplifyCollinearWaypoints(pts, lks);
}

export function hallwaySegmentAxis(
  a: HallwayWaypoint,
  b: HallwayWaypoint,
): "horizontal" | "vertical" | null {
  if (Math.abs(a.zMm - b.zMm) <= 20) return "horizontal";
  if (Math.abs(a.xMm - b.xMm) <= 20) return "vertical";
  return null;
}

export function syncLinkToCenterline(
  room: PlacedRoom | null,
  hallways: Hallway[],
  link: WallLink,
  centerline: HallwayWaypoint,
  widthMm: number,
): WallLink {
  if (isHallwayWallLink(link)) {
    const hallway = hallwayForLink(hallways, link);
    const layout = hallway
      ? getHallwayWallLayout(hallway, link.segIndex, link.side)
      : null;
    if (!layout) return link;
    const offsetMm =
      layout.axis === "horizontal"
        ? centerline.xMm - layout.loMm
        : centerline.zMm - layout.loMm;
    return {
      ...link,
      offsetMm: clampHallwayWallOffset(layout, offsetMm, widthMm),
    };
  }

  if (!room || !isRoomWallLink(link)) return link;

  const projected = projectPointToWall(
    room,
    link.wallIndex,
    centerline.xMm,
    centerline.zMm,
  );
  if (!projected) return link;
  return {
    ...link,
    offsetMm: clampWallOffset(
      room,
      link.wallIndex,
      projected.offsetMm,
      widthMm,
    ),
  };
}

export function hallwayEndpointLinkEntries(
  links: Array<WallLink | null>,
): Array<{ pointIndex: number; link: WallLink }> {
  const entries: Array<{ pointIndex: number; link: WallLink }> = [];
  if (links[0]) entries.push({ pointIndex: 0, link: links[0] });
  for (let i = links.length - 1; i > 0; i--) {
    if (links[i]) {
      entries.push({ pointIndex: i, link: links[i]! });
      break;
    }
  }
  return entries;
}

export function collectHallwayConnectionOpenings(
  rooms: PlacedRoom[],
  hallways: Hallway[],
  points: HallwayWaypoint[],
  links: Array<WallLink | null>,
  widthMm: number,
): HallwayConnectionOpening[] {
  if (points.length < 2) return [];

  const openings: HallwayConnectionOpening[] = [];
  const seen = new Set<string>();

  for (const { pointIndex, link: rawLink } of hallwayEndpointLinkEntries(links)) {
    if (isRoomWallLink(rawLink)) {
      const room = roomForLink(rooms, rawLink);
      if (!room) continue;

      const link = syncLinkToCenterline(
        room,
        hallways,
        rawLink,
        points[pointIndex],
        widthMm,
      ) as RoomWallLink;
      const key = `room:${link.placementId}:${link.wallIndex}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const span = openingSpanForLink(room, link, widthMm);
      if (span.endMm - span.startMm < 100) continue;
      if (!linkNeedsOpening(room, link, widthMm)) continue;

      openings.push({
        kind: "room",
        placementId: link.placementId,
        wallIndex: link.wallIndex,
        startMm: span.startMm,
        endMm: span.endMm,
      });
      continue;
    }

    if (!isHallwayWallLink(rawLink)) continue;
    const hallway = hallwayForLink(hallways, rawLink);
    if (!hallway) continue;

    const link = syncLinkToCenterline(
      null,
      hallways,
      rawLink,
      points[pointIndex],
      widthMm,
    ) as HallwayWallLink;
    const key = `hallway:${link.hallwayId}:${link.segIndex}:${link.side}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const span = openingSpanForHallwayLink(hallway, link, widthMm);
    if (!span || span.endMm - span.startMm < 100) continue;
    if (!hallwayLinkNeedsOpening(hallway, link, widthMm)) continue;

    openings.push({
      kind: "hallway",
      hallwayId: link.hallwayId,
      segIndex: link.segIndex,
      side: link.side,
      startMm: span.startMm,
      endMm: span.endMm,
    });
  }

  return openings;
}

function isCollinearJunction(
  prev: HallwayWaypoint,
  curr: HallwayWaypoint,
  next: HallwayWaypoint,
): boolean {
  const axisIn = hallwaySegmentAxis(prev, curr);
  const axisOut = hallwaySegmentAxis(curr, next);
  return axisIn !== null && axisIn === axisOut;
}

export function simplifyHallwayWaypoints(
  points: HallwayWaypoint[],
  links: Array<WallLink | null> = [],
): { points: HallwayWaypoint[]; links: Array<WallLink | null> } {
  if (points.length < 3) return { points: [...points], links: [...links] };

  let nextPoints = [...points];
  let nextLinks = [...links];
  while (nextLinks.length < nextPoints.length) nextLinks.push(null);

  let changed = true;
  while (changed && nextPoints.length >= 3) {
    changed = false;
    for (let i = 1; i < nextPoints.length - 1; i++) {
      const prev = nextPoints[i - 1]!;
      const curr = nextPoints[i]!;
      const next = nextPoints[i + 1]!;
      if (!isCollinearJunction(prev, curr, next)) continue;
      nextPoints = [...nextPoints.slice(0, i), ...nextPoints.slice(i + 1)];
      nextLinks = [...nextLinks.slice(0, i), ...nextLinks.slice(i + 1)];
      changed = true;
      break;
    }
  }

  return { points: nextPoints, links: nextLinks };
}

function simplifyCollinearWaypoints(
  points: HallwayWaypoint[],
  links: Array<WallLink | null>,
): { points: HallwayWaypoint[]; links: Array<WallLink | null> } {
  return simplifyHallwayWaypoints(points, links);
}

export function finalizeHallwayPath(
  rooms: PlacedRoom[],
  hallways: Hallway[],
  points: HallwayWaypoint[],
  links: Array<WallLink | null>,
  widthMm: number,
): { points: HallwayWaypoint[]; links: Array<WallLink | null> } {
  if (points.length < 2) return { points, links };

  let nextPoints = [...points];
  const nextLinks = [...links];

  if (nextLinks[0]) {
    if (isRoomWallLink(nextLinks[0])) {
      const room = roomForLink(rooms, nextLinks[0]);
      if (room) {
        nextPoints[0] = anchorStartToWall(
          room,
          nextLinks[0],
          widthMm,
          nextPoints[1],
        );
      }
    } else {
      const hallway = hallwayForLink(hallways, nextLinks[0]);
      if (hallway) {
        nextPoints[0] =
          axisAlignedHallwayCenterline(
            hallway,
            nextLinks[0],
            widthMm,
            nextPoints[1],
          ) ?? nextPoints[0];
      }
    }
  }

  let resolvedLinks = resolveHallwayEndpointLinks(
    rooms,
    hallways,
    nextPoints,
    nextLinks,
    widthMm,
  );

  if (resolvedLinks[0]) {
    if (isRoomWallLink(resolvedLinks[0])) {
      const room = roomForLink(rooms, resolvedLinks[0]);
      if (room) {
        nextPoints[0] = anchorStartToWall(
          room,
          resolvedLinks[0],
          widthMm,
          nextPoints[1],
        );
      }
    } else {
      const hallway = hallwayForLink(hallways, resolvedLinks[0]);
      if (hallway) {
        nextPoints[0] =
          axisAlignedHallwayCenterline(
            hallway,
            resolvedLinks[0],
            widthMm,
            nextPoints[1],
          ) ?? nextPoints[0];
      }
    }
  }

  const endLinkIndex = nextPoints.length - 1;
  while (resolvedLinks.length < nextPoints.length) resolvedLinks.push(null);
  if (resolvedLinks[endLinkIndex]) {
    const expanded = appendHallwayEndWall(
      roomForLink(rooms, resolvedLinks[endLinkIndex]!) ?? null,
      hallways,
      resolvedLinks[endLinkIndex]!,
      widthMm,
      nextPoints,
      resolvedLinks,
      endLinkIndex,
    );
    nextPoints = expanded.points;
    resolvedLinks = expanded.links;
  }

  const normalized = normalizeHallwayPath(nextPoints, resolvedLinks);
  nextPoints = normalized.points;
  let finalLinks = normalized.links;

  if (finalLinks[0]) {
    finalLinks[0] = syncLinkToCenterline(
      roomForLink(rooms, finalLinks[0]) ?? null,
      hallways,
      finalLinks[0],
      nextPoints[0],
      widthMm,
    );
  }
  const finalLastIdx = nextPoints.length - 1;
  if (finalLinks[finalLastIdx]) {
    finalLinks[finalLastIdx] = syncLinkToCenterline(
      roomForLink(rooms, finalLinks[finalLastIdx]!) ?? null,
      hallways,
      finalLinks[finalLastIdx]!,
      nextPoints[finalLastIdx],
      widthMm,
    );
  }

  logHallway("finalize path", {
    pointCount: nextPoints.length,
    links: finalLinks.map((link) => (link ? wallLinkKey(link) : null)),
    points: nextPoints,
  });

  return { points: nextPoints, links: finalLinks };
}

function endpointCenterlineAligned(
  rooms: PlacedRoom[],
  hallways: Hallway[],
  link: WallLink,
  widthMm: number,
  adjacent: HallwayWaypoint,
): HallwayWaypoint {
  if (isRoomWallLink(link)) {
    const room = roomForLink(rooms, link);
    if (!room) return adjacent;
    return axisAlignedWallCenterline(room, link, widthMm, adjacent);
  }
  const hallway = hallwayForLink(hallways, link);
  if (!hallway) return adjacent;
  return (
    axisAlignedHallwayCenterline(hallway, link, widthMm, adjacent) ?? adjacent
  );
}

function endpointCenterlineFromLink(
  rooms: PlacedRoom[],
  hallways: Hallway[],
  link: WallLink,
  widthMm: number,
  approachFrom?: HallwayWaypoint,
): HallwayWaypoint {
  if (isRoomWallLink(link)) {
    const room = roomForLink(rooms, link);
    if (!room) return { xMm: 0, zMm: 0 };
    return centerlinePointFromWallHit(room, link, widthMm, undefined, approachFrom);
  }
  const hallway = hallwayForLink(hallways, link);
  if (!hallway) return { xMm: 0, zMm: 0 };
  return (
    centerlinePointFromHallwayLink(
      hallway,
      link,
      widthMm,
      undefined,
      approachFrom,
    ) ?? { xMm: 0, zMm: 0 }
  );
}

/** Orthogonal centerline path between two fixed wall links (entrance → exit). */
export function routeHallwayBetweenLinks(
  rooms: PlacedRoom[],
  hallways: Hallway[],
  startLink: WallLink,
  endLink: WallLink,
  widthMm: number,
): { points: HallwayWaypoint[]; links: Array<WallLink | null> } {
  const startRough = endpointCenterlineFromLink(
    rooms,
    hallways,
    startLink,
    widthMm,
  );
  const endRough = endpointCenterlineFromLink(
    rooms,
    hallways,
    endLink,
    widthMm,
    startRough,
  );

  const bend: HallwayWaypoint =
    Math.abs(endRough.xMm - startRough.xMm) >=
    Math.abs(endRough.zMm - startRough.zMm)
      ? { xMm: endRough.xMm, zMm: startRough.zMm }
      : { xMm: startRough.xMm, zMm: endRough.zMm };

  let startPt = endpointCenterlineAligned(
    rooms,
    hallways,
    startLink,
    widthMm,
    bend,
  );
  let endPt = endpointCenterlineAligned(
    rooms,
    hallways,
    endLink,
    widthMm,
    startPt,
  );

  const bend2: HallwayWaypoint =
    Math.abs(endPt.xMm - startPt.xMm) >= Math.abs(endPt.zMm - startPt.zMm)
      ? { xMm: endPt.xMm, zMm: startPt.zMm }
      : { xMm: startPt.xMm, zMm: endPt.zMm };

  startPt = endpointCenterlineAligned(
    rooms,
    hallways,
    startLink,
    widthMm,
    bend2,
  );
  endPt = endpointCenterlineAligned(
    rooms,
    hallways,
    endLink,
    widthMm,
    bend2,
  );

  const leg1 = Math.hypot(bend2.xMm - startPt.xMm, bend2.zMm - startPt.zMm);
  const leg2 = Math.hypot(endPt.xMm - bend2.xMm, endPt.zMm - bend2.zMm);
  const direct = Math.hypot(endPt.xMm - startPt.xMm, endPt.zMm - startPt.zMm);

  let points: HallwayWaypoint[];
  let links: Array<WallLink | null>;

  if (
    leg1 >= MIN_HALLWAY_POINT_DISTANCE_MM &&
    leg2 >= MIN_HALLWAY_POINT_DISTANCE_MM
  ) {
    points = [startPt, bend2, endPt];
    links = [startLink, null, endLink];
  } else if (direct >= MIN_HALLWAY_POINT_DISTANCE_MM) {
    points = [startPt, endPt];
    links = [startLink, endLink];
  } else {
    points = [startPt, endPt];
    links = [startLink, endLink];
  }

  return finalizeHallwayPath(rooms, hallways, points, links, widthMm);
}

export interface ExitAlignmentSnap {
  /** Bend or stop point offered to the user. */
  point: HallwayWaypoint;
  label: string;
  pathPoints: HallwayWaypoint[];
  pathLinks: Array<WallLink | null>;
  /** Dashed guide: entrance → bend(s) → exit centerline. */
  guidePath: HallwayWaypoint[];
}

export const EXIT_ALIGN_SNAP_RADIUS_MM = 520;

function segmentAlongAxis(
  from: HallwayWaypoint,
  to: HallwayWaypoint,
  axis: "x" | "z",
  minLen = MIN_SEGMENT_MM,
): boolean {
  const perp = axis === "x" ? "z" : "x";
  const along =
    axis === "x"
      ? Math.abs(to.xMm - from.xMm)
      : Math.abs(to.zMm - from.zMm);
  const perpDelta =
    perp === "x"
      ? Math.abs(to.xMm - from.xMm)
      : Math.abs(to.zMm - from.zMm);
  return along >= minLen && perpDelta < 40;
}

function outwardAxisForWallLink(
  link: WallLink,
  room: PlacedRoom | undefined,
): "x" | "z" | null {
  if (!isRoomWallLink(link) || !room) return null;
  return linkApproachAxis(room, link.wallIndex) === "x" ? "z" : "x";
}

function approachAxisForWallLink(
  link: WallLink,
  room: PlacedRoom | undefined,
): "x" | "z" | null {
  if (!isRoomWallLink(link) || !room) return null;
  return linkApproachAxis(room, link.wallIndex) === "x" ? "z" : "x";
}

function buildExitRouteCandidate(
  rooms: PlacedRoom[],
  hallways: Hallway[],
  startLink: WallLink,
  endLink: WallLink,
  widthMm: number,
  bend: HallwayWaypoint | null,
): {
  startPt: HallwayWaypoint;
  endPt: HallwayWaypoint;
  points: HallwayWaypoint[];
  links: Array<WallLink | null>;
} | null {
  const bendRef = bend ?? endpointCenterlineFromLink(
    rooms,
    hallways,
    endLink,
    widthMm,
    endpointCenterlineFromLink(rooms, hallways, startLink, widthMm),
  );

  let startPt = endpointCenterlineAligned(
    rooms,
    hallways,
    startLink,
    widthMm,
    bendRef,
  );
  let endPt = endpointCenterlineAligned(
    rooms,
    hallways,
    endLink,
    widthMm,
    bend ? bend : startPt,
  );

  if (!bend) {
    const direct = Math.hypot(endPt.xMm - startPt.xMm, endPt.zMm - startPt.zMm);
    if (direct < MIN_SEGMENT_MM) return null;
    const startRoom = roomForLink(rooms, startLink);
    const endRoom = roomForLink(rooms, endLink);
    const outward = outwardAxisForWallLink(startLink, startRoom);
    const approach = approachAxisForWallLink(endLink, endRoom);
    if (
      outward &&
      approach &&
      !segmentAlongAxis(startPt, endPt, outward) &&
      !segmentAlongAxis(startPt, endPt, approach)
    ) {
      return null;
    }
    const finalized = finalizeHallwayPath(
      rooms,
      hallways,
      [startPt, endPt],
      [startLink, endLink],
      widthMm,
    );
    return {
      startPt: finalized.points[0]!,
      endPt: finalized.points[finalized.points.length - 1]!,
      points: finalized.points,
      links: finalized.links,
    };
  }

  startPt = endpointCenterlineAligned(rooms, hallways, startLink, widthMm, bend);
  endPt = endpointCenterlineAligned(rooms, hallways, endLink, widthMm, bend);

  const startRoom = roomForLink(rooms, startLink);
  const endRoom = roomForLink(rooms, endLink);
  const outward = outwardAxisForWallLink(startLink, startRoom);
  const approach = approachAxisForWallLink(endLink, endRoom);
  if (
    !outward ||
    !approach ||
    !segmentAlongAxis(startPt, bend, outward) ||
    !segmentAlongAxis(bend, endPt, approach)
  ) {
    return null;
  }

  const leg1 = Math.hypot(bend.xMm - startPt.xMm, bend.zMm - startPt.zMm);
  const leg2 = Math.hypot(endPt.xMm - bend.xMm, endPt.zMm - bend.zMm);
  if (leg1 < MIN_SEGMENT_MM || leg2 < MIN_SEGMENT_MM) return null;

  const finalized = finalizeHallwayPath(
    rooms,
    hallways,
    [startPt, bend, endPt],
    [startLink, null, endLink],
    widthMm,
  );
  return {
    startPt: finalized.points[0]!,
    endPt: finalized.points[finalized.points.length - 1]!,
    points: finalized.points,
    links: finalized.links,
  };
}

/** Snap guides between fixed entrance/exit portals — no hallway mesh until user picks one. */
export function computeExitAlignmentSnaps(
  rooms: PlacedRoom[],
  hallways: Hallway[],
  draft: HallwayDrawDraft,
): ExitAlignmentSnap[] {
  const hasExitPortal =
    draft.endPlacement &&
    (draft.phase === "align-exit" || draft.phase === "dragging");
  if (
    !hasExitPortal ||
    !draft.startPlacement ||
    !draft.endPlacement ||
    !draft.links[0]
  ) {
    return [];
  }

  const startLink = draft.links[0];
  const endLink = draft.endPlacement.link;
  const widthMm = draft.widthMm;

  const startRough = endpointCenterlineFromLink(
    rooms,
    hallways,
    startLink,
    widthMm,
  );
  const endRough = endpointCenterlineFromLink(
    rooms,
    hallways,
    endLink,
    widthMm,
    startRough,
  );

  const bends: HallwayWaypoint[] = [
    { xMm: endRough.xMm, zMm: startRough.zMm },
    { xMm: startRough.xMm, zMm: endRough.zMm },
  ];

  const cardinalFromExit: HallwayWaypoint[] = [
    { xMm: endRough.xMm + MIN_SEGMENT_MM, zMm: endRough.zMm },
    { xMm: endRough.xMm - MIN_SEGMENT_MM, zMm: endRough.zMm },
    { xMm: endRough.xMm, zMm: endRough.zMm + MIN_SEGMENT_MM },
    { xMm: endRough.xMm, zMm: endRough.zMm - MIN_SEGMENT_MM },
  ];

  const snaps: ExitAlignmentSnap[] = [];
  const seen = new Set<string>();

  const pushSnap = (snap: ExitAlignmentSnap) => {
    const key = `${snap.point.xMm},${snap.point.zMm}|${snap.guidePath.map((p) => `${p.xMm},${p.zMm}`).join("|")}`;
    if (seen.has(key)) return;
    seen.add(key);
    snaps.push(snap);
  };

  for (const bend of bends) {
    const route = buildExitRouteCandidate(
      rooms,
      hallways,
      startLink,
      endLink,
      widthMm,
      bend,
    );
    if (route) {
      pushSnap({
        point: bend,
        label: "Turn here · straight into exit",
        pathPoints: route.points,
        pathLinks: route.links,
        guidePath: route.points,
      });
      continue;
    }
    pushSnap({
      point: bend,
      label: "Turn here · align to exit",
      pathPoints: [startRough, bend, endRough],
      pathLinks: [startLink, null, endLink],
      guidePath: [startRough, bend, endRough],
    });
  }

  const straight = buildExitRouteCandidate(
    rooms,
    hallways,
    startLink,
    endLink,
    widthMm,
    null,
  );
  if (straight) {
    pushSnap({
      point: {
        xMm: Math.round((straight.startPt.xMm + straight.endPt.xMm) / 2),
        zMm: Math.round((straight.startPt.zMm + straight.endPt.zMm) / 2),
      },
      label: "Straight to exit",
      pathPoints: straight.points,
      pathLinks: straight.links,
      guidePath: straight.points,
    });
  } else {
    pushSnap({
      point: {
        xMm: Math.round((startRough.xMm + endRough.xMm) / 2),
        zMm: Math.round((startRough.zMm + endRough.zMm) / 2),
      },
      label: "Straight to exit",
      pathPoints: [startRough, endRough],
      pathLinks: [startLink, endLink],
      guidePath: [startRough, endRough],
    });
  }

  for (const point of cardinalFromExit) {
    const route = buildExitRouteCandidate(
      rooms,
      hallways,
      startLink,
      endLink,
      widthMm,
      point,
    );
    if (route) {
      pushSnap({
        point,
        label: "Align with exit",
        pathPoints: route.points,
        pathLinks: route.links,
        guidePath: route.points,
      });
    }
  }

  return snaps;
}

export function nearestExitAlignmentSnap(
  rooms: PlacedRoom[],
  hallways: Hallway[],
  draft: HallwayDrawDraft,
  xMm: number,
  zMm: number,
  radiusMm = EXIT_ALIGN_SNAP_RADIUS_MM,
): ExitAlignmentSnap | null {
  const snaps = computeExitAlignmentSnaps(rooms, hallways, draft);
  let best: { snap: ExitAlignmentSnap; distanceMm: number } | null = null;
  for (const snap of snaps) {
    const distanceMm = Math.hypot(snap.point.xMm - xMm, snap.point.zMm - zMm);
    if (distanceMm > radiusMm) continue;
    if (!best || distanceMm < best.distanceMm) {
      best = { snap, distanceMm };
    }
  }
  return best?.snap ?? null;
}

export function draftFromExitAlignmentSnap(
  draft: HallwayDrawDraft,
  snap: ExitAlignmentSnap,
): HallwayDrawDraft {
  return {
    ...draft,
    phase: "ready",
    widthMm: draft.widthMm,
    points: snap.pathPoints,
    links: snap.pathLinks,
    preview: null,
    wallPlacement: null,
    startPlacement: null,
    endPlacement: null,
  };
}

/** Snap radius for hallway path endpoints approaching a wall. */
export function hallwayWallSnapRadiusMm(widthMm: number): number {
  return Math.max(420, widthMm / 2 + 220);
}

/** Pin hallway endpoints to wall centerlines from their room links. */
export function applyWallAnchorsToPath(
  rooms: PlacedRoom[],
  hallways: Hallway[],
  points: HallwayWaypoint[],
  links: Array<WallLink | null>,
  widthMm: number,
): HallwayWaypoint[] {
  if (points.length < 2) return points.map((point) => ({ ...point }));

  const next = points.map((point) => ({ ...point }));
  const lks = [...links];
  while (lks.length < next.length) lks.push(null);

  if (lks[0]) {
    if (isRoomWallLink(lks[0])) {
      const room = roomForLink(rooms, lks[0]);
      if (room) {
        next[0] = anchorStartToWall(room, lks[0], widthMm, next[1]);
      }
    } else {
      const hallway = hallwayForLink(hallways, lks[0]);
      if (hallway) {
        next[0] =
          axisAlignedHallwayCenterline(hallway, lks[0], widthMm, next[1]) ??
          next[0];
      }
    }
  }

  const lastIdx = next.length - 1;
  if (lks[lastIdx]) {
    return appendHallwayEndWall(
      roomForLink(rooms, lks[lastIdx]!) ?? null,
      hallways,
      lks[lastIdx]!,
      widthMm,
      next,
      lks,
      lastIdx,
    ).points;
  }

  return next;
}

function inferredEndLink(
  rooms: PlacedRoom[],
  hallways: Hallway[],
  draft: HallwayDrawDraft,
): WallLink | null {
  if (draft.points.length < 2) return null;
  const last = draft.points[draft.points.length - 1];
  const prev = draft.points[draft.points.length - 2];
  return inferEndpointWallLink(rooms, hallways, last, prev, draft.widthMm);
}

/** Centerline path shown in the viewport — empty during portal-only alignment. */
export function draftDisplayPath(
  rooms: PlacedRoom[],
  hallways: Hallway[],
  draft: HallwayDrawDraft,
  options?: { angleSnapMode?: RoomAngleSnapMode },
): HallwayWaypoint[] {
  if (draft.phase === "align-exit") return [];
  if (draft.points.length === 0) return [];

  let points = [...draft.points];
  let links = [...draft.links];
  while (links.length < points.length) links.push(null);

  const extending = isCollinearExtensionPreview(draft);
  if (extending && draft.preview) {
    const prev = points[points.length - 2];
    const last = points[points.length - 1];
    const ext = collinearExtensionPoint(
      prev,
      last,
      draft.preview.xMm,
      draft.preview.zMm,
    );
    if (ext) {
      points[points.length - 1] = ext;
      links[points.length - 1] = null;
    }
  }

  if (!links[points.length - 1] && !extending) {
    const inferred = inferredEndLink(rooms, hallways, draft);
    if (inferred) links[points.length - 1] = inferred;
  }

  if (draft.phase === "placing-end" && draft.wallPlacement && !extending) {
    links[points.length - 1] = draft.wallPlacement.link;
  }

  if (links[0]) {
    points = finalizeHallwayPath(
      rooms,
      hallways,
      points,
      links,
      draft.widthMm,
    ).points;
  } else {
    points = applyWallAnchorsToPath(
      rooms,
      hallways,
      points,
      links,
      draft.widthMm,
    );
    points = normalizeHallwayPath(points, links).points;
  }

  if (draft.preview && !extending && points.length > 0) {
    const last = points[points.length - 1];
    const angleSnapMode = options?.angleSnapMode ?? "ortho";
    if (angleSnapMode === "ortho" || angleSnapMode === "off") {
      const dx = Math.abs(draft.preview.xMm - last.xMm);
      const dz = Math.abs(draft.preview.zMm - last.zMm);
      const aligned =
        dx >= dz
          ? { xMm: draft.preview.xMm, zMm: last.zMm }
          : { xMm: last.xMm, zMm: draft.preview.zMm };
      points = [...points, aligned];
    } else {
      points = [...points, draft.preview];
    }
  }

  return points;
}

export function draftOpeningLinks(
  rooms: PlacedRoom[],
  hallways: Hallway[],
  draft: HallwayDrawDraft,
): Array<{ link: WallLink; widthMm: number; placement?: WallPlacement }> {
  const items: Array<{
    link: WallLink;
    widthMm: number;
    placement?: WallPlacement;
  }> = [];

  const seen = new Set<string>();
  const add = (
    link: WallLink,
    widthMm: number,
    placement?: WallPlacement,
  ) => {
    const key = wallLinkKey(link);
    if (seen.has(key)) return;
    seen.add(key);
    items.push({ link, widthMm, placement });
  };

  draft.links.forEach((link) => {
    if (link) add(link, draft.widthMm);
  });

  if (
    draft.startPlacement &&
    (draft.phase === "pick-end" ||
      draft.phase === "align-exit" ||
      draft.phase === "dragging")
  ) {
    add(
      draft.startPlacement.link,
      draft.startPlacement.widthMm,
      draft.startPlacement,
    );
  }

  if (draft.endPlacement && (draft.phase === "align-exit" || draft.phase === "dragging")) {
    add(
      draft.endPlacement.link,
      draft.endPlacement.widthMm,
      draft.endPlacement,
    );
  }

  if (
    draft.wallPlacement &&
    draft.phase !== "placing-start" &&
    draft.phase !== "placing-end"
  ) {
    add(
      draft.wallPlacement.link,
      draft.wallPlacement.widthMm,
      draft.wallPlacement,
    );
  }

  if (
    draft.points.length >= 2 &&
    !draft.links[draft.points.length - 1] &&
    draft.phase !== "placing-end"
  ) {
    const inferred = inferredEndLink(rooms, hallways, draft);
    if (inferred) add(inferred, draft.widthMm);
  }

  return items;
}

export function canCompleteHallwayDraft(
  rooms: PlacedRoom[],
  hallways: Hallway[],
  draft: HallwayDrawDraft,
): boolean {
  if (draft.points.length < 2 || !draft.links[0]) return false;
  if (draft.links[draft.points.length - 1]) return true;
  if (draft.phase === "placing-end" && draft.wallPlacement) return true;
  const { links } = finalizeHallwayPath(
    rooms,
    hallways,
    draft.points,
    draft.links,
    draft.widthMm,
  );
  return Boolean(links[links.length - 1]);
}

export function prepareHallwayForCreate(
  rooms: PlacedRoom[],
  hallways: Hallway[],
  draft: HallwayDrawDraft,
): { points: HallwayWaypoint[]; links: Array<WallLink | null> } | null {
  if (!canCompleteHallwayDraft(rooms, hallways, draft)) return null;

  let points = [...draft.points];
  let links = [...draft.links];
  while (links.length < points.length) links.push(null);

  if (draft.phase === "placing-end" && draft.wallPlacement) {
    links[points.length - 1] = draft.wallPlacement.link;
  }

  return finalizeHallwayPath(rooms, hallways, points, links, draft.widthMm);
}

const ENDPOINT_ATTACH_TOLERANCE_MM = 140;

function hallwayEndpointForPoint(
  hallway: Hallway,
  point: HallwayWaypoint,
): "start" | "end" | null {
  const pts = hallway.waypointsMm;
  if (pts.length < 2) return null;
  const start = pts[0]!;
  const end = pts[pts.length - 1]!;
  if (Math.hypot(point.xMm - start.xMm, point.zMm - start.zMm) <= ENDPOINT_ATTACH_TOLERANCE_MM) {
    return "start";
  }
  if (Math.hypot(point.xMm - end.xMm, point.zMm - end.zMm) <= ENDPOINT_ATTACH_TOLERANCE_MM) {
    return "end";
  }
  return null;
}

function segmentsCollinear(
  a0: HallwayWaypoint,
  a1: HallwayWaypoint,
  b0: HallwayWaypoint,
  b1: HallwayWaypoint,
): boolean {
  const axisA = hallwaySegmentAxis(a0, a1);
  const axisB = hallwaySegmentAxis(b0, b1);
  return axisA !== null && axisA === axisB;
}

export interface HallwayExtensionPlan {
  hallwayId: string;
  waypoints: HallwayWaypoint[];
  openings: HallwayConnectionOpening[];
}

/** When a new hallway continues straight from an existing endpoint, merge paths instead of creating a seam. */
export function tryPlanHallwayExtension(
  hallways: Hallway[],
  newPoints: HallwayWaypoint[],
  openings: HallwayConnectionOpening[],
): HallwayExtensionPlan | null {
  if (newPoints.length < 2) return null;

  const branchOpenings = openings.filter(
    (opening): opening is HallwayBranchConnectionOpening => opening.kind === "hallway",
  );
  if (branchOpenings.length !== 1) return null;

  const branch = branchOpenings[0];
  const parent = hallways.find((hallway) => hallway.id === branch.hallwayId);
  if (!parent || parent.waypointsMm.length < 2) return null;

  const parentPts = parent.waypointsMm;
  const lastNew = newPoints.length - 1;
  let merged: HallwayWaypoint[] | null = null;

  const parentAtStart = hallwayEndpointForPoint(parent, newPoints[0]!);
  if (parentAtStart === "end") {
    const parentSegStart = parentPts[parentPts.length - 2]!;
    const parentSegEnd = parentPts[parentPts.length - 1]!;
    if (
      segmentsCollinear(
        parentSegStart,
        parentSegEnd,
        newPoints[0]!,
        newPoints[1]!,
      )
    ) {
      merged = [...parentPts, ...newPoints.slice(1)];
    }
  }

  const parentAtEnd = hallwayEndpointForPoint(parent, newPoints[lastNew]!);
  if (!merged && parentAtEnd === "start") {
    const parentSegStart = parentPts[0]!;
    const parentSegEnd = parentPts[1]!;
    if (
      segmentsCollinear(
        newPoints[lastNew - 1]!,
        newPoints[lastNew]!,
        parentSegStart,
        parentSegEnd,
      )
    ) {
      merged = [...newPoints.slice(0, -1), ...parentPts];
    }
  }

  if (!merged) return null;

  const { points } = simplifyHallwayWaypoints(merged);
  if (points.length < 2) return null;

  return {
    hallwayId: parent.id,
    waypoints: points,
    openings: openings.filter((opening) => opening !== branch),
  };
}

/** Detect room/hallway wall connections at hallway endpoints for wall openings. */
export function resolveHallwayEndpointLinks(
  rooms: PlacedRoom[],
  hallways: Hallway[],
  points: HallwayWaypoint[],
  links: Array<WallLink | null>,
  widthMm: number,
): Array<WallLink | null> {
  if (points.length < 2) return links;

  const nextLinks = [...links];
  while (nextLinks.length < points.length) nextLinks.push(null);

  for (const idx of [0, points.length - 1] as const) {
    if (nextLinks[idx]) continue;
    const approach =
      idx === 0 ? points[1] : points[points.length - 2];
    const inferred = inferEndpointWallLink(
      rooms,
      hallways,
      points[idx],
      approach,
      widthMm,
    );
    if (inferred) nextLinks[idx] = inferred;
  }

  return nextLinks;
}

function inferEndpointWallLink(
  rooms: PlacedRoom[],
  hallways: Hallway[],
  endpoint: HallwayWaypoint,
  approach: HallwayWaypoint,
  widthMm: number,
): WallLink | null {
  let best: { link: WallLink; distanceMm: number } | null = null;

  for (const room of rooms) {
    for (const edge of wallEdges(room)) {
      const projected = projectPointToWall(
        room,
        edge.wallIndex,
        endpoint.xMm,
        endpoint.zMm,
      );
      if (!projected || projected.distanceMm > Math.max(320, widthMm / 2 + 160)) continue;

      const axis = linkApproachAxis(room, edge.wallIndex);
      if (axis === "z" && Math.abs(approach.xMm - endpoint.xMm) > 120) continue;
      if (axis === "x" && Math.abs(approach.zMm - endpoint.zMm) > 120) continue;

      const approachPoint = orthogonalApproachWall(approach, room, edge.wallIndex);
      const onWall = projectPointToWall(
        room,
        edge.wallIndex,
        approachPoint.xMm,
        approachPoint.zMm,
      );
      const offsetMm = clampWallOffset(
        room,
        edge.wallIndex,
        onWall?.offsetMm ?? projected.offsetMm,
        widthMm,
      );

      if (!best || projected.distanceMm < best.distanceMm) {
        best = {
          link: roomWallLink(room.placementId, edge.wallIndex, offsetMm),
          distanceMm: projected.distanceMm,
        };
      }
    }
  }

  for (const hallway of hallways) {
    for (const layout of listHallwaySegmentWalls(hallway)) {
      const along =
        layout.axis === "horizontal" ? endpoint.xMm : endpoint.zMm;
      if (along < layout.loMm - 80 || along > layout.hiMm + 80) continue;

      const distanceMm =
        layout.axis === "horizontal"
          ? Math.abs(endpoint.zMm - layout.fixedMm)
          : Math.abs(endpoint.xMm - layout.fixedMm);
      if (distanceMm > Math.max(320, widthMm / 2 + 160)) continue;

      if (layout.axis === "horizontal" && Math.abs(approach.xMm - endpoint.xMm) > 120) {
        continue;
      }
      if (layout.axis === "vertical" && Math.abs(approach.zMm - endpoint.zMm) > 120) {
        continue;
      }

      const offsetMm = clampHallwayWallOffset(
        layout,
        along - layout.loMm,
        widthMm,
      );

      if (!best || distanceMm < best.distanceMm) {
        best = {
          link: hallwayWallLink(
            hallway.id,
            layout.segIndex,
            layout.side,
            offsetMm,
          ),
          distanceMm,
        };
      }
    }
  }

  return best?.link ?? null;
}

export function hallwaySegmentLayout(
  x1Mm: number,
  z1Mm: number,
  x2Mm: number,
  z2Mm: number,
  widthMm: number,
) {
  const dx = x2Mm - x1Mm;
  const dz = z2Mm - z1Mm;
  const length = Math.hypot(dx, dz) * 0.001;
  const rotationY =
    Math.abs(dx) >= Math.abs(dz)
      ? dx >= 0
        ? Math.PI / 2
        : -Math.PI / 2
      : dz >= 0
        ? 0
        : Math.PI;
  return {
    centerX: ((x1Mm + x2Mm) / 2) * 0.001,
    centerZ: ((z1Mm + z2Mm) / 2) * 0.001,
    length: Math.max(length, 0.01),
    width: widthMm * 0.001,
    rotationY,
  };
}

export function isAxisAlignedSegment(
  a: HallwayWaypoint,
  b: HallwayWaypoint,
): boolean {
  const dx = Math.abs(b.xMm - a.xMm);
  const dz = Math.abs(b.zMm - a.zMm);
  return dx < 50 || dz < 50;
}
