"use client";

import { useState } from "react";
import { useRoomCoat } from "@/tools/room-coat/RoomCoatProvider";
import { RoomCatalogCard } from "@/tools/room-coat/components/RoomCatalogCard";
import { ToolSection } from "@/tools/room-coat/components/ToolSection";
import { getUnitName } from "@/tools/room-coat/lib/unit-scope";
import { Card, Input } from "@nexus/ui";
import { PrimaryButton } from "@nexus/next";

export default function RoomsCatalogPage() {
  const { state, activeUnit, addRoom } = useRoomCoat();
  const [newRoomName, setNewRoomName] = useState("Living room");

  async function handleAddRoom() {
    const name = newRoomName.trim() || "New room";
    await addRoom(name);
    setNewRoomName("Living room");
  }

  function unitsForRoom(roomId: string): string[] {
    const unitIds = new Set(
      state.placements
        .filter((placement) => placement.roomId === roomId)
        .map((placement) => placement.unitId),
    );
    return [...unitIds].map((id) => getUnitName(state, id));
  }

  return (
    <ToolSection
      title="Rooms"
      description={`Catalog rooms for ${activeUnit.name}. Edit names and dimensions here — updates apply everywhere the room is placed.`}
    >
      <Card className="mb-6 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-text">Add to catalog</h3>
          <p className="mt-1 text-sm text-muted">
            New rooms are created with default dimensions and attached to{" "}
            {activeUnit.name}. Adjust size after adding.
          </p>
        </div>
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            void handleAddRoom();
          }}
        >
          <Input
            label="Room name"
            value={newRoomName}
            onChange={(event) => setNewRoomName(event.target.value)}
            placeholder="Living room"
            className="sm:min-w-[16rem] sm:flex-1"
          />
          <PrimaryButton type="submit" className="sm:mb-0.5">
            Add room
          </PrimaryButton>
        </form>
      </Card>

      {state.rooms.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">
            No rooms in your catalog yet. Add a room above to attach it to{" "}
            {activeUnit.name} and plan paint on the overview.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {state.rooms.map((room) => (
            <RoomCatalogCard
              key={room.id}
              room={room}
              unitPreference={state.unitPreference}
              attachedUnits={unitsForRoom(room.id)}
              inActiveUnit={state.placements.some(
                (placement) =>
                  placement.roomId === room.id &&
                  placement.unitId === activeUnit.id,
              )}
            />
          ))}
        </div>
      )}
    </ToolSection>
  );
}
