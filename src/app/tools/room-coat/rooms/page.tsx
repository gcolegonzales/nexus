"use client";

import { useState } from "react";
import { useRoomCoat } from "@/tools/room-coat/RoomCoatProvider";
import { AddRoomModal } from "@/tools/room-coat/components/AddRoomModal";
import { RoomCatalogCard } from "@/tools/room-coat/components/RoomCatalogCard";
import { ToolSection } from "@/tools/room-coat/components/ToolSection";
import { getUnitName } from "@/tools/room-coat/lib/unit-scope";
import { PrimaryButton } from "@nexus/next";

export default function RoomsCatalogPage() {
  const { state, activeUnit } = useRoomCoat();
  const [addModalOpen, setAddModalOpen] = useState(false);

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
      description={`Catalog for ${activeUnit.name}. Names and dimensions apply everywhere a room is placed.`}
      action={
        <PrimaryButton onClick={() => setAddModalOpen(true)}>Add room</PrimaryButton>
      }
    >
      {state.rooms.length === 0 ? (
        <p className="text-sm text-muted">
          No rooms yet. Add one to attach it to {activeUnit.name} and plan paint
          on the overview.
        </p>
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

      <AddRoomModal open={addModalOpen} onClose={() => setAddModalOpen(false)} />
    </ToolSection>
  );
}
