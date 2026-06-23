"use client";

import { useMemo } from "react";
import { FloorOrbitControls } from "@/tools/room-coat/components/scene/FloorOrbitControls";
import { Canvas } from "@react-three/fiber";
import { buildHallwaySurfaceSpecs } from "@/tools/room-coat/lib/hallway-geometry";
import {
  allFloorsBounds,
  computeFloorDisplayLayout,
  floorDisplayOffsetM,
  floorLocalGridBounds,
  furnishingsOnFloor,
  hallwaysOnFloor,
  maxRoomHeightMmOnFloor,
  placedRoomsOnFloor,
  viewBoundsForFloorContent,
} from "@/tools/room-coat/lib/floor-utils";
import {
  buildRoomSurfaceSpecs,
  cameraViewFromBounds,
  roomWorldOffsetM,
} from "@/tools/room-coat/lib/room-geometry";
import { useRoomCoat } from "@/tools/room-coat/RoomCoatProvider";
import { unitDefaultCoat } from "@/tools/room-coat/types/state";
import { FloorIslandGrid } from "@/tools/room-coat/components/scene/FloorIslandGrid";
import { PaintableMeshes } from "@/tools/room-coat/components/scene/PaintableMeshes";
import { FurnishingMesh } from "@/tools/room-coat/components/scene/LayoutMeshes";

const MM_TO_M = 0.001;

export function UnitScene() {
  const {
    state,
    activeUnit,
    activeFloor,
    unitFloors,
    allPlacedRooms,
    allHallways,
    activePaints,
    selectedSurfaceId,
    setSelectedSurfaceId,
  } = useRoomCoat();

  const meshOptions = {
    showCeiling: state.viewSettings.showCeilings,
  };

  const floorLayout = useMemo(
    () =>
      computeFloorDisplayLayout(
        activeUnit.id,
        unitFloors,
        allPlacedRooms,
        allHallways,
      ),
    [activeUnit.id, unitFloors, allPlacedRooms, allHallways],
  );

  const floorCameraView = useMemo(() => {
    if (!activeFloor) {
      const bounds = allFloorsBounds(
        activeUnit.id,
        unitFloors,
        allPlacedRooms,
        allHallways,
      );
      return cameraViewFromBounds(
        bounds,
        Math.max(...allPlacedRooms.map((room) => room.heightMm), 2438),
      );
    }
    return cameraViewFromBounds(
      viewBoundsForFloorContent(
        activeUnit.id,
        activeFloor.id,
        unitFloors,
        allPlacedRooms,
        allHallways,
      ),
      maxRoomHeightMmOnFloor(allPlacedRooms, activeFloor.id),
    );
  }, [activeFloor, activeUnit.id, allHallways, allPlacedRooms, unitFloors]);

  const floorGroups = useMemo(
    () =>
      unitFloors.map((floor) => {
        const floorRooms = placedRoomsOnFloor(allPlacedRooms, floor.id);
        const floorHallways = hallwaysOnFloor(allHallways, floor.id);
        const floorFurnishings = furnishingsOnFloor(state.furnishings, floor.id);
        const [offsetXM, offsetZM] = floorDisplayOffsetM(floor.id, floorLayout);
        const localBounds = floorLocalGridBounds(
          floor.id,
          allPlacedRooms,
          allHallways,
        );

        return {
          floor,
          offset: [offsetXM, 0, offsetZM] as [number, number, number],
          localBounds,
          rooms: floorRooms.map((room) => ({
            room,
            offset: roomWorldOffsetM(room),
            specs: buildRoomSurfaceSpecs(room, meshOptions),
          })),
          hallways: floorHallways.map((hallway) => ({
            hallway,
            specs: buildHallwaySurfaceSpecs(hallway, meshOptions),
          })),
          furnishings: floorFurnishings,
        };
      }),
    [
      allHallways,
      allPlacedRooms,
      floorLayout,
      meshOptions.showCeiling,
      state.furnishings,
      unitFloors,
    ],
  );

  return (
    <Canvas
      camera={{
        fov: 50,
        near: 0.1,
        far: 300,
      }}
      className="h-full w-full rounded-xl bg-background"
    >
      <color attach="background" args={["#0f172a"]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[5, 8, 5]} intensity={1.1} />
      <directionalLight position={[-4, 3, -2]} intensity={0.35} />

      {floorGroups.map(({ floor, offset, localBounds, rooms, hallways, furnishings }) => (
        <group key={floor.id} position={offset}>
          <FloorIslandGrid bounds={localBounds} />
          {rooms.map(({ room, offset: roomOffset, specs }) => (
            <group key={room.placementId} position={roomOffset}>
              <PaintableMeshes
                specs={specs}
                space={room}
                paints={activePaints}
                unitDefaultCoat={unitDefaultCoat(activeUnit)}
                selectedSurfaceId={selectedSurfaceId}
                showCeilings={state.viewSettings.showCeilings}
                showFloorGrid={state.viewSettings.showFloorGrid}
                unitPreference={state.unitPreference}
                onSelectSurface={setSelectedSurfaceId}
              />
            </group>
          ))}

          {hallways.map(({ hallway, specs }) => (
            <PaintableMeshes
              key={hallway.id}
              specs={specs}
              space={hallway}
              paints={activePaints}
              unitDefaultCoat={unitDefaultCoat(activeUnit)}
              selectedSurfaceId={selectedSurfaceId}
              showCeilings={state.viewSettings.showCeilings}
              showFloorGrid={state.viewSettings.showFloorGrid}
              unitPreference={state.unitPreference}
              onSelectSurface={setSelectedSurfaceId}
            />
          ))}

          {state.viewSettings.showFurnishings &&
            furnishings.map((item) => (
              <FurnishingMesh key={item.id} item={item} />
            ))}
        </group>
      ))}

      <FloorOrbitControls
        initialView={floorCameraView}
        resetKey={activeFloor?.id ?? "__all__"}
      />
    </Canvas>
  );
}
