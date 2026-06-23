import { isPaintSurfaceOverride } from "@/tools/room-coat/lib/floor-finish-override";
import type {
  Door,
  Hallway,
  RoomCoat,
  SurfaceCategory,
  SurfaceDescriptor,
  Paint,
} from "@/tools/room-coat/types/state";

export const UNSET_PAINT_HEX = "#94a3b8";

export type PaintSource = "override" | "coat" | "unit-default" | "unset";

export interface ResolvedPaint {
  paint: Paint | null;
  source: PaintSource;
  hex: string;
}

interface PaintableSpace {
  coat: RoomCoat;
  surfaceOverrides: Record<string, string>;
  doors?: Door[];
}

function coatPaintIdForCategory(
  coat: RoomCoat,
  category: SurfaceCategory,
): string | null {
  switch (category) {
    case "wall":
      return coat.wallPaintId;
    case "baseboard":
      return coat.baseboardPaintId;
    case "ceiling":
      return coat.ceilingPaintId;
    case "door":
      return coat.doorPaintId;
    case "window":
      return null;
    case "floor":
      return null;
  }
}

function findPaint(paints: Paint[], paintId: string | null): Paint | null {
  if (!paintId) return null;
  return paints.find((paint) => paint.id === paintId) ?? null;
}

export function resolveSurfacePaint(
  space: PaintableSpace,
  surface: SurfaceDescriptor,
  paints: Paint[],
  unitDefaultCoat?: RoomCoat,
): ResolvedPaint {
  if (surface.category === "floor") {
    return { paint: null, source: "unset", hex: UNSET_PAINT_HEX };
  }

  const overrideId = space.surfaceOverrides[surface.id];

  if (isPaintSurfaceOverride(overrideId)) {
    const paint = findPaint(paints, overrideId);
    return {
      paint,
      source: "override",
      hex: paint?.hex ?? UNSET_PAINT_HEX,
    };
  }

  if (surface.category === "door" && surface.doorId && space.doors) {
    const door = space.doors.find((item) => item.id === surface.doorId);
    if (door?.overridePaintId) {
      const paint = findPaint(paints, door.overridePaintId);
      return {
        paint,
        source: "override",
        hex: paint?.hex ?? UNSET_PAINT_HEX,
      };
    }
  }

  const coatPaintId = coatPaintIdForCategory(space.coat, surface.category);
  const spacePaint = findPaint(paints, coatPaintId);

  if (spacePaint) {
    return { paint: spacePaint, source: "coat", hex: spacePaint.hex };
  }

  if (unitDefaultCoat) {
    const unitPaintId = coatPaintIdForCategory(
      unitDefaultCoat,
      surface.category,
    );
    const unitPaint = findPaint(paints, unitPaintId);
    if (unitPaint) {
      return {
        paint: unitPaint,
        source: "unit-default",
        hex: unitPaint.hex,
      };
    }
  }

  return { paint: null, source: "unset", hex: UNSET_PAINT_HEX };
}

export function formatPaintLabel(paint: Paint | null): string {
  if (!paint) return "Not set";
  const brand = paint.brand ? `${paint.brand} ` : "";
  const name = paint.name ? ` (${paint.name})` : "";
  return `${brand}${paint.code}${name}`.trim();
}
