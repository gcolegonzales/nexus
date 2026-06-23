"use client";

import { useRoomCoat } from "@/tools/room-coat/RoomCoatProvider";
import { PaintLibrary } from "@/tools/room-coat/components/PaintLibrary";
import { ToolSection } from "@/tools/room-coat/components/ToolSection";

export default function RoomCoatPaintsPage() {
  const { activeUnit } = useRoomCoat();

  return (
    <ToolSection
      title="Paint library"
      description={`Brand codes and swatches for ${activeUnit.name}. Assign them on the overview or in the surface paints tab.`}
    >
      <PaintLibrary unitName={activeUnit.name} />
    </ToolSection>
  );
}
