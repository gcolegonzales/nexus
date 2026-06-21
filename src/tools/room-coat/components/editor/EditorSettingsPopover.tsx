"use client";

import { PopoverPanel, ToggleSwitch } from "@nexus/ui";
import { useEffect, useRef, useState } from "react";
import { useRoomCoat } from "@/tools/room-coat/RoomCoatProvider";
import type { UnitPreference } from "@/tools/room-coat/types/state";
import {
  EDITOR_CHROME,
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
  const { state, setUnitPreference, setShowWallLabels } = useRoomCoat();
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
    <div ref={rootRef} className="pointer-events-auto relative">
      <button
        type="button"
        aria-expanded={open}
        aria-label="Editor settings"
        onClick={() => setOpen((current) => !current)}
        className={`inline-flex items-center justify-center border border-white/10 p-1.5 backdrop-blur-md ${EDITOR_CLICKABLE} ${
          open ? EDITOR_CHROME_BUTTON_ACTIVE : `${EDITOR_CHROME_BUTTON} bg-slate-900/90`
        }`}
      >
        <SettingsIcon />
      </button>

      <PopoverPanel
        open={open}
        align="end"
        className={`right-0 top-full !mt-1 w-56 rounded-md p-2.5 ${EDITOR_CHROME}`}
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
              className="inline-flex w-full items-center gap-px rounded-md border border-white/10 bg-slate-950/60 p-0.5"
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

          <div className="flex items-center justify-between gap-3 border-t border-white/10 px-0.5 py-1.5 pt-2.5">
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
