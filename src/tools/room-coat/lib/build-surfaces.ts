import type {
  Hallway,
  PlacedRoom,
  SurfaceDescriptor,
  WallSide,
} from "@/tools/room-coat/types/state";
import { solidHallwayWallSegments } from "@/tools/room-coat/lib/hallway-openings";
import { solidWallSegments } from "@/tools/room-coat/lib/wall-openings";

const WALL_LABELS: Record<WallSide, string> = {
  north: "North wall",
  south: "South wall",
  east: "East wall",
  west: "West wall",
};

const WALL_SIDES: WallSide[] = ["north", "south", "east", "west"];

export function buildSurfacesForPlacedRoom(room: PlacedRoom): SurfaceDescriptor[] {
  const id = room.placementId;
  const surfaces: SurfaceDescriptor[] = [];

  for (const wall of WALL_SIDES) {
    const segments = solidWallSegments(room, wall);
    segments.forEach((segment, segIndex) => {
      const partial =
        segments.length > 1 || room.wallOpenings.some((o) => o.wall === wall);
      surfaces.push({
        id: `${id}:wall:${wall}:${segIndex}`,
        roomId: id,
        category: "wall",
        label: partial
          ? `${room.name} — ${WALL_LABELS[wall].toLowerCase()} (section ${segIndex + 1})`
          : `${room.name} — ${WALL_LABELS[wall].toLowerCase()}`,
      });
      surfaces.push({
        id: `${id}:baseboard:${wall}:${segIndex}`,
        roomId: id,
        category: "baseboard",
        label: `${room.name} — ${WALL_LABELS[wall].toLowerCase()} baseboard`,
      });
    });
  }

  surfaces.push({
    id: `${id}:ceiling`,
    roomId: id,
    category: "ceiling",
    label: `${room.name} — ceiling`,
  });

  for (const door of room.doors) {
    surfaces.push({
      id: `${id}:door:${door.id}`,
      roomId: id,
      category: "door",
      label: `${room.name} — door (${WALL_LABELS[door.wall].toLowerCase()})`,
      doorId: door.id,
    });
  }

  return surfaces;
}

export function buildSurfacesForHallway(hallway: Hallway): SurfaceDescriptor[] {
  const surfaces: SurfaceDescriptor[] = [];

  for (let i = 0; i < Math.max(0, hallway.waypointsMm.length - 1); i++) {
    const prefix = `${hallway.id}:seg:${i}`;
    for (const side of [0, 1] as const) {
      const segments = solidHallwayWallSegments(hallway, i, side);
      segments.forEach((segment, partIndex) => {
        const partSuffix = segments.length > 1 ? `:${partIndex}` : "";
        surfaces.push({
          id: `${prefix}:wall:${side}${partSuffix}`,
          hallwayId: hallway.id,
          category: "wall",
          label: `${hallway.name} — segment ${i + 1} wall ${side + 1}`,
        });
        surfaces.push({
          id: `${prefix}:baseboard:${side}${partSuffix}`,
          hallwayId: hallway.id,
          category: "baseboard",
          label: `${hallway.name} — segment ${i + 1} baseboard ${side + 1}`,
        });
      });
    }
    surfaces.push({
      id: `${prefix}:ceiling`,
      hallwayId: hallway.id,
      category: "ceiling",
      label: `${hallway.name} — segment ${i + 1} ceiling`,
    });
  }

  for (let i = 1; i < hallway.waypointsMm.length - 1; i++) {
    const prefix = `${hallway.id}:corner:${i}`;
    surfaces.push({
      id: `${prefix}:ceiling`,
      hallwayId: hallway.id,
      category: "ceiling",
      label: `${hallway.name} — corner ${i} ceiling`,
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
  }
}
