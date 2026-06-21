"use client";

import {
  buildPaintScheduleForUnit,
  paintScheduleToCsv,
} from "@/tools/room-coat/lib/paint-schedule";
import { useRoomCoat } from "@/tools/room-coat/RoomCoatProvider";
import { PaintScheduleTable } from "@/tools/room-coat/components/PaintScheduleTable";
import { ToolSection } from "@/tools/room-coat/components/ToolSection";
import { downloadBlob } from "@/shared/download/downloadBlob";
import { Button } from "@nexus/next";

export default function RoomCoatSchedulePage() {
  const { state, activeUnit, activePlacedRooms, activeHallways } =
    useRoomCoat();

  function exportCsv() {
    const rows = buildPaintScheduleForUnit(state, activeUnit);
    const csv = paintScheduleToCsv(rows);
    downloadBlob(
      csv,
      `room-coat-${activeUnit.name}-${new Date().toISOString().slice(0, 10)}.csv`,
      "text/csv",
    );
  }

  return (
    <ToolSection
      title="Paint schedule"
      description={`Every surface in ${activeUnit.name} with its resolved paint — from coat defaults or per-surface overrides.`}
      action={
        <Button
          variant="secondary"
          onClick={exportCsv}
          disabled={activePlacedRooms.length === 0 && activeHallways.length === 0}
        >
          Export CSV
        </Button>
      }
    >
      <PaintScheduleTable />
    </ToolSection>
  );
}
