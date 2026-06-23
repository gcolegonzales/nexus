import {
  centerlinePointFromWallHit,
  commitWallPlacementPoint,
  createWallPlacementFromHit,
  setPlacementCenter,
  type WallPlacement,
} from "@/tools/room-coat/lib/hallway-draft";
import {
  centerlinePointFromHallwayLink,
  createWallPlacementFromHallwayHit,
  type EndpointWallHit,
} from "@/tools/room-coat/lib/hallway-wall-hit";
import type { SnapGuideSegment } from "@/tools/room-coat/lib/snap-guides";
import { isWallSnapPoint, wallSnapHitFromPoint } from "@/tools/room-coat/lib/snap-point-utils";
import {
  hallwayWallLink,
  isHallwayWallLink,
  isRoomWallLink,
  roomWallLink,
  wallLinkKey,
  type WallLink,
} from "@/tools/room-coat/lib/wall-links";
import {
  linkApproachAxis,
  linkOutwardNormal,
} from "@/tools/room-coat/lib/room-shape";
import type {
  Hallway,
  HallwayWaypoint,
  PlacedRoom,
  SnapPoint,
} from "@/tools/room-coat/types/state";

const ENTRANCE_OFFSET_SNAP_MM = 420;
const ENTRANCE_LINE_ENGAGE_MM = 160;
const ENTRANCE_LINE_RELEASE_MM = 300;
const ENTRANCE_CENTER_SNAP_ALONG_MM = 520;
const GUIDE_LENGTH_MM = 4200;

export interface HallwayEntranceTarget {
  id: string;
  label: string;
  link: WallLink;
  offsetMm: number;
  widthMm: number;
}

export interface HallwayEntranceLineSnap {
  targetId: string;
  lockAxis: "x" | "z";
  lockValueMm: number;
  anchor: HallwayWaypoint;
  kind: "entrance" | "continuation";
}

export interface HallwayContinuationTarget {
  id: string;
  label: string;
  hallwayId: string;
  end: "start" | "end";
  anchor: HallwayWaypoint;
  lockAxis: "x" | "z";
}

function segmentLockAxis(
  a: HallwayWaypoint,
  b: HallwayWaypoint,
): "x" | "z" | null {
  if (Math.abs(a.zMm - b.zMm) <= 20) return "z";
  if (Math.abs(a.xMm - b.xMm) <= 20) return "x";
  return null;
}

export function collectHallwayContinuationTargets(
  hallways: Hallway[],
  excludeHallwayIds: Set<string> = new Set(),
): HallwayContinuationTarget[] {
  const targets: HallwayContinuationTarget[] = [];

  for (const hallway of hallways) {
    if (excludeHallwayIds.has(hallway.id)) continue;
    const points = hallway.waypointsMm;
    if (points.length < 2) continue;

    const startAxis = segmentLockAxis(points[0]!, points[1]!);
    if (startAxis) {
      targets.push({
        id: `continuation:${hallway.id}:start`,
        label: `Continue · ${hallway.name}`,
        hallwayId: hallway.id,
        end: "start",
        anchor: { ...points[0]! },
        lockAxis: startAxis,
      });
    }

    const last = points.length - 1;
    const endAxis = segmentLockAxis(points[last - 1]!, points[last]!);
    if (endAxis) {
      targets.push({
        id: `continuation:${hallway.id}:end`,
        label: `Continue · ${hallway.name}`,
        hallwayId: hallway.id,
        end: "end",
        anchor: { ...points[last]! },
        lockAxis: endAxis,
      });
    }
  }

  return targets;
}

export function continuationCenterlineGuide(
  target: HallwayContinuationTarget,
): SnapGuideSegment {
  const { anchor, lockAxis } = target;
  if (lockAxis === "z") {
    return {
      x1Mm: Math.round(anchor.xMm - GUIDE_LENGTH_MM),
      z1Mm: Math.round(anchor.zMm),
      x2Mm: Math.round(anchor.xMm + GUIDE_LENGTH_MM),
      z2Mm: Math.round(anchor.zMm),
    };
  }
  return {
    x1Mm: Math.round(anchor.xMm),
    z1Mm: Math.round(anchor.zMm - GUIDE_LENGTH_MM),
    x2Mm: Math.round(anchor.xMm),
    z2Mm: Math.round(anchor.zMm + GUIDE_LENGTH_MM),
  };
}

export function continuationGuidesForTargets(
  targets: HallwayContinuationTarget[],
): SnapGuideSegment[] {
  return targets.map((target) => continuationCenterlineGuide(target));
}

function wallSurfaceKey(link: WallLink): string {
  if (isRoomWallLink(link)) {
    return `room:${link.placementId}:${link.wallIndex}`;
  }
  return `hallway:${link.hallwayId}:${link.segIndex}:${link.side}`;
}

function roomForLink(rooms: PlacedRoom[], link: WallLink): PlacedRoom | null {
  if (!isRoomWallLink(link)) return null;
  return rooms.find((room) => room.placementId === link.placementId) ?? null;
}

function hallwayForLink(hallways: Hallway[], link: WallLink): Hallway | null {
  if (!isHallwayWallLink(link)) return null;
  return hallways.find((hallway) => hallway.id === link.hallwayId) ?? null;
}

export function collectHallwayEntranceTargets(
  rooms: PlacedRoom[],
  hallways: Hallway[],
  snapPoints: SnapPoint[],
  excludeLinkKeys: Set<string> = new Set(),
): HallwayEntranceTarget[] {
  const targets: HallwayEntranceTarget[] = [];
  const seen = new Set<string>();

  const push = (target: HallwayEntranceTarget) => {
    const key = wallLinkKey(target.link);
    if (excludeLinkKeys.has(key) || seen.has(key)) return;
    seen.add(key);
    targets.push(target);
  };

  for (const point of snapPoints) {
    if (!isWallSnapPoint(point)) continue;
    if (
      !point.roomPlacementId ||
      point.wallIndex === undefined ||
      point.wallOffsetMm === undefined
    ) {
      continue;
    }
    const hit = wallSnapHitFromPoint(point);
    if (!hit) continue;
    push({
      id: `snap:${point.id}`,
      label: point.label ?? "Entrance",
      link: roomWallLink(point.roomPlacementId, point.wallIndex, hit.offsetMm),
      offsetMm: hit.offsetMm,
      widthMm: hit.widthMm,
    });
  }

  for (const room of rooms) {
    for (const opening of room.wallOpenings) {
      const lo = Math.min(opening.startMm, opening.endMm);
      const hi = Math.max(opening.startMm, opening.endMm);
      if (hi - lo < 100) continue;
      const offsetMm = (lo + hi) / 2;
      push({
        id: `opening:${room.placementId}:${opening.id}`,
        label: `Door · ${room.name}`,
        link: roomWallLink(room.placementId, opening.wallIndex, offsetMm),
        offsetMm,
        widthMm: hi - lo,
      });
    }
  }

  for (const hallway of hallways) {
    for (const opening of hallway.wallOpenings) {
      const lo = Math.min(opening.startMm, opening.endMm);
      const hi = Math.max(opening.startMm, opening.endMm);
      if (hi - lo < 100) continue;
      const offsetMm = (lo + hi) / 2;
      push({
        id: `hallway-opening:${hallway.id}:${opening.id}`,
        label: `Door · ${hallway.name}`,
        link: hallwayWallLink(
          hallway.id,
          opening.segIndex,
          opening.side,
          offsetMm,
        ),
        offsetMm,
        widthMm: hi - lo,
      });
    }
  }

  return targets;
}

export function targetToPlacement(target: HallwayEntranceTarget): WallPlacement {
  return {
    link: {
      ...target.link,
      offsetMm: Math.round(target.offsetMm),
    },
    widthMm: target.widthMm,
    faceNormalX: 0,
    faceNormalZ: 0,
  };
}

export function nearestEntranceOnWallSurface(
  targets: HallwayEntranceTarget[],
  surfaceKey: string,
  offsetMm: number,
  maxDistanceMm = ENTRANCE_OFFSET_SNAP_MM,
): HallwayEntranceTarget | null {
  let best: HallwayEntranceTarget | null = null;
  let bestDistance = Infinity;

  for (const target of targets) {
    if (wallSurfaceKey(target.link) !== surfaceKey) continue;
    const distance = Math.abs(target.offsetMm - offsetMm);
    if (distance <= maxDistanceMm && distance < bestDistance) {
      best = target;
      bestDistance = distance;
    }
  }

  return best;
}

export function snapWallPlacementToEntrance(
  rooms: PlacedRoom[],
  hallways: Hallway[],
  placement: WallPlacement,
  pointerOffsetMm: number,
  targets: HallwayEntranceTarget[],
): WallPlacement {
  const surfaceKey = wallSurfaceKey(placement.link);
  const match = nearestEntranceOnWallSurface(
    targets,
    surfaceKey,
    pointerOffsetMm,
  );
  if (!match) return placement;

  const snapped = targetToPlacement(match);
  if (isRoomWallLink(snapped.link)) {
    const room = roomForLink(rooms, snapped.link);
    if (!room) return placement;
    return setPlacementCenter(room, { ...placement, widthMm: match.widthMm }, match.offsetMm);
  }

  if (isHallwayWallLink(snapped.link)) {
    const hallway = hallwayForLink(hallways, snapped.link);
    if (!hallway) return placement;
    return {
      ...placement,
      widthMm: match.widthMm,
      link: {
        ...snapped.link,
        offsetMm: match.offsetMm,
      },
    };
  }

  return placement;
}

function anchorForTarget(
  rooms: PlacedRoom[],
  hallways: Hallway[],
  target: HallwayEntranceTarget,
  approachFrom?: HallwayWaypoint,
): HallwayWaypoint | null {
  const placement = targetToPlacement(target);
  if (isRoomWallLink(target.link)) {
    const room = roomForLink(rooms, target.link);
    if (!room) return null;
    return centerlinePointFromWallHit(
      room,
      target.link,
      target.widthMm,
      undefined,
      approachFrom,
    );
  }

  const hallway = hallwayForLink(hallways, target.link);
  if (!hallway || !isHallwayWallLink(target.link)) return null;
  return (
    centerlinePointFromHallwayLink(
      hallway,
      target.link,
      target.widthMm,
      undefined,
      approachFrom,
    ) ?? null
  );
}

export function entranceCenterlineGuide(
  rooms: PlacedRoom[],
  hallways: Hallway[],
  target: HallwayEntranceTarget,
  approachFrom?: HallwayWaypoint,
): SnapGuideSegment | null {
  const anchor = anchorForTarget(rooms, hallways, target, approachFrom);
  if (!anchor) return null;

  if (isRoomWallLink(target.link)) {
    const link = target.link;
    const room = rooms.find((item) => item.placementId === link.placementId);
    if (!room) return null;
    const wallIndex = link.wallIndex;
    const outward = linkOutwardNormal(room, wallIndex);
    if (linkApproachAxis(room, wallIndex) === "z") {
      const sign = outward.zMm >= 0 ? 1 : -1;
      return {
        x1Mm: Math.round(anchor.xMm),
        z1Mm: Math.round(anchor.zMm),
        x2Mm: Math.round(anchor.xMm),
        z2Mm: Math.round(anchor.zMm + sign * GUIDE_LENGTH_MM),
      };
    }
    const sign = outward.xMm >= 0 ? 1 : -1;
    return {
      x1Mm: Math.round(anchor.xMm + sign * GUIDE_LENGTH_MM),
      z1Mm: Math.round(anchor.zMm),
      x2Mm: Math.round(anchor.xMm),
      z2Mm: Math.round(anchor.zMm),
    };
  }

  const hallway = hallwayForLink(hallways, target.link);
  if (!hallway || !isHallwayWallLink(target.link)) return null;
  const onWall =
    centerlinePointFromHallwayLink(hallway, target.link, target.widthMm) ??
    anchor;
  const dx = anchor.xMm - onWall.xMm;
  const dz = anchor.zMm - onWall.zMm;
  const len = Math.hypot(dx, dz) || 1;
  const ux = dx / len;
  const uz = dz / len;
  return {
    x1Mm: Math.round(anchor.xMm),
    z1Mm: Math.round(anchor.zMm),
    x2Mm: Math.round(anchor.xMm + ux * GUIDE_LENGTH_MM),
    z2Mm: Math.round(anchor.zMm + uz * GUIDE_LENGTH_MM),
  };
}

function lineMetrics(
  anchor: HallwayWaypoint,
  lockAxis: "x" | "z",
  pointerXMm: number,
  pointerZMm: number,
): { perpendicularMm: number; alongMm: number } {
  if (lockAxis === "x") {
    return {
      perpendicularMm: Math.abs(pointerXMm - anchor.xMm),
      alongMm: pointerZMm - anchor.zMm,
    };
  }
  return {
    perpendicularMm: Math.abs(pointerZMm - anchor.zMm),
    alongMm: pointerXMm - anchor.xMm,
  };
}

function buildEntranceLineSnap(
  target: HallwayEntranceTarget,
  anchor: HallwayWaypoint,
  rooms: PlacedRoom[],
): HallwayEntranceLineSnap {
  const roomLink = isRoomWallLink(target.link) ? target.link : null;
  const room = roomLink
    ? rooms.find((item) => item.placementId === roomLink.placementId)
    : null;
  const lockAxis: "x" | "z" =
    room && roomLink
      ? linkApproachAxis(room, roomLink.wallIndex) === "z"
        ? "x"
        : "z"
      : roomLink
        ? "z"
        : Math.abs(anchor.xMm) >= Math.abs(anchor.zMm)
          ? "z"
          : "x";

  return {
    targetId: target.id,
    lockAxis,
    lockValueMm: lockAxis === "x" ? Math.round(anchor.xMm) : Math.round(anchor.zMm),
    anchor,
    kind: "entrance",
  };
}

function buildContinuationLineSnap(
  target: HallwayContinuationTarget,
): HallwayEntranceLineSnap {
  return {
    targetId: target.id,
    lockAxis: target.lockAxis,
    lockValueMm:
      target.lockAxis === "x"
        ? Math.round(target.anchor.xMm)
        : Math.round(target.anchor.zMm),
    anchor: target.anchor,
    kind: "continuation",
  };
}

interface DrawLineSnapCandidate {
  point: HallwayWaypoint;
  stickyLine: HallwayEntranceLineSnap;
  entranceTarget?: HallwayEntranceTarget;
  guide: SnapGuideSegment;
}

function pointOnDrawLineSnap(
  stickyLine: HallwayEntranceLineSnap,
  pointerXMm: number,
  pointerZMm: number,
): HallwayWaypoint {
  return stickyLine.lockAxis === "x"
    ? { xMm: stickyLine.lockValueMm, zMm: Math.round(pointerZMm) }
    : { xMm: Math.round(pointerXMm), zMm: stickyLine.lockValueMm };
}

function resolveStickyDrawLineSnap(input: {
  rooms: PlacedRoom[];
  hallways: Hallway[];
  entranceTargets: HallwayEntranceTarget[];
  continuationTargets: HallwayContinuationTarget[];
  pointerXMm: number;
  pointerZMm: number;
  approachFrom?: HallwayWaypoint;
  stickyLine: HallwayEntranceLineSnap;
}): DrawLineSnapCandidate | null {
  const {
    rooms,
    hallways,
    entranceTargets,
    continuationTargets,
    pointerXMm,
    pointerZMm,
    approachFrom,
    stickyLine,
  } = input;

  const entranceTarget = entranceTargets.find(
    (entry) => entry.id === stickyLine.targetId,
  );
  const continuationTarget = continuationTargets.find(
    (entry) => entry.id === stickyLine.targetId,
  );
  if (!entranceTarget && !continuationTarget) return null;

  const metrics = lineMetrics(
    stickyLine.anchor,
    stickyLine.lockAxis,
    pointerXMm,
    pointerZMm,
  );
  if (metrics.perpendicularMm > ENTRANCE_LINE_RELEASE_MM) return null;

  const point = pointOnDrawLineSnap(stickyLine, pointerXMm, pointerZMm);

  const guide = continuationTarget
    ? continuationCenterlineGuide(continuationTarget)
    : entranceTarget
      ? entranceCenterlineGuide(rooms, hallways, entranceTarget, approachFrom)
      : null;
  if (!guide) return null;

  return {
    point,
    stickyLine,
    entranceTarget,
    guide,
  };
}

function resolveBestDrawLineSnap(input: {
  rooms: PlacedRoom[];
  hallways: Hallway[];
  entranceTargets: HallwayEntranceTarget[];
  continuationTargets: HallwayContinuationTarget[];
  pointerXMm: number;
  pointerZMm: number;
  approachFrom?: HallwayWaypoint;
}): DrawLineSnapCandidate | null {
  const {
    rooms,
    hallways,
    entranceTargets,
    continuationTargets,
    pointerXMm,
    pointerZMm,
    approachFrom,
  } = input;

  let best: {
    stickyLine: HallwayEntranceLineSnap;
    entranceTarget?: HallwayEntranceTarget;
    guide: SnapGuideSegment;
    perpendicularMm: number;
  } | null = null;

  for (const target of entranceTargets) {
    const anchor = anchorForTarget(rooms, hallways, target, approachFrom);
    if (!anchor) continue;
    const stickyLine = buildEntranceLineSnap(target, anchor, rooms);
    const metrics = lineMetrics(anchor, stickyLine.lockAxis, pointerXMm, pointerZMm);
    if (metrics.perpendicularMm > ENTRANCE_LINE_ENGAGE_MM) continue;
    const guide = entranceCenterlineGuide(rooms, hallways, target, approachFrom);
    if (!guide) continue;
    if (!best || metrics.perpendicularMm < best.perpendicularMm) {
      best = {
        stickyLine,
        entranceTarget: target,
        guide,
        perpendicularMm: metrics.perpendicularMm,
      };
    }
  }

  for (const target of continuationTargets) {
    const stickyLine = buildContinuationLineSnap(target);
    const metrics = lineMetrics(
      target.anchor,
      stickyLine.lockAxis,
      pointerXMm,
      pointerZMm,
    );
    if (metrics.perpendicularMm > ENTRANCE_LINE_ENGAGE_MM) continue;
    const guide = continuationCenterlineGuide(target);
    if (!best || metrics.perpendicularMm < best.perpendicularMm) {
      best = {
        stickyLine,
        guide,
        perpendicularMm: metrics.perpendicularMm,
      };
    }
  }

  if (!best) return null;

  return {
    point: pointOnDrawLineSnap(best.stickyLine, pointerXMm, pointerZMm),
    stickyLine: best.stickyLine,
    entranceTarget: best.entranceTarget,
    guide: best.guide,
  };
}

export function resolveHallwayDrawLineSnap(input: {
  rooms: PlacedRoom[];
  hallways: Hallway[];
  entranceTargets: HallwayEntranceTarget[];
  continuationTargets: HallwayContinuationTarget[];
  pointerXMm: number;
  pointerZMm: number;
  approachFrom?: HallwayWaypoint;
  stickyLine: HallwayEntranceLineSnap | null;
}): DrawLineSnapCandidate | null {
  const {
    rooms,
    hallways,
    entranceTargets,
    continuationTargets,
    pointerXMm,
    pointerZMm,
    approachFrom,
    stickyLine,
  } = input;

  if (stickyLine) {
    const sticky = resolveStickyDrawLineSnap({
      rooms,
      hallways,
      entranceTargets,
      continuationTargets,
      pointerXMm,
      pointerZMm,
      approachFrom,
      stickyLine,
    });
    if (sticky) return sticky;
  }

  return resolveBestDrawLineSnap({
    rooms,
    hallways,
    entranceTargets,
    continuationTargets,
    pointerXMm,
    pointerZMm,
    approachFrom,
  });
}

/** @deprecated Use resolveHallwayDrawLineSnap */
export function resolveHallwayEntranceLineSnap(input: {
  rooms: PlacedRoom[];
  hallways: Hallway[];
  targets: HallwayEntranceTarget[];
  pointerXMm: number;
  pointerZMm: number;
  approachFrom?: HallwayWaypoint;
  stickyLine: HallwayEntranceLineSnap | null;
}): {
  point: HallwayWaypoint;
  target: HallwayEntranceTarget;
  guide: SnapGuideSegment;
  stickyLine: HallwayEntranceLineSnap;
} | null {
  const result = resolveHallwayDrawLineSnap({
    rooms: input.rooms,
    hallways: input.hallways,
    entranceTargets: input.targets,
    continuationTargets: [],
    pointerXMm: input.pointerXMm,
    pointerZMm: input.pointerZMm,
    approachFrom: input.approachFrom,
    stickyLine: input.stickyLine,
  });
  if (!result?.entranceTarget) return null;
  return {
    point: result.point,
    target: result.entranceTarget,
    guide: result.guide,
    stickyLine: result.stickyLine,
  };
}

export function snapEndpointToEntrance(
  rooms: PlacedRoom[],
  hallways: Hallway[],
  endpointHit: EndpointWallHit,
  targets: HallwayEntranceTarget[],
  widthMm: number,
  approachFrom?: HallwayWaypoint,
): { point: HallwayWaypoint; link: WallLink } | null {
  if (endpointHit.kind === "room") {
    const room = endpointHit.hit.room;
    const surfaceKey = wallSurfaceKey(
      roomWallLink(
        room.placementId,
        endpointHit.hit.wallIndex,
        endpointHit.hit.offsetMm,
      ),
    );
    const match = nearestEntranceOnWallSurface(
      targets,
      surfaceKey,
      endpointHit.hit.offsetMm,
    );
    if (!match || !isRoomWallLink(match.link)) return null;

    const placement = createWallPlacementFromHit(
      room,
      {
        wallIndex: match.link.wallIndex,
        offsetMm: match.offsetMm,
      },
      match.widthMm,
      approachFrom,
    );
    return commitWallPlacementPoint(room, hallways, placement, approachFrom);
  }

  const hallway = endpointHit.hit.hallway;
  const link = hallwayWallLink(
    hallway.id,
    endpointHit.hit.segIndex,
    endpointHit.hit.side,
    endpointHit.hit.offsetMm,
  );
  const match = nearestEntranceOnWallSurface(
    targets,
    wallSurfaceKey(link),
    endpointHit.hit.offsetMm,
  );
  if (!match || !isHallwayWallLink(match.link)) return null;

  const placement = createWallPlacementFromHallwayHit(
    hallway,
    {
      ...endpointHit.hit,
      offsetMm: match.offsetMm,
    },
    match.widthMm,
    approachFrom,
  );
  return commitWallPlacementPoint(null, hallways, placement, approachFrom);
}

export function entranceGuidesForTargets(
  rooms: PlacedRoom[],
  hallways: Hallway[],
  targets: HallwayEntranceTarget[],
): SnapGuideSegment[] {
  const guides: SnapGuideSegment[] = [];
  for (const target of targets) {
    const guide = entranceCenterlineGuide(rooms, hallways, target);
    if (guide) guides.push(guide);
  }
  return guides;
}

export function shouldSnapPointToEntranceCenter(
  anchor: HallwayWaypoint,
  point: HallwayWaypoint,
): boolean {
  return Math.hypot(point.xMm - anchor.xMm, point.zMm - anchor.zMm) <=
    ENTRANCE_CENTER_SNAP_ALONG_MM;
}
