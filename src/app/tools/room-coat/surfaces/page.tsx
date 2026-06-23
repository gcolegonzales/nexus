"use client";

import {
  buildPaintScheduleForUnit,
  paintScheduleToCsv,
} from "@/tools/room-coat/lib/paint-schedule";
import { useRoomCoat } from "@/tools/room-coat/RoomCoatProvider";
import { SurfacePaintTable } from "@/tools/room-coat/components/SurfacePaintTable";
import { ToolSection } from "@/tools/room-coat/components/ToolSection";
import { downloadBlob } from "@/shared/download/downloadBlob";
import { Button } from "@nexus/next";

export default function RoomCoatSurfacesPage() {
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

  const hasSpaces =
    activePlacedRooms.length > 0 || activeHallways.length > 0;

  return (
    <ToolSection
      title="Surface paints"
      description={`Resolved color for every surface in ${activeUnit.name} — from unit defaults, room coats, or one-off overrides.`}
      action={
        <Button variant="secondary" onClick={exportCsv} disabled={!hasSpaces}>
          Export CSV
        </Button>
      }
    >
      <SurfacePaintTable />
    </ToolSection>
  );
}
