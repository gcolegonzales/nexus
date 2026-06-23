import {
  parseHallwayCornerSurfaceId,
  parseHallwaySurfaceId,
  parseRoomWallSurfaceId,
} from "@/tools/room-coat/lib/editor-surfaces";
import type { SurfaceMeshSpec } from "@/tools/room-coat/lib/room-geometry";
import { buildHallwaySurfaceSpecs, hallwayFloorAreaMm2 as hallwayFloorAreaFromGeometry } from "@/tools/room-coat/lib/hallway-geometry";
import { buildRoomSurfaceSpecs } from "@/tools/room-coat/lib/room-geometry";
import {
  buildSurfacesForHallway,
  buildSurfacesForPlacedRoom,
} from "@/tools/room-coat/lib/build-surfaces";
import {
  hallwayCornerCeilingLabel,
  hallwayCornerSurfaceLabel,
  hallwaySegmentCeilingLabel,
  hallwaySegmentFloorLabel,
  hallwaySegmentWallLabel,
  meshCategoryTitle,
  roomCeilingSurfaceLabel,
  roomDoorSurfaceLabel,
  roomFloorSurfaceLabel,
  roomWallSurfaceLabel,
  surfaceCategoryTitle,
} from "@/tools/room-coat/lib/surface-display-labels";
import {
  boundsFromVertices,
  polygonAreaMm2,
  roomVertices,
} from "@/tools/room-coat/lib/room-shape";
import { formatArea, formatMm } from "@/tools/room-coat/lib/units";
import type {
  Hallway,
  HallwayWaypoint,
  PlacedRoom,
  UnitPreference,
} from "@/tools/room-coat/types/state";

const MM_TO_M = 0.001;

export interface SurfaceDimensionsMm {
  primaryMm: number;
  secondaryMm: number;
}

export interface EditorHoverMeasurement {
  surfaceId: string;
  category: SurfaceMeshSpec["category"] | "furnishing-face";
  title: string;
  caption: string;
  dimensions: string;
  /** World-space raycast hit (meters) for anchoring the in-scene label. */
  anchorM?: [number, number, number];
}

export function meshSpecDimensionsMm(spec: SurfaceMeshSpec): SurfaceDimensionsMm {
  const [aM, bM] = spec.size;
  return {
    primaryMm: Math.round(aM / MM_TO_M),
    secondaryMm: Math.round(bM / MM_TO_M),
  };
}

export function surfaceAreaMm2(
  primaryMm: number,
  secondaryMm: number,
): number {
  return primaryMm * secondaryMm;
}

export function roomFloorAreaMm2(room: PlacedRoom): number {
  const vertices = roomVertices(room);
  if (room.closed && vertices.length >= 3) {
    return polygonAreaMm2(vertices);
  }
  return room.widthMm * room.lengthMm;
}

export function hallwayFloorAreaMm2(hallway: Hallway): number {
  return hallwayFloorAreaFromGeometry(hallway);
}

export function unitTotalFloorAreaMm2(
  rooms: PlacedRoom[],
  hallways: Hallway[],
): number {
  let total = 0;
  for (const room of rooms) {
    total += roomFloorAreaMm2(room);
  }
  for (const hallway of hallways) {
    total += hallwayFloorAreaMm2(hallway);
  }
  return total;
}

function resolveSurfaceTitle(
  spec: SurfaceMeshSpec,
  space: PlacedRoom | Hallway,
  surfaceLabel?: string,
): string {
  if (surfaceLabel) return surfaceLabel;

  if ("placementId" in space) {
    switch (spec.category) {
      case "floor":
        return roomFloorSurfaceLabel(space.name);
      case "ceiling":
        return roomCeilingSurfaceLabel(space.name);
      case "door":
        return surfaceCategoryTitle("door");
      case "window":
        return surfaceCategoryTitle("window");
      case "baseboard":
        return surfaceCategoryTitle("baseboard");
      case "wall": {
        const parsed = parseRoomWallSurfaceId(spec.surfaceId);
        if (!parsed) return surfaceCategoryTitle("wall");
        return roomWallSurfaceLabel(
          space.name,
          parsed.wallIndex,
          parsed.segIndex,
          parsed.segIndex > 0,
        );
      }
      default:
        return surfaceCategoryTitle(spec.category);
    }
  }

  const hallway = space;
  const parsed = parseHallwaySurfaceId(spec.surfaceId);
  if (parsed) {
    if (parsed.category === "wall") {
      return hallwaySegmentWallLabel(
        hallway.name,
        parsed.segIndex,
        parsed.sideIndex,
      );
    }
    if (parsed.category === "baseboard") {
      return surfaceCategoryTitle("baseboard");
    }
    if (parsed.category === "ceiling") {
      return hallwaySegmentCeilingLabel(hallway.name, parsed.segIndex);
    }
  }

  if (spec.category === "floor" || spec.category === "ceiling") {
    const corner = parseHallwayCornerSurfaceId(spec.surfaceId);
    if (corner) {
      return hallwayCornerSurfaceLabel(
        hallway.name,
        corner.cornerIndex,
        spec.category,
      );
    }
    const segMatch = spec.surfaceId.match(/:seg:(\d+):(floor|ceiling)$/);
    if (segMatch) {
      const segIndex = Number(segMatch[1]);
      if (segMatch[2] === "floor") {
        return hallwaySegmentFloorLabel(hallway.name, segIndex);
      }
      return hallwaySegmentCeilingLabel(hallway.name, segIndex);
    }
  }

  if (spec.category === "ceiling") {
    const corner = parseHallwayCornerSurfaceId(spec.surfaceId);
    if (corner) {
      return hallwayCornerCeilingLabel(hallway.name, corner.cornerIndex);
    }
  }

  return meshCategoryTitle(spec.category);
}

export function formatSurfaceMeasurement(
  category: SurfaceMeshSpec["category"],
  { primaryMm, secondaryMm }: SurfaceDimensionsMm,
  unit: UnitPreference,
): string {
  switch (category) {
    case "wall":
    case "door":
    case "window":
      return `${formatMm(primaryMm, unit)} × ${formatMm(secondaryMm, unit)}`;
    case "baseboard":
      return formatMm(primaryMm, unit);
    case "floor":
    case "ceiling": {
      const area = formatArea(surfaceAreaMm2(primaryMm, secondaryMm), unit);
      return `${formatMm(primaryMm, unit)} × ${formatMm(secondaryMm, unit)} · ${area}`;
    }
    default:
      return `${formatMm(primaryMm, unit)} × ${formatMm(secondaryMm, unit)}`;
  }
}

export function surfaceMeasurementCaption(
  category: SurfaceMeshSpec["category"],
): string {
  switch (category) {
    case "wall":
      return "Length × Height";
    case "baseboard":
      return "Length";
    case "floor":
      return "Width × Length · Area";
    case "ceiling":
      return "Width × Length · Area";
    case "door":
      return "Width × Height";
    case "window":
      return "Width × Height";
    default:
      return "Dimensions";
  }
}

export function measureFromMeshSpec(
  spec: SurfaceMeshSpec,
  space: PlacedRoom | Hallway,
  unit: UnitPreference,
  surfaceLabel?: string,
  anchorM?: [number, number, number],
): EditorHoverMeasurement {
  const dims = meshSpecDimensionsMm(spec);
  let dimensions = formatSurfaceMeasurement(spec.category, dims, unit);

  if (
    (spec.category === "floor" || spec.category === "ceiling") &&
    spec.polygonLocalM &&
    "placementId" in space
  ) {
    const vertices = roomVertices(space);
    const bounds = boundsFromVertices(vertices);
    const polygonDims: SurfaceDimensionsMm = {
      primaryMm: Math.round(bounds.widthMm),
      secondaryMm: Math.round(bounds.lengthMm),
    };
    const areaMm2 = polygonAreaMm2(vertices);
    dimensions = `${formatMm(polygonDims.primaryMm, unit)} × ${formatMm(polygonDims.secondaryMm, unit)} · ${formatArea(areaMm2, unit)}`;
  }

  return {
    surfaceId: spec.surfaceId,
    category: spec.category,
    title: resolveSurfaceTitle(spec, space, surfaceLabel),
    caption: surfaceMeasurementCaption(spec.category),
    dimensions,
    anchorM,
  };
}

export function measurementForSurfaceId(
  rooms: PlacedRoom[],
  hallways: Hallway[],
  surfaceId: string,
  unit: UnitPreference,
  options: { showCeiling: boolean },
): EditorHoverMeasurement | null {
  for (const room of rooms) {
    const specs = buildRoomSurfaceSpecs(room, {
      showCeiling: options.showCeiling,
    });
    const spec = specs.find((item) => item.surfaceId === surfaceId);
    if (!spec) continue;
    const surface = buildSurfacesForPlacedRoom(room).find(
      (item) => item.id === surfaceId,
    );
    return measureFromMeshSpec(spec, room, unit, surface?.label);
  }

  for (const hallway of hallways) {
    const specs = buildHallwaySurfaceSpecs(hallway, {
      showCeiling: options.showCeiling,
    });
    const spec = specs.find((item) => item.surfaceId === surfaceId);
    if (!spec) continue;
    const surface = buildSurfacesForHallway(hallway).find(
      (item) => item.id === surfaceId,
    );
    return measureFromMeshSpec(spec, hallway, unit, surface?.label);
  }

  return null;
}

export function meshSpecForSurfaceId(
  rooms: PlacedRoom[],
  hallways: Hallway[],
  surfaceId: string,
  options: { showCeiling: boolean },
): { spec: SurfaceMeshSpec; space: PlacedRoom | Hallway } | null {
  for (const room of rooms) {
    const specs = buildRoomSurfaceSpecs(room, {
      showCeiling: options.showCeiling,
    });
    const spec = specs.find((item) => item.surfaceId === surfaceId);
    if (spec) return { spec, space: room };
  }

  for (const hallway of hallways) {
    const specs = buildHallwaySurfaceSpecs(hallway, {
      showCeiling: options.showCeiling,
    });
    const spec = specs.find((item) => item.surfaceId === surfaceId);
    if (spec) return { spec, space: hallway };
  }

  return null;
}

export function hallwayPathLengthMm(points: HallwayWaypoint[]): number {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(
      points[i].xMm - points[i - 1].xMm,
      points[i].zMm - points[i - 1].zMm,
    );
  }
  return Math.round(total);
}

export function hallwayLastSegmentLengthMm(points: HallwayWaypoint[]): number {
  if (points.length < 2) return 0;
  const start = points[points.length - 2];
  const end = points[points.length - 1];
  return Math.round(Math.hypot(end.xMm - start.xMm, end.zMm - start.zMm));
}

export function hallwaySegmentLengthMm(
  from: HallwayWaypoint,
  to: HallwayWaypoint,
): number {
  return Math.round(Math.hypot(to.xMm - from.xMm, to.zMm - from.zMm));
}
