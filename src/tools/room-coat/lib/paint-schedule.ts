import {
  buildSurfacesForHallway,
  buildSurfacesForPlacedRoom,
} from "@/tools/room-coat/lib/build-surfaces";
import {
  formatPaintLabel,
  resolveSurfacePaint,
  type PaintSource,
} from "@/tools/room-coat/lib/resolve-paint";
import {
  getHallwaysForUnit,
  resolvePlacedRooms,
} from "@/tools/room-coat/lib/unit-scope";
import type { HomeUnit, RoomCoatState } from "@/tools/room-coat/types/state";
import { unitDefaultCoat } from "@/tools/room-coat/types/state";

export interface PaintScheduleRow {
  spaceId: string;
  spaceName: string;
  spaceKind: "room" | "hallway";
  surfaceId: string;
  surfaceLabel: string;
  category: string;
  brand: string;
  code: string;
  name: string;
  source: PaintSource;
  unset: boolean;
}

export function buildPaintScheduleForUnit(
  state: RoomCoatState,
  unit: HomeUnit,
): PaintScheduleRow[] {
  const rows: PaintScheduleRow[] = [];
  const paints = unit.paints;
  const placedRooms = resolvePlacedRooms(state, unit.id);
  const hallways = getHallwaysForUnit(unit.id, state.hallways);

  for (const room of placedRooms) {
    for (const surface of buildSurfacesForPlacedRoom(room)) {
      if (surface.category === "floor") continue;
      const resolved = resolveSurfacePaint(
        room,
        surface,
        paints,
        unitDefaultCoat(unit),
      );
      rows.push({
        spaceId: room.placementId,
        spaceName: room.name,
        spaceKind: "room",
        surfaceId: surface.id,
        surfaceLabel: surface.label,
        category: surface.category,
        brand: resolved.paint?.brand ?? "",
        code: resolved.paint?.code ?? "",
        name: resolved.paint?.name ?? "",
        source: resolved.source,
        unset: resolved.paint === null,
      });
    }
  }

  for (const hallway of hallways) {
    for (const surface of buildSurfacesForHallway(hallway)) {
      if (surface.category === "floor") continue;
      const resolved = resolveSurfacePaint(
        hallway,
        surface,
        paints,
        unitDefaultCoat(unit),
      );
      rows.push({
        spaceId: hallway.id,
        spaceName: hallway.name,
        spaceKind: "hallway",
        surfaceId: surface.id,
        surfaceLabel: surface.label,
        category: surface.category,
        brand: resolved.paint?.brand ?? "",
        code: resolved.paint?.code ?? "",
        name: resolved.paint?.name ?? "",
        source: resolved.source,
        unset: resolved.paint === null,
      });
    }
  }

  return rows;
}

export function paintScheduleToCsv(rows: PaintScheduleRow[]): string {
  const header = [
    "Space",
    "Type",
    "Surface",
    "Category",
    "Brand",
    "Code",
    "Name",
    "Source",
    "Unset",
  ];

  const escape = (value: string) => {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const lines = [
    header.join(","),
    ...rows.map((row) =>
      [
        row.spaceName,
        row.spaceKind,
        row.surfaceLabel,
        row.category,
        row.brand,
        row.code,
        row.name,
        row.source,
        row.unset ? "yes" : "no",
      ]
        .map(escape)
        .join(","),
    ),
  ];

  return lines.join("\n");
}

export function paintLabelForRow(row: PaintScheduleRow): string {
  if (row.unset) return "Not set";
  const brand = row.brand ? `${row.brand} ` : "";
  const name = row.name ? ` (${row.name})` : "";
  return `${brand}${row.code}${name}`.trim();
}

export { formatPaintLabel };
