"use client";

import { findSurfaceInUnit } from "@/tools/room-coat/lib/build-surfaces";
import { useRoomCoat } from "@/tools/room-coat/RoomCoatProvider";
import { SurfacePaintControls } from "@/tools/room-coat/components/SurfacePaintControls";
import { Card } from "@nexus/ui";

export function SurfaceInspector() {
  const { selectedSurfaceId, allPlacedRooms, allHallways } = useRoomCoat();

  if (!selectedSurfaceId) {
    return (
      <Card className="w-full">
        <p className="text-sm text-muted">
          Click any surface in the 3D view — floor, wall, ceiling, baseboard, or
          door — to inspect paint and set overrides.
        </p>
      </Card>
    );
  }

  const match = findSurfaceInUnit(
    allPlacedRooms,
    allHallways,
    selectedSurfaceId,
  );

  if (!match) {
    return (
      <Card className="w-full">
        <p className="text-sm text-muted">Selected surface not found.</p>
      </Card>
    );
  }

  return (
    <Card className="w-full space-y-4">
      <SurfacePaintControls surfaceId={selectedSurfaceId} showHeader />
    </Card>
  );
}
