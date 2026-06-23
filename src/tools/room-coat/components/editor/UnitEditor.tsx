"use client";

import dynamic from "next/dynamic";
import { useMemo, useRef } from "react";
import { useRoomCoat } from "@/tools/room-coat/RoomCoatProvider";
import {
  canCompleteHallwayDraft,
} from "@/tools/room-coat/lib/hallway-draft";
import { formatMm } from "@/tools/room-coat/lib/units";
import { measurementForSurfaceId } from "@/tools/room-coat/lib/surface-measurements";
import {
  isFurnishingSurfaceId,
  measurementForFurnishingSurfaceId,
  furnishingOverallMeasurement,
} from "@/tools/room-coat/lib/furnishing-surfaces";
import { EditorCompactDimension } from "@/tools/room-coat/components/editor/EditorCompactDimension";
import { EditorDimensionEditPanel } from "@/tools/room-coat/components/editor/EditorDimensionEditPanel";
import { EditorDoorPanel } from "@/tools/room-coat/components/editor/EditorDoorPanel";
import { EditorWindowPanel } from "@/tools/room-coat/components/editor/EditorWindowPanel";
import {
  parseDoorSurfaceId,
} from "@/tools/room-coat/lib/door-draft";
import { parseWindowSurfaceId } from "@/tools/room-coat/lib/window-surfaces";
import { validateDoorPlacement } from "@/tools/room-coat/lib/door-placement";
import { validateWindowPlacement } from "@/tools/room-coat/lib/window-surfaces";
import {
  toggledHingeSide,
  toggledSwingInwardIfValid,
} from "@/tools/room-coat/lib/door-swing-analysis";
import { EditorInventory } from "@/tools/room-coat/components/editor/EditorInventory";
import { EditorSelectedItemPanel } from "@/tools/room-coat/components/editor/EditorSelectedItemPanel";
import { EditorFloorTabs } from "@/tools/room-coat/components/editor/EditorFloorTabs";
import { FurnishPalette } from "@/tools/room-coat/components/editor/FurnishPalette";
import { EditorFullscreenToggle } from "@/tools/room-coat/components/editor/EditorFullscreenToggle";
import { EditorToolbar } from "@/tools/room-coat/components/editor/EditorToolbar";
import { EditorContextMenu } from "@/tools/room-coat/components/editor/EditorContextMenu";
import { EditorSettingsPopover } from "@/tools/room-coat/components/editor/EditorSettingsPopover";
import { SurfaceInspector } from "@/tools/room-coat/components/SurfaceInspector";
import type { ContextMenuActionId, ContextMenuTarget } from "@/tools/room-coat/lib/editor-context-menu";
import type { RoomWallHit } from "@/tools/room-coat/lib/editor-surfaces";
import { TOOL_HINTS } from "@/tools/room-coat/lib/editor-surfaces";
import {
  defaultWallSnapLabel,
  snapPointFromRoomWallHit,
} from "@/tools/room-coat/lib/snap-point-utils";
import {
  EDITOR_CHROME,
  EDITOR_CHROME_MEASUREMENT,
  EDITOR_CHROME_MUTED,
  EDITOR_CLICKABLE,
  EDITOR_Z_CHROME,
} from "@/tools/room-coat/components/editor/editor-chrome";
import {
  UnitEditorProvider,
  useUnitEditor,
} from "@/tools/room-coat/components/editor/UnitEditorContext";
import { Badge, Card, ConfirmProvider, useConfirm } from "@nexus/ui";
import { Button } from "@nexus/next";

const UnitEditorScene = dynamic(
  () =>
    import("@/tools/room-coat/components/editor/UnitEditorScene").then(
      (mod) => mod.UnitEditorScene,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-950 text-sm text-slate-400">
        Loading editor…
      </div>
    ),
  },
);

function UnitEditorBody() {
  const {
    state,
    activeUnit,
    activeFloor,
    unitFloors,
    activePlacedRooms,
    allPlacedRooms,
    activeFurnishings,
    activeHallways,
    allHallways,
    detachRoomFromUnit,
    deleteHallway,
    updatePlacedRoomDimensions,
    setShowCeilings,
    setActiveFloorId,
    addFloor,
    removeSnapPoint,
    selectedSurfaceId,
    setSelectedSurfaceId,
    activeSnapPoints,
    addSnapPoint,
    deleteFurnishing,
    updateFurnishing,
    updateDoor,
    removeDoor,
    updateWindow,
    removeWindow,
  } = useRoomCoat();

  const {
    tool,
    setTool,
    hallwayDraft,
    openingAnchor,
    setHallwayWidthMm,
    finishHallway,
    resetHallwayDraft,
    cancelTool,
    confirmStartEntrance,
    focusRoomFromInventory,
    selectedPresetId,
    selectPlacementPreset,
    furnishMode,
    selectFurnishingForAdjust,
    snapPointPrompt,
    setSnapPointPrompt,
    selectedPlacementId,
    handleRoomSelect,
    clearSelection,
    contextMenu,
    closeContextMenu,
    beginToolAction,
    startHallwayFromWallHit,
    startOpenWallFromHit,
    startDoorFromWallHit,
    placeWindowFromWallHit,
    handleMeasureClick,
    snapMeasurePoint,
    measurePhase,
    measureStart,
    measureEnd,
    resetMeasure,
    exitMeasureTool,
    selectedFurnishingId,
    setSelectedFurnishingId,
    rotateFurnishing,
    dimensionEditTarget,
    startDimensionEdit,
    cancelDimensionEdit,
    roomDrawMode,
    setRoomDrawMode,
    roomAngleSnapMode,
    setRoomAngleSnapMode,
    hallwayAngleSnapMode,
    setHallwayAngleSnapMode,
    roomDrawSegmentLengthMm,
    setRoomDrawSegmentLengthMm,
    roomDrawInteriorAngleDeg,
    setRoomDrawInteriorAngleDeg,
    roomDrawWarnings,
  } = useUnitEditor();

  const confirm = useConfirm();

  const viewportRef = useRef<HTMLDivElement>(null);

  const canCreate = canCompleteHallwayDraft(
    activePlacedRooms,
    activeHallways,
    hallwayDraft,
  );

  const measureTapeDistanceMm = useMemo(() => {
    if (!measureStart || !measureEnd) return null;
    return Math.round(
      Math.hypot(measureEnd.xMm - measureStart.xMm, measureEnd.zMm - measureStart.zMm),
    );
  }, [measureEnd, measureStart]);

  const selectedMeasurement = useMemo(() => {
    if (selectedSurfaceId) {
      if (isFurnishingSurfaceId(selectedSurfaceId)) {
        const measurement = measurementForFurnishingSurfaceId(
          activeFurnishings,
          selectedSurfaceId,
          state.unitPreference,
        );
        if (measurement) return measurement;
      } else {
        return measurementForSurfaceId(
          allPlacedRooms,
          allHallways,
          selectedSurfaceId,
          state.unitPreference,
          { showCeiling: state.viewSettings.showCeilings },
        );
      }
    }
    if (selectedFurnishingId) {
      const item = activeFurnishings.find(
        (entry) => entry.id === selectedFurnishingId,
      );
      if (item) {
        return furnishingOverallMeasurement(item, state.unitPreference);
      }
    }
    return null;
  }, [
    activeFurnishings,
    allHallways,
    allPlacedRooms,
    selectedFurnishingId,
    selectedSurfaceId,
    state.unitPreference,
    state.viewSettings.showCeilings,
  ]);

  const selectedRoom = useMemo(
    () =>
      activePlacedRooms.find(
        (room) => room.placementId === selectedPlacementId,
      ) ?? null,
    [activePlacedRooms, selectedPlacementId],
  );

  const selectedFurnishing = useMemo(
    () =>
      activeFurnishings.find((item) => item.id === selectedFurnishingId) ?? null,
    [activeFurnishings, selectedFurnishingId],
  );

  const selectedDoorTarget = useMemo(
    () =>
      selectedSurfaceId ? parseDoorSurfaceId(selectedSurfaceId) : null,
    [selectedSurfaceId],
  );

  const selectedDoorRoom = useMemo(
    () =>
      selectedDoorTarget
        ? (activePlacedRooms.find(
            (room) => room.placementId === selectedDoorTarget.placementId,
          ) ?? null)
        : null,
    [activePlacedRooms, selectedDoorTarget],
  );

  const selectedDoor = useMemo(
    () =>
      selectedDoorRoom && selectedDoorTarget
        ? (selectedDoorRoom.doors.find(
            (door) => door.id === selectedDoorTarget.doorId,
          ) ?? null)
        : null,
    [selectedDoorRoom, selectedDoorTarget],
  );

  const selectedWindowTarget = useMemo(
    () =>
      selectedSurfaceId ? parseWindowSurfaceId(selectedSurfaceId) : null,
    [selectedSurfaceId],
  );

  const selectedWindowRoom = useMemo(
    () =>
      selectedWindowTarget
        ? (activePlacedRooms.find(
            (room) => room.placementId === selectedWindowTarget.placementId,
          ) ?? null)
        : null,
    [activePlacedRooms, selectedWindowTarget],
  );

  const selectedWindow = useMemo(
    () =>
      selectedWindowRoom && selectedWindowTarget
        ? (selectedWindowRoom.windows?.find(
            (window) => window.id === selectedWindowTarget.windowId,
          ) ?? null)
        : null,
    [selectedWindowRoom, selectedWindowTarget],
  );

  function startEditingSelectionDimensions() {
    if (selectedFurnishing) {
      startDimensionEdit({
        kind: "furnishing",
        furnishingId: selectedFurnishing.id,
      });
      return;
    }
    if (selectedRoom) {
      startDimensionEdit({
        kind: "room",
        placementId: selectedRoom.placementId,
      });
    }
  }

  const editDimensionsButton =
    !dimensionEditTarget && (selectedRoom || selectedFurnishing) ? (
      <Button
        variant="ghost"
        className={`!px-2.5 !py-1 text-sm ${EDITOR_CLICKABLE}`}
        onClick={startEditingSelectionDimensions}
      >
        Edit dimensions
      </Button>
    ) : null;

  const selectedFurnishingPanel = selectedFurnishing ? (
    <>
      <span className={`text-sm ${EDITOR_CHROME_MUTED}`}>
        {selectedFurnishing.label}
      </span>
      {editDimensionsButton}
      <Button
        variant="ghost"
        className={`!px-2.5 !py-1 text-sm ${EDITOR_CLICKABLE}`}
        onClick={rotateFurnishing}
      >
        Rotate 90°
      </Button>
    </>
  ) : null;

  function wallHitFromTarget(target: ContextMenuTarget): RoomWallHit | null {
    switch (target.kind) {
      case "room-wall":
      case "door":
      case "window":
        return target.hit;
      default:
        return null;
    }
  }

  function startMeasureFromHit(hit: RoomWallHit) {
    beginToolAction("measure", () => {
      const snapped = snapMeasurePoint(hit.xMm, hit.zMm);
      handleMeasureClick(snapped.xMm, snapped.zMm);
    });
  }

  function handleContextMenuAction(actionId: ContextMenuActionId) {
    if (!contextMenu) return;
    const target = contextMenu.target;
    const wallHit = wallHitFromTarget(target);

    switch (actionId) {
      case "move-room":
        if (target.kind === "room") {
          handleRoomSelect(target.placementId);
          beginToolAction("move");
        } else if (target.kind === "surface" && target.placementId) {
          handleRoomSelect(target.placementId);
          beginToolAction("move");
        }
        break;
      case "resize-room":
        if (target.kind === "room") {
          handleRoomSelect(target.placementId);
          startDimensionEdit({
            kind: "room",
            placementId: target.placementId,
          });
        } else if (target.kind === "surface" && target.placementId) {
          handleRoomSelect(target.placementId);
          startDimensionEdit({
            kind: "room",
            placementId: target.placementId,
          });
        }
        break;
      case "remove-room":
        if (target.kind === "room") {
          void confirm({
            title: "Remove from unit",
            message: `Remove ${target.name} from this unit? The room stays in your catalog.`,
            confirmLabel: "Remove",
            destructive: true,
          }).then((ok) => {
            if (ok) void detachRoomFromUnit(target.placementId);
          });
        }
        break;
      case "furnish-room":
        if (target.kind === "room") {
          handleRoomSelect(target.placementId);
          beginToolAction("furnish");
        }
        break;
      case "draw-hallway":
        if (wallHit) {
          beginToolAction("hallway", () => startHallwayFromWallHit(wallHit));
        }
        break;
      case "place-door-marker": {
        if (!wallHit) break;
        const room = activePlacedRooms.find(
          (entry) => entry.placementId === wallHit.placementId,
        );
        if (!room) break;
        void addSnapPoint({
          ...snapPointFromRoomWallHit(
            room,
            wallHit,
            defaultWallSnapLabel(activeSnapPoints, room.name),
          ),
        });
        break;
      }
      case "open-wall":
        if (wallHit) {
          beginToolAction("open-walls", () => startOpenWallFromHit(wallHit));
        }
        break;
      case "add-door-here":
        if (wallHit) {
          startDoorFromWallHit(wallHit);
        }
        break;
      case "add-window-here":
        if (wallHit) {
          placeWindowFromWallHit(wallHit);
        }
        break;
      case "paint-surface":
      case "tool-paint":
        if (target.kind === "surface" || target.kind === "door" || target.kind === "window") {
          setSelectedSurfaceId(target.surfaceId);
          beginToolAction("paint");
        } else if (target.kind === "room-wall") {
          setSelectedSurfaceId(
            `${target.hit.placementId}:wall:${target.hit.wallIndex}:${target.hit.segIndex ?? 0}`,
          );
          beginToolAction("paint");
        } else if (target.kind === "room") {
          setSelectedSurfaceId(`${target.placementId}:floor`);
          beginToolAction("paint");
        }
        break;
      case "tool-select":
        if (target.kind === "door" || target.kind === "window") {
          setSelectedSurfaceId(target.surfaceId);
          beginToolAction("select");
        } else if (target.kind === "surface") {
          if (target.placementId && target.surfaceId.endsWith(":floor")) {
            handleRoomSelect(target.placementId);
          } else {
            setSelectedSurfaceId(target.surfaceId);
          }
          beginToolAction("select");
        } else if (target.kind === "furnishing") {
          selectFurnishingForAdjust(target.furnishingId);
          beginToolAction("select");
        } else if (target.kind === "room") {
          handleRoomSelect(target.placementId);
          beginToolAction("select");
        }
        break;
      case "tool-move":
        if (target.kind === "room") {
          handleRoomSelect(target.placementId);
          beginToolAction("move");
        } else if (target.kind === "surface" && target.placementId) {
          handleRoomSelect(target.placementId);
          beginToolAction("move");
        } else if (target.kind === "door" || target.kind === "window") {
          setSelectedSurfaceId(target.surfaceId);
          beginToolAction("move");
        } else if (target.kind === "furnishing") {
          beginToolAction("move", () => {
            selectFurnishingForAdjust(target.furnishingId);
          });
        }
        break;
      case "tool-furnish":
        if (target.kind === "room") {
          handleRoomSelect(target.placementId);
          beginToolAction("furnish");
        } else if (target.kind === "furnishing") {
          beginToolAction("furnish", () => {
            selectFurnishingForAdjust(target.furnishingId);
          });
        } else if (target.kind === "surface" && target.placementId) {
          handleRoomSelect(target.placementId);
          beginToolAction("furnish");
        }
        break;
      case "tool-snap-point":
        beginToolAction("snap-point");
        break;
      case "rotate-furnishing":
        if (target.kind === "furnishing") {
          selectFurnishingForAdjust(target.furnishingId);
          rotateFurnishing();
        }
        break;
      case "edit-furnishing-dimensions":
        if (target.kind === "furnishing") {
          startDimensionEdit({
            kind: "furnishing",
            furnishingId: target.furnishingId,
          });
        }
        break;
      case "delete-furnishing":
        if (target.kind === "furnishing") {
          void confirm({
            title: "Delete furnishing",
            message: `Delete ${target.label}?`,
            confirmLabel: "Delete",
            destructive: true,
          }).then((ok) => {
            if (ok) {
              void deleteFurnishing(target.furnishingId);
              setSelectedFurnishingId(null);
            }
          });
        }
        break;
      case "move-furnishing":
        if (target.kind === "furnishing") {
          beginToolAction("move", () => {
            selectFurnishingForAdjust(target.furnishingId);
          });
        }
        break;
      case "draw-room":
        beginToolAction("add-room");
        break;
      case "measure":
        if (wallHit) {
          startMeasureFromHit(wallHit);
        } else if (target.kind === "empty-floor") {
          beginToolAction("measure", () => {
            const snapped = snapMeasurePoint(target.xMm, target.zMm);
            handleMeasureClick(snapped.xMm, snapped.zMm);
          });
        } else if (target.kind === "room") {
          const room = activePlacedRooms.find(
            (entry) => entry.placementId === target.placementId,
          );
          if (room) {
            beginToolAction("measure", () => {
              const snapped = snapMeasurePoint(room.originXMm, room.originZMm);
              handleMeasureClick(snapped.xMm, snapped.zMm);
            });
          }
        } else if (target.kind === "surface" && target.placementId) {
          const room = activePlacedRooms.find(
            (entry) => entry.placementId === target.placementId,
          );
          if (room) {
            beginToolAction("measure", () => {
              const snapped = snapMeasurePoint(room.originXMm, room.originZMm);
              handleMeasureClick(snapped.xMm, snapped.zMm);
            });
          }
        }
        break;
      case "tool-measure":
        if (wallHit) {
          startMeasureFromHit(wallHit);
        } else if (target.kind === "empty-floor") {
          beginToolAction("measure", () => {
            const snapped = snapMeasurePoint(target.xMm, target.zMm);
            handleMeasureClick(snapped.xMm, snapped.zMm);
          });
        }
        break;
      case "snap-point-tool":
        beginToolAction("snap-point");
        break;
      case "place-floor-anchor":
        if (target.kind === "empty-floor" && activeFloor) {
          beginToolAction("snap-point", () => {
            void addSnapPoint({
              kind: "floor",
              xMm: target.xMm,
              zMm: target.zMm,
              label: `Anchor ${
                activeSnapPoints.filter((point) => point.kind !== "wall").length +
                1
              }`,
              consumeOnPlace: true,
              floorId: activeFloor.id,
            });
          });
        }
        break;
      case "delete-snap-point":
        if (target.kind === "snap-point") {
          void confirm({
            title: "Delete pin",
            message: `Remove ${target.label}?`,
            confirmLabel: "Delete",
            destructive: true,
          }).then((ok) => {
            if (ok) void removeSnapPoint(target.snapPointId);
          });
        }
        break;
      case "edit-door-dimensions":
        if (target.kind === "door") {
          setSelectedSurfaceId(target.surfaceId);
          beginToolAction("select");
        }
        break;
      case "move-door":
        if (target.kind === "door") {
          setSelectedSurfaceId(target.surfaceId);
          beginToolAction("move");
        }
        break;
      case "swap-door-hinges":
        if (target.kind === "door") {
          const doorRef = parseDoorSurfaceId(target.surfaceId);
          const room = doorRef
            ? activePlacedRooms.find(
                (item) => item.placementId === doorRef.placementId,
              )
            : null;
          const door = room?.doors.find((item) => item.id === doorRef?.doorId);
          if (doorRef && door && room) {
            const nextHinge = toggledHingeSide(door);
            const candidate = { ...door, hingeSide: nextHinge };
            if (!validateDoorPlacement(room, candidate).valid) break;
            void updateDoor(doorRef.placementId, doorRef.doorId, {
              hingeSide: nextHinge,
            });
          }
        }
        break;
      case "swap-door-swing":
        if (target.kind === "door") {
          const doorRef = parseDoorSurfaceId(target.surfaceId);
          const room = doorRef
            ? activePlacedRooms.find(
                (item) => item.placementId === doorRef.placementId,
              )
            : null;
          const door = room?.doors.find((item) => item.id === doorRef?.doorId);
          if (doorRef && door && room) {
            const next = toggledSwingInwardIfValid(room, door);
            if (next !== null) {
              void updateDoor(doorRef.placementId, doorRef.doorId, {
                swingsInward: next,
              });
            }
          }
        }
        break;
      case "remove-door":
        if (target.kind === "door") {
          const doorRef = parseDoorSurfaceId(target.surfaceId);
          if (doorRef) {
            void removeDoor(doorRef.placementId, doorRef.doorId);
            setSelectedSurfaceId(null);
          }
        }
        break;
      case "edit-window-dimensions":
        if (target.kind === "window") {
          setSelectedSurfaceId(target.surfaceId);
          beginToolAction("select");
        }
        break;
      case "move-window":
        if (target.kind === "window") {
          setSelectedSurfaceId(target.surfaceId);
          beginToolAction("move");
        }
        break;
      case "remove-window":
        if (target.kind === "window") {
          const windowRef = parseWindowSurfaceId(target.surfaceId);
          if (windowRef) {
            void removeWindow(windowRef.placementId, windowRef.windowId);
            setSelectedSurfaceId(null);
          }
        }
        break;
    }
  }

  const contextualPanel =
    tool === "select" ? (
      selectedFurnishingPanel ??
      (selectedRoom ? (
        <>
          <span className={`text-sm ${EDITOR_CHROME_MUTED}`}>
            {selectedRoom.name}
          </span>
          {editDimensionsButton}
        </>
      ) : (
        <span className={`text-sm ${EDITOR_CHROME_MUTED}`}>
          Click to select · double-click for actions
        </span>
      ))
    ) : tool === "add-room" ? (
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {(
            [
              ["polygon", "Draw"],
              ["rectangle", "Square"],
              ["wall-chain", "Walls"],
            ] as const
          ).map(([mode, label]) => (
            <Button
              key={mode}
              variant={roomDrawMode === mode ? "primary" : "ghost"}
              className={`!px-2.5 !py-1 text-sm ${EDITOR_CLICKABLE}`}
              onClick={() => setRoomDrawMode(mode)}
            >
              {label}
            </Button>
          ))}
          <span className={`hidden sm:inline text-slate-600`} aria-hidden>
            |
          </span>
          {(
            [
              ["ortho", "90°"],
              ["45", "45°"],
              ["free", "Free"],
              ["off", "Off"],
            ] as const
          ).map(([mode, label]) => (
            <Button
              key={mode}
              variant={roomAngleSnapMode === mode ? "primary" : "ghost"}
              className={`!px-2 !py-1 text-xs ${EDITOR_CLICKABLE}`}
              onClick={() => setRoomAngleSnapMode(mode)}
            >
              {label}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <EditorCompactDimension
            label="Len"
            valueMm={roomDrawSegmentLengthMm ?? 0}
            unit={state.unitPreference}
            onChangeMm={(value) =>
              setRoomDrawSegmentLengthMm(value > 0 ? value : null)
            }
          />
          <EditorCompactDimension
            label="∠"
            valueMm={roomDrawInteriorAngleDeg ?? 90}
            unit={state.unitPreference}
            onChangeMm={(value) =>
              setRoomDrawInteriorAngleDeg(value > 0 ? value : null)
            }
          />
          <span className={`text-sm ${EDITOR_CHROME_MUTED}`}>
            Click corners · snap to points · Enter to finish
          </span>
          {roomDrawWarnings.length > 0 && (
            <span className="text-sm text-amber-300">{roomDrawWarnings[0]}</span>
          )}
        </div>
      </div>
    ) : tool === "move" ? (
      selectedDoor ? (
        <span className={`text-sm ${EDITOR_CHROME_MUTED}`}>
          Click a wall to reposition the door
        </span>
      ) : selectedWindow ? (
        <span className={`text-sm ${EDITOR_CHROME_MUTED}`}>
          Click a wall to reposition the window
        </span>
      ) : selectedFurnishing ? (
        <span className={`text-sm ${EDITOR_CHROME_MUTED}`}>
          Drag to reposition {selectedFurnishing.label}
        </span>
      ) : selectedRoom ? (
        <>
          <span className={`text-sm ${EDITOR_CHROME_MUTED}`}>
            {selectedRoom.name}
          </span>
          {editDimensionsButton}
        </>
      ) : (
        <span className={`text-sm ${EDITOR_CHROME_MUTED}`}>
          {TOOL_HINTS.move}
        </span>
      )
    ) : tool === "hallway" ? (
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {(
            [
              ["ortho", "90°"],
              ["45", "45°"],
              ["free", "Free"],
            ] as const
          ).map(([mode, label]) => (
            <Button
              key={mode}
              variant={hallwayAngleSnapMode === mode ? "primary" : "ghost"}
              className={`!px-2 !py-1 text-xs ${EDITOR_CLICKABLE}`}
              onClick={() => setHallwayAngleSnapMode(mode)}
            >
              {label}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {hallwayDraft.phase !== "idle" && (
            <>
              <Badge variant="sky">{hallwayDraft.points.length} pts</Badge>
              <EditorCompactDimension
                label="W"
                valueMm={hallwayDraft.widthMm}
                unit={state.unitPreference}
                onChangeMm={setHallwayWidthMm}
              />
            </>
          )}
          {hallwayDraft.phase === "placing-start" && (
            <Button
              variant="primary"
              className={`!px-2.5 !py-1 text-sm ${EDITOR_CLICKABLE}`}
              onClick={confirmStartEntrance}
            >
              Pick exit wall
            </Button>
          )}
          {hallwayDraft.phase === "pick-end" && (
            <Badge variant="sky">Entrance set — click exit wall</Badge>
          )}
          {hallwayDraft.phase === "align-exit" && (
            <Badge variant="sky">
              Align route — click green guide or drag purple arrow
            </Badge>
          )}
          <Button
            variant="primary"
            className={`!px-2.5 !py-1 text-sm ${EDITOR_CLICKABLE}`}
            disabled={!canCreate}
            onClick={() => void finishHallway()}
          >
            Create
          </Button>
          <Button
            variant="ghost"
            className={`!px-2.5 !py-1 text-sm ${EDITOR_CLICKABLE}`}
            onClick={resetHallwayDraft}
          >
            Restart
          </Button>
          <Button
            variant="ghost"
            className={`!px-2.5 !py-1 text-sm ${EDITOR_CLICKABLE}`}
            onClick={cancelTool}
          >
            Cancel
          </Button>
        </div>
      </div>
    ) : tool === "open-walls" && openingAnchor ? (
      <Badge variant="sky">First point set — click second point</Badge>
    ) : tool === "add-door" ? (
      <span className={`text-sm ${EDITOR_CHROME_MUTED}`}>
        Hover a wall to preview · click to place
      </span>
    ) : tool === "furnish" ? (
      selectedFurnishingPanel ?? (
        <span className={`text-sm ${EDITOR_CHROME_MUTED}`}>
          {furnishMode === "place"
            ? "Click floor to place · pick a preset to switch type"
            : "Drag to move"}
        </span>
      )
    ) : tool === "snap-point" ? (
      <span className={`text-sm ${EDITOR_CHROME_MUTED}`}>
        {measureStart && measureEnd
          ? "Click measure ends to pin · floor clicks snap to the tape"
          : "Click floor to place · click a pin to delete · drag pins to move"}
      </span>
    ) : tool === "measure" ? (
      <div className="flex flex-wrap items-center gap-2">
        <span className={`text-sm ${EDITOR_CHROME_MUTED}`}>
          {measurePhase === "idle"
            ? "Click to set the start point"
            : measurePhase === "awaiting-end"
              ? "Click to set the end point"
              : "Drag handles to adjust · switch tools to keep the tape visible"}
        </span>
        {measurePhase !== "idle" && (
          <Button
            variant="ghost"
            className={`!px-2.5 !py-1 text-sm ${EDITOR_CLICKABLE}`}
            onClick={resetMeasure}
          >
            Restart
          </Button>
        )}
        <Button
          variant="ghost"
          className={`!px-2.5 !py-1 text-sm ${EDITOR_CLICKABLE}`}
          onClick={() => {
            if (measurePhase === "awaiting-end") {
              resetMeasure();
            }
            exitMeasureTool();
          }}
        >
          {measurePhase === "complete" ? "Done" : "Cancel"}
        </Button>
      </div>
    ) : tool === "paint" ? (
      <span className={`text-sm ${EDITOR_CHROME_MUTED}`}>
        {selectedSurfaceId
          ? "Pick an override paint below"
          : TOOL_HINTS.paint}
      </span>
    ) : measureStart && measureEnd ? (
      <span className={`text-sm ${EDITOR_CHROME_MUTED}`}>
        Measure tape active · use Snap points to pin along it
      </span>
    ) : null;

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden p-0">
      <div
        ref={viewportRef}
        className={`relative w-full h-[min(62vh,660px)] min-h-[440px] max-h-[660px] bg-slate-950 [&:fullscreen]:aspect-auto [&:fullscreen]:h-full [&:fullscreen]:max-h-none [&:fullscreen]:min-h-0 ${
          tool !== "select" && tool !== "paint"
            ? "ring-2 ring-inset ring-sky-500/20"
            : tool === "paint"
              ? "ring-2 ring-inset ring-violet-500/25"
              : ""
        }`}
        data-fullscreen="false"
      >
        <UnitEditorScene />

        <EditorToolbar
          tool={tool}
          onToolChange={setTool}
          showCeilings={state.viewSettings.showCeilings}
          onShowCeilingsChange={(show) => void setShowCeilings(show)}
          onAddFloor={() => void addFloor()}
        >
          {contextualPanel}
        </EditorToolbar>

        <div
          className="pointer-events-none absolute right-2 top-2 flex flex-col items-end gap-1.5"
          style={{ zIndex: EDITOR_Z_CHROME }}
        >
          <div className="pointer-events-auto flex items-center gap-1.5">
            <EditorFullscreenToggle containerRef={viewportRef} />
            <EditorSettingsPopover />
          </div>
          <EditorFloorTabs
            floors={unitFloors}
            activeFloorId={activeFloor?.id ?? null}
            onSelectFloor={(floorId) => void setActiveFloorId(floorId)}
            onAddFloor={() => void addFloor()}
          />
          {tool === "furnish" && furnishMode === "place" && (
            <FurnishPalette
              selectedPresetId={selectedPresetId}
              onSelectPreset={selectPlacementPreset}
              unitPreference={state.unitPreference}
            />
          )}
        </div>

        {snapPointPrompt && (
          <div
            className="pointer-events-none absolute inset-x-0 top-16 flex justify-center px-4"
            style={{ zIndex: EDITOR_Z_CHROME }}
          >
            <div
              className={`pointer-events-auto max-w-md rounded-md border border-white/10 px-3 py-2 text-sm backdrop-blur-md ${EDITOR_CHROME}`}
            >
              <p className="text-slate-100">
                Placed {snapPointPrompt.furnishingLabel} on{" "}
                {snapPointPrompt.snapPointLabel ?? "snap point"}.
              </p>
              <p className={`mt-1 text-xs ${EDITOR_CHROME_MUTED}`}>
                Remove the snap anchor now that the item is placed?
              </p>
              <div className="mt-2 flex gap-2">
                <Button
                  variant="danger"
                  className={`!px-3 !py-1 text-sm ${EDITOR_CLICKABLE}`}
                  onClick={() => {
                    void removeSnapPoint(snapPointPrompt.snapPointId);
                    setSnapPointPrompt(null);
                  }}
                >
                  Remove anchor
                </Button>
                <Button
                  variant="secondary"
                  className={`!px-3 !py-1 text-sm ${EDITOR_CLICKABLE}`}
                  onClick={() => setSnapPointPrompt(null)}
                >
                  Keep anchor
                </Button>
              </div>
            </div>
          </div>
        )}

        <EditorInventory
          rooms={activePlacedRooms}
          hallways={activeHallways}
          onRoomFocus={focusRoomFromInventory}
          onRemoveRoom={(placementId, name) => {
            void confirm({
              title: "Remove from unit",
              message: `Remove ${name} from this unit? The room stays in your catalog.`,
              confirmLabel: "Remove",
              destructive: true,
            }).then((ok) => {
              if (ok) void detachRoomFromUnit(placementId);
            });
          }}
          onRemoveHallway={(id, name) => {
            void confirm({
              title: "Delete hallway",
              message: `Delete ${name}? This cannot be undone.`,
              confirmLabel: "Delete",
              destructive: true,
            }).then((ok) => {
              if (ok) void deleteHallway(id);
            });
          }}
        />

        {activePlacedRooms.length === 0 && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center"
            style={{ zIndex: EDITOR_Z_CHROME }}
          >
            <div
              className={`rounded-lg px-3 py-1.5 text-xs ${EDITOR_CHROME} ${EDITOR_CHROME_MUTED}`}
            >
              Add a room, then drag empty space to orbit · scroll to zoom
            </div>
          </div>
        )}

        {tool === "hallway" && activePlacedRooms.length > 0 && (
          <div
            className={`pointer-events-none absolute bottom-12 left-2.5 max-w-[min(calc(100%-120px),420px)] rounded-lg px-2.5 py-1.5 text-[11px] leading-snug ${EDITOR_CHROME} ${EDITOR_CHROME_MUTED}`}
            style={{ zIndex: EDITOR_Z_CHROME }}
          >
            Gold slide · cyan width · purple start · green confirm · Ctrl+Z · Esc
          </div>
        )}

        {measureStart && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-4"
            style={{ zIndex: EDITOR_Z_CHROME }}
          >
            <div
              className={`pointer-events-auto flex items-center gap-2 rounded-lg border border-sky-400/40 bg-zinc-950/95 px-3 py-1.5 shadow-lg shadow-black/50 backdrop-blur-sm ${EDITOR_CHROME}`}
            >
              <span className={EDITOR_CHROME_MEASUREMENT}>
                {measureTapeDistanceMm != null && measureTapeDistanceMm > 0
                  ? formatMm(measureTapeDistanceMm, state.unitPreference)
                  : "Measuring…"}
              </span>
              <Button
                variant="ghost"
                className={`!px-2 !py-0.5 text-xs ${EDITOR_CLICKABLE}`}
                onClick={() => {
                  resetMeasure();
                  if (tool === "measure") {
                    exitMeasureTool();
                  }
                }}
              >
                Clear
              </Button>
            </div>
          </div>
        )}

        <EditorContextMenu
          menu={contextMenu}
          containerRef={viewportRef}
          onClose={closeContextMenu}
          onAction={handleContextMenuAction}
        />
      </div>

      {tool === "paint" && (
        <div className="border-t border-zinc-600/35 bg-zinc-900/40 p-4">
          <SurfaceInspector />
        </div>
      )}
      </Card>

      <EditorSelectedItemPanel
        selected={selectedMeasurement}
        onClearSelection={clearSelection}
        dimensionEditSlot={
          selectedDoor && selectedDoorRoom && tool === "select" ? (
            <EditorDoorPanel
              mode="edit"
              room={selectedDoorRoom}
              draft={null}
              door={selectedDoor}
              unitPreference={state.unitPreference}
              onDraftChange={() => {}}
              onDoorChange={(patch) => {
                const next = { ...selectedDoor, ...patch };
                if (!validateDoorPlacement(selectedDoorRoom, next).valid) return;
                void updateDoor(
                  selectedDoorRoom.placementId,
                  selectedDoor.id,
                  patch,
                );
              }}
              onRemove={() => {
                void removeDoor(selectedDoorRoom.placementId, selectedDoor.id);
                setSelectedSurfaceId(null);
              }}
            />
          ) : selectedWindow && selectedWindowRoom && tool === "select" ? (
            <EditorWindowPanel
              room={selectedWindowRoom}
              window={selectedWindow}
              unitPreference={state.unitPreference}
              onWindowChange={(patch) => {
                const next = { ...selectedWindow, ...patch };
                if (!validateWindowPlacement(selectedWindowRoom, next).valid) {
                  return;
                }
                void updateWindow(
                  selectedWindowRoom.placementId,
                  selectedWindow.id,
                  patch,
                );
              }}
              onRemove={() => {
                void removeWindow(
                  selectedWindowRoom.placementId,
                  selectedWindow.id,
                );
                setSelectedSurfaceId(null);
              }}
            />
          ) : dimensionEditTarget ? (
            <EditorDimensionEditPanel
              target={dimensionEditTarget}
              room={
                dimensionEditTarget.kind === "room"
                  ? (activePlacedRooms.find(
                      (room) =>
                        room.placementId === dimensionEditTarget.placementId,
                    ) ?? null)
                  : null
              }
              furnishing={
                dimensionEditTarget.kind === "furnishing"
                  ? (activeFurnishings.find(
                      (item) => item.id === dimensionEditTarget.furnishingId,
                    ) ?? null)
                  : null
              }
              unitPreference={state.unitPreference}
              onRoomChange={(patch) => {
                if (dimensionEditTarget.kind !== "room") return;
                void updatePlacedRoomDimensions(
                  dimensionEditTarget.placementId,
                  patch,
                );
              }}
              onFurnishingChange={(patch) => {
                if (dimensionEditTarget.kind !== "furnishing") return;
                void updateFurnishing(
                  dimensionEditTarget.furnishingId,
                  patch,
                );
              }}
              onDone={cancelDimensionEdit}
            />
          ) : undefined
        }
      />
    </div>
  );
}

export function UnitEditor() {
  return (
    <ConfirmProvider>
      <UnitEditorProvider>
        <UnitEditorBody />
      </UnitEditorProvider>
    </ConfirmProvider>
  );
}
