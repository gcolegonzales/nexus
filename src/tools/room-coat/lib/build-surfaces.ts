import type {
  Hallway,
  PlacedRoom,
  SurfaceDescriptor,
} from "@/tools/room-coat/types/state";
import { solidHallwayWallSegments } from "@/tools/room-coat/lib/hallway-openings";
import {
  hallwayCornerCeilingLabel,
  hallwayBaseboardSurfaceLabel,
  hallwaySegmentCeilingLabel,
  hallwaySegmentFloorLabel,
  hallwaySegmentWallLabel,
  roomCeilingSurfaceLabel,
  roomDoorSurfaceLabel,
  roomWindowSurfaceLabel,
  roomFloorSurfaceLabel,
  roomBaseboardSurfaceLabel,
  roomWallSurfaceLabel,
  surfaceCategoryTitle,
} from "@/tools/room-coat/lib/surface-display-labels";
import { wallEdges, wallSolidSpans, wallStructureParts } from "@/tools/room-coat/lib/wall-openings";

export function buildSurfacesForPlacedRoom(room: PlacedRoom): SurfaceDescriptor[] {
  const id = room.placementId;
  const surfaces: SurfaceDescriptor[] = [];

  for (const edge of wallEdges(room)) {
    const spans = wallSolidSpans(room, edge.wallIndex);
    spans.forEach((span, segIndex) => {
      const hasPartial =
        spans.length > 1 ||
        room.wallOpenings.some((o) => o.wallIndex === edge.wallIndex) ||
        span.doors.length > 0;
      surfaces.push({
        id: `${id}:wall:${edge.wallIndex}:${segIndex}`,
        roomId: id,
        category: "wall",
        label: roomWallSurfaceLabel(
          room.name,
          edge.wallIndex,
          segIndex,
          hasPartial,
        ),
      });
    });

    const baseboardParts = wallStructureParts(room, edge.wallIndex);
    baseboardParts.forEach((part, segIndex) => {
      if (part.bottomMm > 1) return;
      surfaces.push({
        id: `${id}:baseboard:${edge.wallIndex}:${segIndex}`,
        roomId: id,
        category: "baseboard",
        label: roomBaseboardSurfaceLabel(room.name),
      });
    });
  }

  surfaces.push({
    id: `${id}:ceiling`,
    roomId: id,
    category: "ceiling",
    label: roomCeilingSurfaceLabel(room.name),
  });

  surfaces.push({
    id: `${id}:floor`,
    roomId: id,
    category: "floor",
    label: roomFloorSurfaceLabel(room.name),
  });

  for (const door of room.doors) {
    surfaces.push({
      id: `${id}:door:${door.id}`,
      roomId: id,
      category: "door",
      label: roomDoorSurfaceLabel(room.name, door.wallIndex),
      doorId: door.id,
    });
  }

  for (const window of room.windows ?? []) {
    surfaces.push({
      id: `${id}:window:${window.id}`,
      roomId: id,
      category: "window",
      label: roomWindowSurfaceLabel(room.name, window.wallIndex),
      windowId: window.id,
    });
  }

  return surfaces;
}

export function buildSurfacesForHallway(hallway: Hallway): SurfaceDescriptor[] {
  const surfaces: SurfaceDescriptor[] = [];

  for (let i = 0; i < Math.max(0, hallway.waypointsMm.length - 1); i++) {
    const prefix = `${hallway.id}:seg:${i}`;
    surfaces.push({
      id: `${prefix}:floor`,
      hallwayId: hallway.id,
      category: "floor",
      label: hallwaySegmentFloorLabel(hallway.name, i),
    });
    for (const side of [0, 1] as const) {
      const segments = solidHallwayWallSegments(hallway, i, side);
      segments.forEach((segment, partIndex) => {
        const partSuffix = segments.length > 1 ? `:${partIndex}` : "";
        surfaces.push({
          id: `${prefix}:wall:${side}${partSuffix}`,
          hallwayId: hallway.id,
          category: "wall",
          label: hallwaySegmentWallLabel(hallway.name, i, side),
        });
        surfaces.push({
          id: `${prefix}:baseboard:${side}${partSuffix}`,
          hallwayId: hallway.id,
          category: "baseboard",
          label: hallwayBaseboardSurfaceLabel(hallway.name),
        });
      });
    }
    surfaces.push({
      id: `${prefix}:ceiling`,
      hallwayId: hallway.id,
      category: "ceiling",
      label: hallwaySegmentCeilingLabel(hallway.name, i),
    });
  }

  for (let cornerIndex = 1; cornerIndex < hallway.waypointsMm.length - 1; cornerIndex++) {
    surfaces.push({
      id: `${hallway.id}:corner:${cornerIndex}:ceiling`,
      hallwayId: hallway.id,
      category: "ceiling",
      label: hallwayCornerCeilingLabel(hallway.name, cornerIndex),
    });
  }

  return surfaces;
}

export function findSurfaceInUnit(
  placedRooms: PlacedRoom[],
  hallways: Hallway[],
  surfaceId: string,
): { surface: SurfaceDescriptor; space: PlacedRoom | Hallway } | null {
  for (const room of placedRooms) {
    const surface = buildSurfacesForPlacedRoom(room).find(
      (item) => item.id === surfaceId,
    );
    if (surface) return { surface, space: room };
  }
  for (const hallway of hallways) {
    const surface = buildSurfacesForHallway(hallway).find(
      (item) => item.id === surfaceId,
    );
    if (surface) return { surface, space: hallway };
  }
  return null;
}

export function defaultCoatFieldLabel(
  category: SurfaceDescriptor["category"],
): string {
  switch (category) {
    case "wall":
      return "Default Wall";
    case "baseboard":
      return "Default Baseboard";
    case "ceiling":
      return "Default Ceiling";
    case "door":
      return "Default Door";
    case "window":
      return "Default Window";
    case "floor":
      return "Default Floor";
  }
}

export function coatCategoryLabel(
  category: SurfaceDescriptor["category"],
): string {
  switch (category) {
    case "wall":
      return "Walls";
    case "baseboard":
      return "Baseboards";
    case "ceiling":
      return "Ceiling";
    case "door":
      return "Doors";
    case "window":
      return "Windows";
    case "floor":
      return "Floor";
  }
}
