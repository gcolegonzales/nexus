"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
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
import {
  getHighlightWallKeys,
  HallwayDrawVisuals,
  hallwaySuppressWallKey,
  OpenWallVisuals,
} from "@/tools/room-coat/components/editor/HallwayDraftVisuals";
import { useUnitEditor } from "@/tools/room-coat/components/editor/UnitEditorContext";
import { WallSurfaceLabels } from "@/tools/room-coat/components/editor/WallSurfaceLabels";

const MM_TO_M = 0.001;

function UnitEditorSceneInner() {
  const {
    state,
    activeUnit,
    activePlacedRooms,
    activeHallways,
    activePaints,
    selectedSurfaceId,
    setSelectedSurfaceId,
    moveRoom,
  } = useRoomCoat();

  const {
    tool,
    hallwayDraft,
    wallHover,
    setWallHover,
    openingAnchor,
    hoveredWallKey,
    setHoveredWallKey,
    selectedPlacementId,
    roomFlash,
    handleWallHit,
    handleHallwayWallHit,
    handleRoomSelect,
    updateWallPlacement,
    updateStartPullPreview,
    confirmEndWallPlacement,
    updatePathPreview,
    commitPathSegment,
    finishPlacementDrag,
    setHallwayOrbitEnabled,
    hallwayOrbitEnabled,
    setHoverMeasurement,
  } = useUnitEditor();

  const [movePreview, setMovePreview] = useState<
    Record<string, { xMm: number; zMm: number }>
  >({});
  const grabOffset = useRef({ xMm: 0, zMm: 0 });
  const orbit = useThree((state) => state.controls) as OrbitControlsImpl | null;

  useEffect(() => {
    if (orbit) orbit.enabled = hallwayOrbitEnabled;
  }, [hallwayOrbitEnabled, orbit]);

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

  const highlightWalls = useMemo(
    () => getHighlightWallKeys(hoveredWallKey),
    [hoveredWallKey],
  );

  const hallwayVisualsActive =
    tool === "hallway" && hallwayDraft.phase !== "idle";

  const suppressWallKey = hallwaySuppressWallKey(hallwayDraft);

  const disableOrbit = () => {
    if (orbit) orbit.enabled = false;
    setHallwayOrbitEnabled(false);
  };

  const enableOrbit = () => {
    if (orbit) orbit.enabled = true;
    setHallwayOrbitEnabled(true);
  };

  const hallwayMeshOptions = {
    showCeiling: state.viewSettings.showCeilings,
  };

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
        specs: buildHallwaySurfaceSpecs(hallway, hallwayMeshOptions),
      })),
    [activeHallways, meshOptions.showCeiling],
  );

  function roomOffset(
    placementId: string,
    base: [number, number, number],
  ): [number, number, number] {
    const preview = movePreview[placementId];
    if (!preview) return base;
    return [preview.xMm * MM_TO_M, base[1], preview.zMm * MM_TO_M];
  }

  return (
    <>
      <color attach="background" args={["#0f172a"]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[5, 8, 5]} intensity={1.1} />
      <directionalLight position={[-4, 3, -2]} intensity={0.35} />

      <gridHelper
        args={[Math.max(widthM, lengthM, 8) * 1.8, 30, "#334155", "#1e293b"]}
        position={[centerX, 0, centerZ]}
      />

      {roomGroups.map(({ room, offset, specs }) => {
        const displayOffset = roomOffset(room.placementId, offset);
        const selected = selectedPlacementId === room.placementId;
        const wallFlashKey =
          roomFlash?.placementId === room.placementId ? roomFlash.key : undefined;

        return (
          <group key={room.placementId} position={displayOffset}>
            <PaintableMeshes
              specs={specs}
              space={room}
              paints={activePaints}
              unitDefaultCoat={unitDefaultCoat(activeUnit)}
              selectedSurfaceId={selectedSurfaceId}
              showCeilings={state.viewSettings.showCeilings}
              editorTool={tool}
              hoveredWallKey={hoveredWallKey}
              highlightWallKeys={highlightWalls}
              raycastSuppressWallKey={suppressWallKey}
              roomMoveSelected={selected}
              wallFlashKey={wallFlashKey}
              unitPreference={state.unitPreference}
              onMeasureHover={setHoverMeasurement}
              onSelectSurface={setSelectedSurfaceId}
              onRoomWallHit={(hit) => {
                if (!hit) return;
                setHoveredWallKey(`${hit.placementId}:${hit.wall}`);
                handleWallHit(hit);
              }}
              onRoomWallHover={(hit) => {
                setHoveredWallKey(hit ? `${hit.placementId}:${hit.wall}` : null);
                setWallHover(hit ? { xMm: hit.xMm, zMm: hit.zMm } : null);
              }}
              onRoomBodyClick={() => handleRoomSelect(room.placementId)}
              onRoomBodyPointerDown={(worldXM, worldZM) => {
                if (!selected) return;
                if (orbit) orbit.enabled = false;
                const originXMm =
                  movePreview[room.placementId]?.xMm ?? room.originXMm;
                const originZMm =
                  movePreview[room.placementId]?.zMm ?? room.originZMm;
                grabOffset.current = {
                  xMm: originXMm - worldXM / MM_TO_M,
                  zMm: originZMm - worldZM / MM_TO_M,
                };
              }}
              onRoomBodyMove={(worldXM, worldZM) => {
                if (!selected) return;
                setMovePreview((current) => ({
                  ...current,
                  [room.placementId]: {
                    xMm: Math.round(worldXM / MM_TO_M + grabOffset.current.xMm),
                    zMm: Math.round(worldZM / MM_TO_M + grabOffset.current.zMm),
                  },
                }));
              }}
              onRoomBodyMoveEnd={(worldXM, worldZM) => {
                if (!selected) return;
                if (orbit) orbit.enabled = true;
                const xMm = Math.round(
                  worldXM / MM_TO_M + grabOffset.current.xMm,
                );
                const zMm = Math.round(
                  worldZM / MM_TO_M + grabOffset.current.zMm,
                );
                setMovePreview((current) => {
                  const { [room.placementId]: _, ...rest } = current;
                  return rest;
                });
                void moveRoom(room.placementId, xMm, zMm);
              }}
            />
            {state.viewSettings.showWallLabels && (
              <WallSurfaceLabels
                specs={specs}
                space={room}
                paints={activePaints}
                unitDefaultCoat={unitDefaultCoat(activeUnit)}
              />
            )}
          </group>
        );
      })}

      {hallwayGroups.map(({ hallway, specs }) => (
        <group key={hallway.id}>
          <PaintableMeshes
            specs={specs}
            space={hallway}
            paints={activePaints}
            unitDefaultCoat={unitDefaultCoat(activeUnit)}
            selectedSurfaceId={selectedSurfaceId}
            showCeilings={state.viewSettings.showCeilings}
            editorTool={tool}
            hoveredWallKey={hoveredWallKey}
            highlightWallKeys={highlightWalls}
            raycastSuppressWallKey={suppressWallKey}
            unitPreference={state.unitPreference}
            onMeasureHover={setHoverMeasurement}
            onSelectSurface={setSelectedSurfaceId}
            onHallwayWallHit={(hit) => {
              setHoveredWallKey(
                `${hit.hallway.id}:${hit.segIndex}:${hit.side}`,
              );
              handleHallwayWallHit(hit);
            }}
            onHallwayWallHover={(hit) => {
              setHoveredWallKey(
                hit ? `${hit.hallway.id}:${hit.segIndex}:${hit.side}` : null,
              );
              setWallHover(hit ? { xMm: hit.xMm, zMm: hit.zMm } : null);
            }}
          />
          {state.viewSettings.showWallLabels && (
            <WallSurfaceLabels
              specs={specs}
              space={hallway}
              paints={activePaints}
              unitDefaultCoat={unitDefaultCoat(activeUnit)}
            />
          )}
        </group>
      ))}

      {hallwayVisualsActive && (
        <HallwayDrawVisuals
          rooms={activePlacedRooms}
          hallways={activeHallways}
          draft={hallwayDraft}
          unitPreference={state.unitPreference}
          showCeilings={state.viewSettings.showCeilings}
          onPlacementChange={updateWallPlacement}
          onStartPullOut={updateStartPullPreview}
          onConfirmEndPlacement={confirmEndWallPlacement}
          onPathPreview={updatePathPreview}
          onPathCommit={commitPathSegment}
          onPlacementDragEnd={finishPlacementDrag}
          onPathDragEnd={() => {}}
          disableOrbit={disableOrbit}
          enableOrbit={enableOrbit}
        />
      )}

      {tool === "open-walls" && (
        <OpenWallVisuals
          rooms={activePlacedRooms}
          hover={wallHover}
          openingAnchor={openingAnchor}
          openingPreviewEnd={
            openingAnchor &&
            wallHover &&
            hoveredWallKey ===
              `${openingAnchor.placementId}:${openingAnchor.wall}`
              ? wallHover
              : null
          }
        />
      )}

      <OrbitControls
        makeDefault
        enabled={hallwayOrbitEnabled}
        target={[centerX, heightM / 2, centerZ]}
        maxPolarAngle={Math.PI / 2.05}
      />
    </>
  );
}

export function UnitEditorScene() {
  const { activePlacedRooms } = useRoomCoat();
  const bounds = unitBounds(activePlacedRooms);
  const widthM = (bounds.maxX - bounds.minX) * MM_TO_M;
  const lengthM = (bounds.maxZ - bounds.minZ) * MM_TO_M;
  const heightM =
    Math.max(...activePlacedRooms.map((room) => room.heightMm), 2438) * MM_TO_M;
  const centerX = ((bounds.minX + bounds.maxX) / 2) * MM_TO_M;
  const centerZ = ((bounds.minZ + bounds.maxZ) / 2) * MM_TO_M;
  const distance = cameraDistanceForBounds(widthM, lengthM, heightM);

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
      className="h-full w-full bg-background"
    >
      <UnitEditorSceneInner />
    </Canvas>
  );
}
