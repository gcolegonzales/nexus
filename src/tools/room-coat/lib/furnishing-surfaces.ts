import type { EditorHoverMeasurement } from "@/tools/room-coat/lib/surface-measurements";
import { formatMm } from "@/tools/room-coat/lib/units";
import {
  measureFurnishingFaceSnap,
  parseFurnishingFaceSnapSurfaceId,
} from "@/tools/room-coat/lib/furnishing-snap-points";
import type { Furnishing, UnitPreference } from "@/tools/room-coat/types/state";

const FURNISHING_ID_PREFIX = "furnishing:";

export function isFurnishingSurfaceId(surfaceId: string): boolean {
  return surfaceId.startsWith(FURNISHING_ID_PREFIX);
}

export function furnishingBodySurfaceId(furnishingId: string): string {
  return `${FURNISHING_ID_PREFIX}${furnishingId}:body`;
}

export function parseFurnishingSurfaceId(surfaceId: string): {
  furnishingId: string;
  kind: "body" | "snap";
  face?: "front" | "back" | "left" | "right" | "top" | "bottom";
} | null {
  if (!isFurnishingSurfaceId(surfaceId)) return null;
  const rest = surfaceId.slice(FURNISHING_ID_PREFIX.length);
  if (rest.endsWith(":body")) {
    return { furnishingId: rest.slice(0, -5), kind: "body" };
  }
  const snap = parseFurnishingFaceSnapSurfaceId(surfaceId);
  if (snap) {
    return { furnishingId: snap.furnishingId, kind: "snap", face: snap.face };
  }
  return null;
}

export function measurementForFurnishingSurfaceId(
  furnishings: Furnishing[],
  surfaceId: string,
  unit: UnitPreference,
): EditorHoverMeasurement | null {
  const parsed = parseFurnishingSurfaceId(surfaceId);
  if (!parsed) return null;
  const item = furnishings.find((entry) => entry.id === parsed.furnishingId);
  if (!item) return null;

  if (parsed.kind === "body") {
    return furnishingOverallMeasurement(item, unit);
  }

  if (parsed.kind === "snap" && parsed.face) {
    return measureFurnishingFaceSnap(item, parsed.face, unit);
  }

  return null;
}

export function furnishingOverallMeasurement(
  item: Furnishing,
  unit: UnitPreference,
): EditorHoverMeasurement {
  return {
    surfaceId: furnishingBodySurfaceId(item.id),
    category: "furnishing-face",
    title: item.label,
    caption: "Width × depth × height",
    dimensions: `${formatMm(item.widthMm, unit)} × ${formatMm(item.depthMm, unit)} × ${formatMm(item.heightMm, unit)}`,
  };
}
