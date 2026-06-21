"use client";

import { defaultCoatAccordionTitle } from "@/tools/room-coat/lib/coat-labels";
import { useRoomCoat } from "@/tools/room-coat/RoomCoatProvider";
import { CoatAccordionCard } from "@/tools/room-coat/components/CoatAccordionCard";
import { CoatFieldsGrid } from "@/tools/room-coat/components/CoatFieldsGrid";
import { SpaceCoatAccordion } from "@/tools/room-coat/components/SpaceCoatAccordion";
import { Card } from "@nexus/ui";

export function CoatPlanPanel() {
  const {
    activeUnit,
    activePlacedRooms,
    activeHallways,
    activePaints,
    updateUnit,
    setHallwayCoat,
    setRoomCoat,
    setSurfaceOverride,
    clearSurfaceOverride,
  } = useRoomCoat();

  const hasSpaces =
    activePlacedRooms.length > 0 || activeHallways.length > 0;

  return (
    <div className="space-y-4">
      <CoatAccordionCard
        title={defaultCoatAccordionTitle(activeUnit.name)}
        description="Unit-wide defaults inherited by every room and hallway unless overridden."
      >
        <CoatFieldsGrid
          paints={activePaints}
          coat={activeUnit.defaultCoat}
          onChange={(coat) =>
            void updateUnit(activeUnit.id, { defaultCoat: coat })
          }
        />
      </CoatAccordionCard>

      {activeHallways.map((hallway) => (
        <SpaceCoatAccordion
          key={hallway.id}
          space={hallway}
          paints={activePaints}
          coat={hallway.coat}
          onCoatChange={(coat) => void setHallwayCoat(hallway.id, coat)}
          onSetOverride={(surfaceId, paintId) =>
            void setSurfaceOverride(hallway.id, surfaceId, paintId, "hallway")
          }
          onClearOverride={(surfaceId) =>
            void clearSurfaceOverride(hallway.id, surfaceId, "hallway")
          }
        />
      ))}

      {activePlacedRooms.map((room) => (
        <SpaceCoatAccordion
          key={room.placementId}
          space={room}
          paints={activePaints}
          coat={room.coat}
          onCoatChange={(coat) => void setRoomCoat(room.placementId, coat)}
          onSetOverride={(surfaceId, paintId) =>
            void setSurfaceOverride(
              room.placementId,
              surfaceId,
              paintId,
              "room",
            )
          }
          onClearOverride={(surfaceId) =>
            void clearSurfaceOverride(room.placementId, surfaceId, "room")
          }
        />
      ))}

      {!hasSpaces ? (
        <Card>
          <p className="text-sm text-muted">
            Add rooms or hallways in the editor above to plan paint for this
            unit.
          </p>
        </Card>
      ) : null}
    </div>
  );
}
