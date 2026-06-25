"use client";

import { useRoomCoat } from "@/tools/room-coat/RoomCoatProvider";
import { Card } from "@nexus/ui";

/** Brief pointer to floor plan — attach/remove happens in FloorPlanEditor. */
export function AttachRoomPanel() {
  const { activePlacedRooms } = useRoomCoat();

  return (
    <Card className="space-y-2">
      <h3 className="text-lg font-semibold text-text">Rooms in Unit</h3>
      <p className="text-sm text-muted">
        {activePlacedRooms.length === 0
          ? "No rooms on this floor plan yet. Open the Floor plan section below, choose Add room, and pick from your catalog."
          : `${activePlacedRooms.length} room${activePlacedRooms.length === 1 ? "" : "s"} on the floor plan. Use Layout mode to drag them, Draw hallway for connections, or Open walls for open floor plans.`}
      </p>
    </Card>
  );
}
