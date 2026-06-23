"use client";

import { useRoomCoat } from "@/tools/room-coat/RoomCoatProvider";
import { UnitEditor } from "@/tools/room-coat/components/editor/UnitEditor";
import { CoatPlanPanel } from "@/tools/room-coat/components/CoatPlanPanel";
import { ToolSection } from "@/tools/room-coat/components/ToolSection";

export default function RoomCoatOverviewPage() {
  const { activeUnit } = useRoomCoat();

  return (
    <ToolSection
      title="Overview"
      description={`Layout, hallways, and paint for ${activeUnit.name} — all in the 3D editor.`}
    >
      <div className="space-y-6">
        <UnitEditor />
        <CoatPlanPanel />
      </div>
    </ToolSection>
  );
}
