"use client";

import { EditorCompactDimension } from "@/tools/room-coat/components/editor/EditorCompactDimension";
import {
  EDITOR_CHROME,
  EDITOR_CHROME_MUTED,
  EDITOR_CLICKABLE,
} from "@/tools/room-coat/components/editor/editor-chrome";
import { wallSegmentByIndex } from "@/tools/room-coat/lib/wall-openings";
import { clampOpeningOffset } from "@/tools/room-coat/lib/openings-layout";
import { canDoorSwingInward } from "@/tools/room-coat/lib/door-swing-analysis";
import { validateDoorPlacement } from "@/tools/room-coat/lib/door-placement";
import { isDoorDraftValid, type DoorDraft } from "@/tools/room-coat/lib/door-draft";
import type { Door, DoorHingeSide, PlacedRoom, UnitPreference } from "@/tools/room-coat/types/state";
import { Button } from "@nexus/next";

interface EditorDoorPanelProps {
  mode: "draft" | "edit";
  room: PlacedRoom;
  draft: DoorDraft | null;
  door: Door | null;
  unitPreference: UnitPreference;
  onDraftChange: (patch: Partial<DoorDraft>) => void;
  onDoorChange: (patch: Partial<Door>) => void;
  onConfirm?: () => void;
  onCancel?: () => void;
  onRemove?: () => void;
}

function hingeLabel(side: DoorHingeSide): string {
  return side === "left" ? "Left jamb" : "Right jamb";
}

export function EditorDoorPanel({
  mode,
  room,
  draft,
  door,
  unitPreference,
  onDraftChange,
  onDoorChange,
  onConfirm,
  onCancel,
  onRemove,
}: EditorDoorPanelProps) {
  const config = mode === "draft" ? draft : door;
  if (!config) return null;

  const edge = wallSegmentByIndex(room, config.wallIndex);
  const wallLengthMm = edge?.lengthMm ?? 0;

  function update(patch: Partial<DoorDraft & Door>) {
    if (mode === "draft") {
      onDraftChange(patch);
      return;
    }
    onDoorChange(patch);
  }

  function setOffsetFromCenter(centerMm: number) {
    if (!edge || !config) return;
    update({
      offsetFromCornerMm: clampOpeningOffset(
        wallLengthMm,
        config.widthMm,
        centerMm,
      ),
    });
  }

  function setSwingInward(swingsInward: boolean) {
    if (!config) return;
    if (!canDoorSwingInward(room, config, swingsInward)) return;
    update({ swingsInward });
  }

  const canSwingIn = canDoorSwingInward(room, config, true);
  const canSwingOut = canDoorSwingInward(room, config, false);

  const placementCheck =
    mode === "draft" && draft
      ? isDoorDraftValid(room, draft)
        ? { valid: true as const }
        : validateDoorPlacement(room, draft)
      : door
        ? validateDoorPlacement(room, door)
        : { valid: false as const, reason: "Door not found" };

  const hingeSide = config.hingeSide ?? "left";
  const swingsInward = config.swingsInward !== false;

  return (
    <div
      className={`pointer-events-auto mt-2 rounded-lg border border-amber-500/35 bg-zinc-900/95 px-3 py-2.5 ${EDITOR_CHROME}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-wide text-amber-300">
            {mode === "draft" ? "Place door" : "Door settings"}
          </div>
          <div className="text-sm font-medium text-zinc-100">
            {room.name} · Wall {config.wallIndex + 1}
          </div>
        </div>
        {mode === "draft" ? (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              className={`!px-2.5 !py-1 text-sm ${EDITOR_CLICKABLE}`}
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className={`!px-2.5 !py-1 text-sm ${EDITOR_CLICKABLE}`}
              disabled={!placementCheck.valid}
              onClick={onConfirm}
            >
              Place
            </Button>
          </div>
        ) : (
          <Button
            variant="danger"
            className={`!px-2.5 !py-1 text-sm ${EDITOR_CLICKABLE}`}
            onClick={onRemove}
          >
            Remove
          </Button>
        )}
      </div>

      <div className={`flex flex-col gap-2 ${EDITOR_CHROME_MUTED}`}>
        <EditorCompactDimension
          label="Width"
          valueMm={config.widthMm}
          unit={unitPreference}
          variant="panel"
          onChangeMm={(widthMm) => {
            const centerMm =
              config.offsetFromCornerMm + config.widthMm / 2;
            update({
              widthMm,
              offsetFromCornerMm: edge
                ? clampOpeningOffset(wallLengthMm, widthMm, centerMm)
                : config.offsetFromCornerMm,
            });
          }}
        />
        <EditorCompactDimension
          label="Height"
          valueMm={config.heightMm}
          unit={unitPreference}
          variant="panel"
          onChangeMm={(heightMm) => update({ heightMm })}
        />
        <EditorCompactDimension
          label="Along wall"
          valueMm={config.offsetFromCornerMm + config.widthMm / 2}
          unit={unitPreference}
          variant="panel"
          onChangeMm={setOffsetFromCenter}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant={hingeSide === "left" ? "primary" : "ghost"}
          className={`!px-2.5 !py-1 text-xs ${EDITOR_CLICKABLE}`}
          onClick={() => update({ hingeSide: "left" })}
        >
          {hingeLabel("left")}
        </Button>
        <Button
          variant={hingeSide === "right" ? "primary" : "ghost"}
          className={`!px-2.5 !py-1 text-xs ${EDITOR_CLICKABLE}`}
          onClick={() => update({ hingeSide: "right" })}
        >
          {hingeLabel("right")}
        </Button>
        <Button
          variant={swingsInward ? "primary" : "ghost"}
          className={`!px-2.5 !py-1 text-xs ${EDITOR_CLICKABLE}`}
          disabled={!canSwingIn}
          onClick={() => setSwingInward(true)}
        >
          Swing in
        </Button>
        <Button
          variant={!swingsInward ? "primary" : "ghost"}
          className={`!px-2.5 !py-1 text-xs ${EDITOR_CLICKABLE}`}
          disabled={!canSwingOut}
          onClick={() => setSwingInward(false)}
        >
          Swing out
        </Button>
      </div>

      {!placementCheck.valid ? (
        <p className="mt-2 text-xs text-amber-300">{placementCheck.reason}</p>
      ) : null}

      {mode === "draft" ? (
        <p className="mt-2 text-xs text-slate-400">
          Click the wall to reposition · snaps to orange entrance pins · Enter or
          Place to confirm · Esc clears the draft without exiting the tool.
        </p>
      ) : (
        <p className="mt-2 text-xs text-slate-400">
          Click near the center, left edge, or right edge to move — that point
          snaps to wall pins. Double-click for more options.
        </p>
      )}
    </div>
  );
}
