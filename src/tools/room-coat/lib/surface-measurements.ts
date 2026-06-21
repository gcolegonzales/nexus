import {
  parseHallwayCornerSurfaceId,
  parseHallwaySurfaceId,
  parseRoomWallSurfaceId,
} from "@/tools/room-coat/lib/editor-surfaces";
import type { SurfaceMeshSpec } from "@/tools/room-coat/lib/room-geometry";
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
  title: string;
  caption: string;
  dimensions: string;
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
  return room.widthMm * room.lengthMm;
}

export function hallwayFloorAreaMm2(hallway: Hallway): number {
  const points = hallway.waypointsMm;
  if (points.length < 2) return 0;

  let area = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const lengthMm = Math.hypot(
      points[i + 1].xMm - points[i].xMm,
      points[i + 1].zMm - points[i].zMm,
    );
    area += lengthMm * hallway.widthMm;
  }

  for (let i = 1; i < points.length - 1; i++) {
    area += hallway.widthMm * hallway.widthMm;
  }

  return Math.round(area);
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
        return `${space.name} — floor`;
      case "ceiling":
        return `${space.name} — ceiling`;
      case "door":
        return `${space.name} — door`;
      case "wall":
      case "baseboard": {
        const parsed = parseRoomWallSurfaceId(spec.surfaceId);
        if (!parsed) return `${space.name} — ${spec.category}`;
        const wallName =
          parsed.wall.charAt(0).toUpperCase() + parsed.wall.slice(1);
        const partial = parsed.segIndex > 0 ? ` (section ${parsed.segIndex + 1})` : "";
        return `${space.name} — ${wallName.toLowerCase()} wall${partial}`;
      }
      default:
        return `${space.name} — ${spec.category}`;
    }
  }

  const hallway = space;
  const parsed = parseHallwaySurfaceId(spec.surfaceId);
  if (parsed) {
    if (parsed.category === "wall") {
      return `${hallway.name} — segment ${parsed.segIndex + 1} wall ${parsed.sideIndex + 1}`;
    }
    if (parsed.category === "baseboard") {
      return `${hallway.name} — segment ${parsed.segIndex + 1} baseboard ${parsed.sideIndex + 1}`;
    }
    if (parsed.category === "ceiling") {
      return `${hallway.name} — segment ${parsed.segIndex + 1} ceiling`;
    }
  }

  if (spec.category === "floor" || spec.category === "ceiling") {
    const corner = parseHallwayCornerSurfaceId(spec.surfaceId);
    if (corner) {
      return `${hallway.name} — corner ${corner.cornerIndex} ${spec.category}`;
    }
    const segMatch = spec.surfaceId.match(/:seg:(\d+):(floor|ceiling)$/);
    if (segMatch) {
      return `${hallway.name} — segment ${Number(segMatch[1]) + 1} ${segMatch[2]}`;
    }
  }

  return `${hallway.name} — ${spec.category}`;
}

export function formatSurfaceMeasurement(
  category: SurfaceMeshSpec["category"],
  { primaryMm, secondaryMm }: SurfaceDimensionsMm,
  unit: UnitPreference,
): string {
  switch (category) {
    case "wall":
    case "door":
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
      return "Length × height";
    case "baseboard":
      return "Length";
    case "floor":
      return "Width × length · area";
    case "ceiling":
      return "Width × length · area";
    case "door":
      return "Width × height";
    default:
      return "Dimensions";
  }
}

export function measureFromMeshSpec(
  spec: SurfaceMeshSpec,
  space: PlacedRoom | Hallway,
  unit: UnitPreference,
  surfaceLabel?: string,
): EditorHoverMeasurement {
  const dims = meshSpecDimensionsMm(spec);
  return {
    surfaceId: spec.surfaceId,
    title: resolveSurfaceTitle(spec, space, surfaceLabel),
    caption: surfaceMeasurementCaption(spec.category),
    dimensions: formatSurfaceMeasurement(spec.category, dims, unit),
  };
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
