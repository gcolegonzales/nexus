"use client";

import { useMemo } from "react";
import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { buildHallwaySurfaceSpecs } from "@/tools/room-coat/lib/hallway-geometry";
import {
  buildRoomSurfaceSpecs,
  cameraDistanceForBounds,
  roomWorldOffsetM,
} from "@/tools/room-coat/lib/room-geometry";
import { unitBounds } from "@/tools/room-coat/lib/unit-layout";
import { useRoomCoat } from "@/tools/room-coat/RoomCoatProvider";
import { unitDefaultCoat } from "@/tools/room-coat/types/state";
import { PaintableMeshes } from "@/tools/room-coat/components/scene/PaintableMeshes";

const MM_TO_M = 0.001;

export function UnitScene() {
  const {
    state,
    activeUnit,
    activePlacedRooms,
    activeHallways,
    activePaints,
    selectedSurfaceId,
    setSelectedSurfaceId,
  } = useRoomCoat();

  const meshOptions = {
    showCeiling: state.viewSettings.showCeilings,
  };

  const bounds = unitBounds(activePlacedRooms);
  const widthM = (bounds.maxX - bounds.minX) * MM_TO_M;
  const lengthM = (bounds.maxZ - bounds.minZ) * MM_TO_M;
  const heightM =
    Math.max(...activePlacedRooms.map((room) => room.heightMm), 2438) * MM_TO_M;
  const centerX = ((bounds.minX + bounds.maxX) / 2) * MM_TO_M;
  const centerZ = ((bounds.minZ + bounds.maxZ) / 2) * MM_TO_M;
  const distance = cameraDistanceForBounds(widthM, lengthM, heightM);

  const roomGroups = useMemo(
    () =>
      activePlacedRooms.map((room) => ({
        room,
        offset: roomWorldOffsetM(room),
        specs: buildRoomSurfaceSpecs(room, meshOptions),
      })),
    [activePlacedRooms, meshOptions.showCeiling],
  );

  const hallwayGroups = useMemo(
    () =>
      activeHallways.map((hallway) => ({
        hallway,
        specs: buildHallwaySurfaceSpecs(hallway, meshOptions),
      })),
    [activeHallways, meshOptions.showCeiling],
  );

  return (
    <Canvas
      camera={{
        position: [
          centerX + distance * 0.8,
          distance * 0.65,
          centerZ + distance * 0.8,
        ],
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

      <gridHelper
        args={[Math.max(widthM, lengthM) * 1.8, 30, "#334155", "#1e293b"]}
        position={[centerX, 0, centerZ]}
      />

      {roomGroups.map(({ room, offset, specs }) => (
        <group key={room.placementId} position={offset}>
          <PaintableMeshes
            specs={specs}
            space={room}
            paints={activePaints}
            unitDefaultCoat={unitDefaultCoat(activeUnit)}
            selectedSurfaceId={selectedSurfaceId}
            showCeilings={state.viewSettings.showCeilings}
            onSelectSurface={setSelectedSurfaceId}
          />
        </group>
      ))}

      {hallwayGroups.map(({ hallway, specs }) => (
        <PaintableMeshes
          key={hallway.id}
          specs={specs}
          space={hallway}
          paints={activePaints}
          unitDefaultCoat={unitDefaultCoat(activeUnit)}
          selectedSurfaceId={selectedSurfaceId}
          showCeilings={state.viewSettings.showCeilings}
          onSelectSurface={setSelectedSurfaceId}
        />
      ))}

      <OrbitControls
        makeDefault
        target={[centerX, heightM / 2, centerZ]}
        maxPolarAngle={Math.PI / 2.05}
      />
    </Canvas>
  );
}
