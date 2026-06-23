import { parseDoorSurfaceId } from "@/tools/room-coat/lib/door-draft";
import {
  parseRoomWallSurfaceId,
  roomWallHitFromOpeningCenter,
  type RoomWallHit,
} from "@/tools/room-coat/lib/editor-surfaces";
import { parseWindowSurfaceId } from "@/tools/room-coat/lib/window-surfaces";
import type { PlacedRoom } from "@/tools/room-coat/types/state";

export type ContextMenuTarget =
  | { kind: "room"; placementId: string; name: string }
  | { kind: "room-wall"; hit: RoomWallHit; roomName: string }
  | { kind: "furnishing"; furnishingId: string; label: string }
  | { kind: "door"; surfaceId: string; title: string; hit: RoomWallHit }
  | { kind: "window"; surfaceId: string; title: string; hit: RoomWallHit }
  | {
      kind: "surface";
      surfaceId: string;
      title: string;
      placementId?: string;
    }
  | { kind: "snap-point"; snapPointId: string; label: string }
  | { kind: "empty-floor"; xMm: number; zMm: number };

export interface ContextMenuState {
  clientX: number;
  clientY: number;
  target: ContextMenuTarget;
}

export type ContextMenuActionGroup = "edit" | "tools" | "add" | "remove";

export type ContextMenuActionId =
  | "move-room"
  | "resize-room"
  | "remove-room"
  | "draw-hallway"
  | "place-door-marker"
  | "open-wall"
  | "paint-surface"
  | "furnish-room"
  | "rotate-furnishing"
  | "edit-furnishing-dimensions"
  | "delete-furnishing"
  | "move-furnishing"
  | "draw-room"
  | "measure"
  | "place-floor-anchor"
  | "snap-point-tool"
  | "delete-snap-point"
  | "swap-door-hinges"
  | "swap-door-swing"
  | "move-door"
  | "remove-door"
  | "edit-door-dimensions"
  | "move-window"
  | "remove-window"
  | "edit-window-dimensions"
  | "add-door-here"
  | "add-window-here"
  | "tool-select"
  | "tool-move"
  | "tool-furnish"
  | "tool-measure"
  | "tool-paint"
  | "tool-snap-point";

export interface ContextMenuAction {
  id: ContextMenuActionId;
  label: string;
  group: ContextMenuActionGroup;
  destructive?: boolean;
}

function parseRoomSpaceSurfaceId(
  surfaceId: string,
): { placementId: string; category: "floor" | "ceiling" | "baseboard" } | null {
  const match = surfaceId.match(/^(.+):(floor|ceiling|baseboard)$/);
  if (!match) return null;
  return {
    placementId: match[1],
    category: match[2] as "floor" | "ceiling" | "baseboard",
  };
}

function wallPlacementActions(hit: RoomWallHit): ContextMenuAction[] {
  return [
    { id: "add-door-here", label: "Add door", group: "add" },
    { id: "add-window-here", label: "Add window", group: "add" },
    { id: "open-wall", label: "Add wall opening", group: "add" },
    { id: "draw-hallway", label: "Add hallway", group: "add" },
    { id: "place-door-marker", label: "Mark entrance (snap)", group: "add" },
  ];
}

function wallToolActions(): ContextMenuAction[] {
  return [
    { id: "tool-select", label: "Select", group: "tools" },
    { id: "measure", label: "Measure", group: "tools" },
    { id: "tool-paint", label: "Paint", group: "tools" },
    { id: "tool-snap-point", label: "Snap points", group: "tools" },
  ];
}

export function contextMenuTargetFromSurface(
  surfaceId: string,
  title: string,
  rooms: PlacedRoom[],
): ContextMenuTarget {
  const doorRef = parseDoorSurfaceId(surfaceId);
  if (doorRef) {
    const room = rooms.find((item) => item.placementId === doorRef.placementId);
    const door = room?.doors.find((item) => item.id === doorRef.doorId);
    if (room && door) {
      const hit = roomWallHitFromOpeningCenter(
        room,
        door.wallIndex,
        door.offsetFromCornerMm,
        door.widthMm,
      );
      if (hit) {
        return { kind: "door", surfaceId, title, hit };
      }
    }
  }

  const windowRef = parseWindowSurfaceId(surfaceId);
  if (windowRef) {
    const room = rooms.find(
      (item) => item.placementId === windowRef.placementId,
    );
    const window = room?.windows?.find((item) => item.id === windowRef.windowId);
    if (room && window) {
      const hit = roomWallHitFromOpeningCenter(
        room,
        window.wallIndex,
        window.offsetFromCornerMm,
        window.widthMm,
      );
      if (hit) {
        return { kind: "window", surfaceId, title, hit };
      }
    }
  }

  const roomSpace = parseRoomSpaceSurfaceId(surfaceId);
  if (roomSpace) {
    return {
      kind: "surface",
      surfaceId,
      title,
      placementId: roomSpace.placementId,
    };
  }

  const parsedWall = parseRoomWallSurfaceId(surfaceId);
  if (parsedWall) {
    return {
      kind: "surface",
      surfaceId,
      title,
      placementId: parsedWall.placementId,
    };
  }

  return { kind: "surface", surfaceId, title };
}

export function contextMenuActions(
  target: ContextMenuTarget,
): ContextMenuAction[] {
  switch (target.kind) {
    case "room":
      return [
        { id: "tool-select", label: "Select", group: "tools" },
        { id: "move-room", label: "Move room", group: "edit" },
        { id: "resize-room", label: "Edit dimensions", group: "edit" },
        { id: "tool-furnish", label: "Furnish", group: "tools" },
        { id: "measure", label: "Measure", group: "tools" },
        { id: "tool-paint", label: "Paint floor", group: "tools" },
        { id: "remove-room", label: "Remove from unit", group: "remove", destructive: true },
      ];
    case "room-wall":
      return [
        ...wallToolActions(),
        ...wallPlacementActions(target.hit),
      ];
    case "furnishing":
      return [
        { id: "tool-select", label: "Select", group: "tools" },
        { id: "move-furnishing", label: "Move furnishing", group: "edit" },
        { id: "edit-furnishing-dimensions", label: "Edit dimensions", group: "edit" },
        { id: "rotate-furnishing", label: "Rotate 90°", group: "edit" },
        { id: "tool-furnish", label: "Furnish", group: "tools" },
        { id: "delete-furnishing", label: "Delete", group: "remove", destructive: true },
      ];
    case "door":
      return [
        { id: "edit-door-dimensions", label: "Edit dimensions", group: "edit" },
        { id: "move-door", label: "Move door", group: "edit" },
        { id: "swap-door-hinges", label: "Swap hinges", group: "edit" },
        { id: "swap-door-swing", label: "Swap open direction", group: "edit" },
        { id: "tool-select", label: "Select", group: "tools" },
        { id: "measure", label: "Measure", group: "tools" },
        { id: "tool-paint", label: "Paint", group: "tools" },
        ...wallPlacementActions(target.hit),
        { id: "remove-door", label: "Remove door", group: "remove", destructive: true },
      ];
    case "window":
      return [
        { id: "edit-window-dimensions", label: "Edit dimensions", group: "edit" },
        { id: "move-window", label: "Move window", group: "edit" },
        { id: "tool-select", label: "Select", group: "tools" },
        { id: "measure", label: "Measure", group: "tools" },
        ...wallPlacementActions(target.hit),
        { id: "remove-window", label: "Remove window", group: "remove", destructive: true },
      ];
    case "surface": {
      const roomSpace = parseRoomSpaceSurfaceId(target.surfaceId);
      if (roomSpace?.category === "floor" && target.placementId) {
        return [
          { id: "tool-select", label: "Select", group: "tools" },
          { id: "tool-move", label: "Move rooms", group: "tools" },
          { id: "resize-room", label: "Edit room dimensions", group: "edit" },
          { id: "tool-furnish", label: "Furnish", group: "tools" },
          { id: "measure", label: "Measure", group: "tools" },
          { id: "tool-paint", label: "Paint", group: "tools" },
        ];
      }
      if (roomSpace?.category === "ceiling") {
        return [
          { id: "tool-select", label: "Select", group: "tools" },
          { id: "tool-paint", label: "Paint", group: "tools" },
        ];
      }
      if (roomSpace?.category === "baseboard") {
        return [
          { id: "tool-select", label: "Select", group: "tools" },
          { id: "tool-paint", label: "Paint", group: "tools" },
        ];
      }
      return [
        { id: "tool-select", label: "Select", group: "tools" },
        { id: "tool-paint", label: "Paint", group: "tools" },
      ];
    }
    case "snap-point":
      return [
        { id: "tool-snap-point", label: "Snap points", group: "tools" },
        { id: "delete-snap-point", label: "Delete pin", group: "remove", destructive: true },
      ];
    case "empty-floor":
      return [
        { id: "draw-room", label: "Add room", group: "add" },
        { id: "measure", label: "Measure", group: "tools" },
        { id: "place-floor-anchor", label: "Place snap pin", group: "add" },
        { id: "tool-snap-point", label: "Snap points", group: "tools" },
      ];
  }
}

export function contextMenuTitle(target: ContextMenuTarget): string {
  switch (target.kind) {
    case "room":
      return target.name;
    case "room-wall":
      return `${target.roomName} wall`;
    case "furnishing":
      return target.label;
    case "door":
    case "window":
    case "surface":
      return target.title;
    case "snap-point":
      return target.label;
    case "empty-floor":
      return "Floor";
  }
}
