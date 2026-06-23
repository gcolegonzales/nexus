import { clampOpeningOffset } from "@/tools/room-coat/lib/openings-layout";
import {
  offsetInOpening,
  wallSegmentByIndex,
} from "@/tools/room-coat/lib/wall-openings";
import type { PlacedRoom, Window } from "@/tools/room-coat/types/state";

const MIN_MARGIN_MM = 1;

export type WindowPlacementInput = Pick<
  Window,
  "wallIndex" | "offsetFromCornerMm" | "widthMm" | "heightMm" | "sillHeightMm"
>;

const WINDOW_SURFACE_PATTERN = /^(.+):window:(.+)$/;

export function parseWindowSurfaceId(
  surfaceId: string,
): { placementId: string; windowId: string } | null {
  const match = surfaceId.match(WINDOW_SURFACE_PATTERN);
  if (!match) return null;
  return { placementId: match[1], windowId: match[2] };
}

export function validateWindowPlacement(
  room: PlacedRoom,
  window: WindowPlacementInput,
): { valid: boolean; reason?: string } {
  const edge = wallSegmentByIndex(room, window.wallIndex);
  if (!edge) {
    return { valid: false, reason: "Wall not found" };
  }

  if (window.widthMm <= 0 || window.heightMm <= 0) {
    return { valid: false, reason: "Window size is invalid" };
  }

  if (
    window.offsetFromCornerMm < -MIN_MARGIN_MM ||
    window.offsetFromCornerMm + window.widthMm > edge.lengthMm + MIN_MARGIN_MM
  ) {
    return { valid: false, reason: "Window must fit on the wall" };
  }

  if (window.sillHeightMm < -MIN_MARGIN_MM) {
    return { valid: false, reason: "Sill height is invalid" };
  }

  if (window.sillHeightMm + window.heightMm > room.heightMm + MIN_MARGIN_MM) {
    return { valid: false, reason: "Window must fit below the ceiling" };
  }

  const centerOffset = window.offsetFromCornerMm + window.widthMm / 2;
  if (offsetInOpening(room, window.wallIndex, centerOffset)) {
    return { valid: false, reason: "Window cannot overlap a wall opening" };
  }

  return { valid: true };
}

export function clampWindowOnWall(
  room: PlacedRoom,
  window: WindowPlacementInput,
  centerOffsetMm?: number,
): WindowPlacementInput | null {
  const edge = wallSegmentByIndex(room, window.wallIndex);
  if (!edge) return null;

  const offsetFromCornerMm =
    centerOffsetMm === undefined
      ? window.offsetFromCornerMm
      : clampOpeningOffset(edge.lengthMm, window.widthMm, centerOffsetMm);

  const maxSill = Math.max(0, room.heightMm - window.heightMm);
  const sillHeightMm = Math.max(
    0,
    Math.min(maxSill, Math.round(window.sillHeightMm)),
  );

  const clamped: WindowPlacementInput = {
    ...window,
    offsetFromCornerMm,
    sillHeightMm,
  };

  return validateWindowPlacement(room, clamped).valid ? clamped : null;
}
