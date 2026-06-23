import type { EditorHoverMeasurement } from "@/tools/room-coat/lib/surface-measurements";
import { formatMm } from "@/tools/room-coat/lib/units";
import type { Furnishing, UnitPreference } from "@/tools/room-coat/types/state";

export type MainFurnishingFaceId =
  | "front"
  | "back"
  | "left"
  | "right"
  | "top"
  | "bottom";

export interface FurnishingFaceSnapPoint {
  face: MainFurnishingFaceId;
  xMm: number;
  zMm: number;
  label: string;
  surfaceId: string;
}

const FURNISHING_ID_PREFIX = "furnishing:";

const ALL_FURNISHING_FACES: MainFurnishingFaceId[] = [
  "front",
  "back",
  "left",
  "right",
  "top",
  "bottom",
];

function faceLabel(face: MainFurnishingFaceId): string {
  switch (face) {
    case "front":
      return "Front";
    case "back":
      return "Back";
    case "left":
      return "Left";
    case "right":
      return "Right";
    case "top":
      return "Top";
    case "bottom":
      return "Bottom";
  }
}

export function furnishingFaceSnapSurfaceId(
  furnishingId: string,
  face: MainFurnishingFaceId,
): string {
  return `${FURNISHING_ID_PREFIX}${furnishingId}:snap:${face}`;
}

export function parseFurnishingFaceSnapSurfaceId(surfaceId: string): {
  furnishingId: string;
  face: MainFurnishingFaceId;
} | null {
  if (!surfaceId.startsWith(FURNISHING_ID_PREFIX)) return null;
  const rest = surfaceId.slice(FURNISHING_ID_PREFIX.length);
  const match = rest.match(
    /^([^:]+):snap:(front|back|left|right|top|bottom)$/,
  );
  if (!match) return null;
  return {
    furnishingId: match[1]!,
    face: match[2] as MainFurnishingFaceId,
  };
}

/** Floor-plan world position of a face-center snap point. */
export function furnishingFaceSnapWorldMm(
  item: Furnishing,
  face: MainFurnishingFaceId,
): { xMm: number; zMm: number } {
  const halfW = item.widthMm / 2;
  const halfD = item.depthMm / 2;

  let localX = 0;
  let localZ = 0;
  switch (face) {
    case "front":
      localZ = halfD;
      break;
    case "back":
      localZ = -halfD;
      break;
    case "left":
      localX = -halfW;
      break;
    case "right":
      localX = halfW;
      break;
    case "top":
    case "bottom":
      break;
  }

  const rad = (item.rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const rotatedX = localX * cos - localZ * sin;
  const rotatedZ = localX * sin + localZ * cos;

  return {
    xMm: Math.round(item.centerXMm + rotatedX),
    zMm: Math.round(item.centerZMm + rotatedZ),
  };
}

export function buildFurnishingFaceSnapPoints(
  item: Furnishing,
): FurnishingFaceSnapPoint[] {
  return ALL_FURNISHING_FACES.map((face) => {
    const world = furnishingFaceSnapWorldMm(item, face);
    return {
      face,
      xMm: world.xMm,
      zMm: world.zMm,
      label: `${item.label} · ${faceLabel(face).toLowerCase()}`,
      surfaceId: furnishingFaceSnapSurfaceId(item.id, face),
    };
  });
}

/** Item-local meters for rendering a marker on the face center (group origin = item center). */
export function furnishingFaceSnapLocalM(
  widthM: number,
  heightM: number,
  depthM: number,
  face: MainFurnishingFaceId,
  outsetM = 0.02,
): [number, number, number] {
  const halfW = widthM / 2;
  const halfD = depthM / 2;
  switch (face) {
    case "front":
      return [0, 0, halfD + outsetM];
    case "back":
      return [0, 0, -halfD - outsetM];
    case "left":
      return [-halfW - outsetM, 0, 0];
    case "right":
      return [halfW + outsetM, 0, 0];
    case "top":
      return [0, heightM / 2 + outsetM, 0];
    case "bottom":
      return [0, -heightM / 2 - outsetM, 0];
  }
}

export function measureFurnishingFaceSnap(
  item: Furnishing,
  face: MainFurnishingFaceId,
  unit: UnitPreference,
): EditorHoverMeasurement {
  return {
    surfaceId: furnishingFaceSnapSurfaceId(item.id, face),
    category: "furnishing-face",
    title: `${item.label} — ${faceLabel(face)}`,
    caption: "Face snap · center",
    dimensions: `${formatMm(item.widthMm, unit)} × ${formatMm(item.depthMm, unit)} × ${formatMm(item.heightMm, unit)}`,
  };
}
