"use client";

import dynamic from "next/dynamic";
import { useMemo, useRef, useState } from "react";
import { useRoomCoat } from "@/tools/room-coat/RoomCoatProvider";
import {
  canCompleteHallwayDraft,
  draftDisplayPath,
} from "@/tools/room-coat/lib/hallway-draft";
import { formatArea, formatMm, totalAreaLabel } from "@/tools/room-coat/lib/units";
import {
  hallwayLastSegmentLengthMm,
  hallwayPathLengthMm,
  hallwaySegmentLengthMm,
  unitTotalFloorAreaMm2,
} from "@/tools/room-coat/lib/surface-measurements";
import { EditorCompactDimension } from "@/tools/room-coat/components/editor/EditorCompactDimension";
import { EditorInventory } from "@/tools/room-coat/components/editor/EditorInventory";
import {
  EditorMeasurementReadout,
  type EditorHallwayMeasurement,
} from "@/tools/room-coat/components/editor/EditorMeasurementReadout";
import { EditorFullscreenToggle } from "@/tools/room-coat/components/editor/EditorFullscreenToggle";
import { EditorToolbar } from "@/tools/room-coat/components/editor/EditorToolbar";
import { EditorSettingsPopover } from "@/tools/room-coat/components/editor/EditorSettingsPopover";
import {
  EDITOR_CHROME,
  EDITOR_CHROME_MUTED,
  EDITOR_CLICKABLE,
  EDITOR_INPUT,
} from "@/tools/room-coat/components/editor/editor-chrome";
import {
  UnitEditorProvider,
  useUnitEditor,
} from "@/tools/room-coat/components/editor/UnitEditorContext";
import { Badge, Card } from "@nexus/ui";
import { Button } from "@nexus/next";

const UnitEditorScene = dynamic(
  () =>
    import("@/tools/room-coat/components/editor/UnitEditorScene").then(
      (mod) => mod.UnitEditorScene,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[420px] items-center justify-center bg-slate-950 text-sm text-slate-400">
        Loading editor…
      </div>
    ),
  },
);

function UnitEditorBody() {
  const {
    state,
    activeUnit,
    activePlacedRooms,
    activeHallways,
    attachRoomToUnit,
    detachRoomFromUnit,
    deleteHallway,
    getAvailableRoomsForUnit,
    setShowCeilings,
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
    focusRoomFromInventory,
    hoverMeasurement,
  } = useUnitEditor();

  const available = getAvailableRoomsForUnit(activeUnit.id);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string>(
    () => available[0]?.id ?? "",
  );

  const canCreate = canCompleteHallwayDraft(
    activePlacedRooms,
    activeHallways,
    hallwayDraft,
  );

  const hallwayMeasurement = useMemo((): EditorHallwayMeasurement | null => {
    if (tool !== "hallway" || hallwayDraft.phase === "idle") return null;

    const path = draftDisplayPath(
      activePlacedRooms,
      activeHallways,
      hallwayDraft,
    );
    const unit = state.unitPreference;
    const width = formatMm(hallwayDraft.widthMm, unit);
    if (path.length < 2 && !hallwayDraft.preview) {
      return { width, length: "—", segment: undefined };
    }

    const length = formatMm(hallwayPathLengthMm(path), unit);

    let segment: string | undefined;
    if (hallwayDraft.preview && path.length >= 1) {
      const anchor = path[path.length - 1];
      const dx = Math.abs(hallwayDraft.preview.xMm - anchor.xMm);
      const dz = Math.abs(hallwayDraft.preview.zMm - anchor.zMm);
      const aligned =
        dx >= dz
          ? { xMm: hallwayDraft.preview.xMm, zMm: anchor.zMm }
          : { xMm: anchor.xMm, zMm: hallwayDraft.preview.zMm };
      segment = formatMm(hallwaySegmentLengthMm(anchor, aligned), unit);
    } else if (path.length >= 2) {
      segment = formatMm(hallwayLastSegmentLengthMm(path), unit);
    }

    return { width, length, segment };
  }, [
    activeHallways,
    activePlacedRooms,
    hallwayDraft,
    state.unitPreference,
    tool,
  ]);

  const totalFloorArea = useMemo(() => {
    const areaMm2 = unitTotalFloorAreaMm2(activePlacedRooms, activeHallways);
    return formatArea(areaMm2, state.unitPreference);
  }, [activeHallways, activePlacedRooms, state.unitPreference]);

  const contextualPanel =
    tool === "add-room" ? (
      available.length === 0 ? (
        <span className={`text-xs ${EDITOR_CHROME_MUTED}`}>
          {state.rooms.length === 0
            ? "Create rooms on the Rooms tab first."
            : "All catalog rooms are already in this unit."}
        </span>
      ) : (
        <>
          <select
            className={`min-w-[160px] flex-1 ${EDITOR_INPUT}`}
            value={selectedRoomId || available[0]?.id || ""}
            onChange={(event) => setSelectedRoomId(event.target.value)}
          >
            {available.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name} ({formatMm(room.widthMm, state.unitPreference)} ×{" "}
                {formatMm(room.lengthMm, state.unitPreference)})
              </option>
            ))}
          </select>
          <Button
            variant="primary"
            className={`!px-2.5 !py-0.5 text-xs ${EDITOR_CLICKABLE}`}
            onClick={() => {
              const roomId = selectedRoomId || available[0]?.id;
              if (roomId) void attachRoomToUnit(roomId);
            }}
          >
            Add
          </Button>
        </>
      )
    ) : tool === "hallway" ? (
      <>
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
        <Button
          variant="primary"
          className={`!px-2.5 !py-0.5 text-xs ${EDITOR_CLICKABLE}`}
          disabled={!canCreate}
          onClick={() => void finishHallway()}
        >
          Create
        </Button>
        <Button
          variant="ghost"
          className={`!px-2 !py-0.5 text-xs ${EDITOR_CLICKABLE}`}
          onClick={resetHallwayDraft}
        >
          Restart
        </Button>
        <Button
          variant="ghost"
          className={`!px-2 !py-0.5 text-xs ${EDITOR_CLICKABLE}`}
          onClick={cancelTool}
        >
          Cancel
        </Button>
      </>
    ) : tool === "open-walls" && openingAnchor ? (
      <Badge variant="sky">First point set — click second point</Badge>
    ) : null;

  return (
    <Card className="overflow-hidden p-0">
      <div
        ref={viewportRef}
        className={`relative h-[min(72vh,640px)] min-h-[420px] bg-slate-950 [&:fullscreen]:h-full [&:fullscreen]:min-h-0 ${
          tool !== "paint" ? "ring-2 ring-inset ring-sky-500/20" : ""
        }`}
        data-fullscreen="false"
      >
        <UnitEditorScene />

        <EditorToolbar
          tool={tool}
          onToolChange={setTool}
          showCeilings={state.viewSettings.showCeilings}
          onShowCeilingsChange={(show) => void setShowCeilings(show)}
        >
          {contextualPanel}
        </EditorToolbar>

        <div className="pointer-events-none absolute right-2 top-2 z-10 flex items-center gap-1.5">
          <div className="pointer-events-auto">
            <EditorFullscreenToggle containerRef={viewportRef} />
          </div>
          <EditorSettingsPopover />
        </div>

        <div className="pointer-events-none absolute bottom-2.5 left-2.5 z-10 max-w-[min(calc(100%-5rem),280px)]">
          <EditorMeasurementReadout
            totalAreaLabel={totalAreaLabel(state.unitPreference)}
            totalArea={totalFloorArea}
            hover={hoverMeasurement}
            hallway={hallwayMeasurement}
          />
        </div>

        <EditorInventory
          rooms={activePlacedRooms}
          hallways={activeHallways}
          onRoomFocus={focusRoomFromInventory}
          onRemoveRoom={(placementId, name) => {
            if (confirm(`Remove ${name} from this unit?`)) {
              void detachRoomFromUnit(placementId);
            }
          }}
          onRemoveHallway={(id, name) => {
            if (confirm(`Remove ${name}?`)) {
              void deleteHallway(id);
            }
          }}
        />

        {activePlacedRooms.length === 0 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
            <div
              className={`rounded-lg px-3 py-1.5 text-xs ${EDITOR_CHROME} ${EDITOR_CHROME_MUTED}`}
            >
              Add a room, then drag empty space to orbit · scroll to zoom
            </div>
          </div>
        )}

        {tool === "hallway" && activePlacedRooms.length > 0 && (
          <div
            className={`pointer-events-none absolute bottom-24 left-2.5 max-w-[min(calc(100%-120px),420px)] rounded-lg px-2.5 py-1.5 text-[11px] leading-snug ${EDITOR_CHROME} ${EDITOR_CHROME_MUTED}`}
          >
            Gold slide · cyan width · purple start · green confirm · Ctrl+Z · Esc
          </div>
        )}
      </div>
    </Card>
  );
}

export function UnitEditor() {
  return (
    <UnitEditorProvider>
      <UnitEditorBody />
    </UnitEditorProvider>
  );
}
