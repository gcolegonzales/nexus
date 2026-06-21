"use client";

import { useState } from "react";
import { useRoomCoat } from "@/tools/room-coat/RoomCoatProvider";
import { ToolSection } from "@/tools/room-coat/components/ToolSection";
import { formatMm } from "@/tools/room-coat/lib/units";
import { getUnitName } from "@/tools/room-coat/lib/unit-scope";
import { Card } from "@nexus/ui";
import { Button, PrimaryButton } from "@nexus/next";

export default function RoomsCatalogPage() {
  const { state, activeUnit, addRoom, updateRoomName, deleteRoom } =
    useRoomCoat();
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
      description={`Room definitions for ${activeUnit.name}. New rooms are added to the catalog and attached to the active unit. Dimensions are fixed at creation.`}
      action={
        <PrimaryButton onClick={() => void handleAddRoom()}>Add room</PrimaryButton>
      }
    >
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-text">New room name</span>
          <input
            value={newRoomName}
            onChange={(event) => setNewRoomName(event.target.value)}
            className="w-full min-w-[12rem] rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>
      </div>

      {state.rooms.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">
            No rooms in your catalog yet. Add a room to attach it to{" "}
            {activeUnit.name} and plan paint on the overview.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {state.rooms.map((room) => {
            const attachedUnits = unitsForRoom(room.id);
            const inActiveUnit = state.placements.some(
              (placement) =>
                placement.roomId === room.id &&
                placement.unitId === activeUnit.id,
            );

            return (
              <Card key={room.id} className="flex flex-col gap-4">
                <div>
                  <input
                    value={room.name}
                    onChange={(event) =>
                      void updateRoomName(room.id, event.target.value)
                    }
                    className="w-full rounded-lg border border-transparent bg-transparent text-lg font-semibold text-text outline-none focus:border-border focus:bg-surface focus:px-2 focus:py-1"
                    aria-label="Room name"
                  />
                  <p className="mt-1 text-sm text-muted">
                    {formatMm(room.widthMm, state.unitPreference)} ×{" "}
                    {formatMm(room.lengthMm, state.unitPreference)} ×{" "}
                    {formatMm(room.heightMm, state.unitPreference)}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {attachedUnits.length === 0
                      ? "Not attached to any unit"
                      : `In ${attachedUnits.join(", ")}`}
                    {inActiveUnit ? " · on active unit" : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="danger"
                    onClick={() => {
                      if (
                        confirm(
                          `Delete "${room.name}" from the catalog? It will be removed from all units.`,
                        )
                      ) {
                        void deleteRoom(room.id);
                      }
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </ToolSection>
  );
}
