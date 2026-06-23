"use client";

import { PopoverPanel, ToggleSwitch } from "@nexus/ui";
import { useEffect, useRef, useState } from "react";
import { useRoomCoat } from "@/tools/room-coat/RoomCoatProvider";
import type { UnitPreference } from "@/tools/room-coat/types/state";
import {
  EDITOR_CHROME,
  EDITOR_CHROME_PANEL,
  EDITOR_CHROME_BUTTON,
  EDITOR_CHROME_BUTTON_ACTIVE,
  EDITOR_CHROME_MUTED,
  EDITOR_CLICKABLE,
} from "@/tools/room-coat/components/editor/editor-chrome";
import { SettingsIcon } from "@/tools/room-coat/components/editor/EditorToolIcons";

function shortUnitLabel(unit: UnitPreference): string {
  return unit === "metric" ? "Metric" : "Imperial";
}

export function EditorSettingsPopover() {
  const {
    state,
    setUnitPreference,
    setShowWallLabels,
    setShowRoomLabels,
    setShowFloorGrid,
    setShowFurnishings,
    setShowSnapPoints,
    setShowClearanceLabels,
    setSnapMode,
  } = useRoomCoat();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function setUnit(unit: UnitPreference) {
    if (unit === state.unitPreference) return;
    void setUnitPreference(unit);
  }

  return (
    <div ref={rootRef} className={`pointer-events-auto relative ${open ? "z-20" : "z-10"}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-label="Editor settings"
        onClick={() => setOpen((current) => !current)}
        className={`inline-flex items-center justify-center rounded-lg p-1.5 ${EDITOR_CHROME} ${EDITOR_CLICKABLE} ${
          open ? EDITOR_CHROME_BUTTON_ACTIVE : EDITOR_CHROME_BUTTON
        }`}
      >
        <SettingsIcon />
      </button>

      <PopoverPanel
        open={open}
        align="end"
        className={`right-0 top-full !mt-1 w-56 rounded-lg p-2.5 ${EDITOR_CHROME_PANEL}`}
      >
        <p
          className={`mb-2 text-[10px] font-medium uppercase tracking-wide ${EDITOR_CHROME_MUTED}`}
        >
          Settings
        </p>

        <div className="space-y-2">
          <div>
            <p className={`mb-1 text-[10px] font-medium ${EDITOR_CHROME_MUTED}`}>
              Units
            </p>
            <div
              className="inline-flex w-full items-center gap-px rounded-md border border-zinc-500/35 bg-zinc-900/70 p-0.5"
              role="group"
              aria-label="Measurement units"
            >
              {(["imperial", "metric"] as const).map((unit) => (
                <button
                  key={unit}
                  type="button"
                  className={`flex-1 rounded px-2 py-1 text-[11px] font-medium ${EDITOR_CLICKABLE} ${
                    state.unitPreference === unit
                      ? EDITOR_CHROME_BUTTON_ACTIVE
                      : EDITOR_CHROME_BUTTON
                  }`}
                  aria-pressed={state.unitPreference === unit}
                  onClick={() => setUnit(unit)}
                >
                  {shortUnitLabel(unit)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-zinc-500/30 px-0.5 py-1.5 pt-2.5">
            <label
              htmlFor="editor-show-floor-grid"
              className="cursor-pointer text-xs leading-none text-slate-200"
            >
              Grid lines
            </label>
            <ToggleSwitch
              id="editor-show-floor-grid"
              size="sm"
              checked={state.viewSettings.showFloorGrid}
              onChange={(show) => void setShowFloorGrid(show)}
              aria-label="Show floor grid lines"
              className="shrink-0"
            />
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-zinc-500/30 px-0.5 py-1.5">
            <label
              htmlFor="editor-show-furnishings"
              className="cursor-pointer text-xs leading-none text-slate-200"
            >
              Furnishings
            </label>
            <ToggleSwitch
              id="editor-show-furnishings"
              size="sm"
              checked={state.viewSettings.showFurnishings}
              onChange={(show) => void setShowFurnishings(show)}
              aria-label="Show furnishings"
              className="shrink-0"
            />
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-zinc-500/30 px-0.5 py-1.5">
            <label
              htmlFor="editor-show-snap-points"
              className="cursor-pointer text-xs leading-none text-slate-200"
            >
              Snap points
            </label>
            <ToggleSwitch
              id="editor-show-snap-points"
              size="sm"
              checked={state.viewSettings.showSnapPoints}
              onChange={(show) => void setShowSnapPoints(show)}
              aria-label="Show snap points"
              className="shrink-0"
            />
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-zinc-500/30 px-0.5 py-1.5">
            <label
              htmlFor="editor-show-clearance-labels"
              className="cursor-pointer text-xs leading-none text-slate-200"
            >
              Clearance labels
            </label>
            <ToggleSwitch
              id="editor-show-clearance-labels"
              size="sm"
              checked={state.viewSettings.showClearanceLabels}
              onChange={(show) => void setShowClearanceLabels(show)}
              aria-label="Show clearance labels"
              className="shrink-0"
            />
          </div>

          <div className="border-t border-zinc-500/30 px-0.5 py-1.5">
            <p className={`mb-1 text-[10px] font-medium ${EDITOR_CHROME_MUTED}`}>
              Snap mode
            </p>
            <select
              className="w-full rounded-md border border-zinc-500/35 bg-zinc-900/80 px-2 py-1 text-xs text-zinc-100"
              value={state.viewSettings.snapMode}
              onChange={(event) =>
                void setSnapMode(
                  event.target.value as typeof state.viewSettings.snapMode,
                )
              }
            >
              <option value="all">All snaps</option>
              <option value="grid-walls">Grid + walls</option>
              <option value="grid">Grid only</option>
              <option value="off">Off</option>
            </select>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-zinc-500/30 px-0.5 py-1.5">
            <label
              htmlFor="editor-show-room-labels"
              className="cursor-pointer text-xs leading-none text-slate-200"
            >
              Room names
            </label>
            <ToggleSwitch
              id="editor-show-room-labels"
              size="sm"
              checked={state.viewSettings.showRoomLabels}
              onChange={(show) => void setShowRoomLabels(show)}
              aria-label="Show room names"
              className="shrink-0"
            />
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-zinc-500/30 px-0.5 py-1.5">
            <label
              htmlFor="editor-show-wall-labels"
              className="cursor-pointer text-xs leading-none text-slate-200"
            >
              Show wall numbers
            </label>
            <ToggleSwitch
              id="editor-show-wall-labels"
              size="sm"
              checked={state.viewSettings.showWallLabels}
              onChange={(show) => void setShowWallLabels(show)}
              aria-label="Show wall numbers"
              className="shrink-0"
            />
          </div>
        </div>
      </PopoverPanel>
    </div>
  );
}
