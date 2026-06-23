"use client";

import {
  EDITOR_CHROME,
  EDITOR_CHROME_MUTED,
  EDITOR_CLICKABLE,
} from "@/tools/room-coat/components/editor/editor-chrome";
import {
  FURNISHING_PRESETS,
  furnishingPresetById,
} from "@/tools/room-coat/lib/furnishing-presets";
import { formatMm } from "@/tools/room-coat/lib/units";
import type { UnitPreference } from "@/tools/room-coat/types/state";

const FURNISHING_GROUPS: Array<{ label: string; presetIds: string[] }> = [
  { label: "Seating", presetIds: ["sofa", "loveseat", "chair"] },
  { label: "Beds", presetIds: ["twin-bed", "queen-bed", "king-bed"] },
  { label: "Tables", presetIds: ["desk", "dining-table", "nightstand"] },
  { label: "Surfaces", presetIds: ["counter", "bar"] },
  { label: "Storage", presetIds: ["dresser"] },
  { label: "Kitchen", presetIds: ["fridge", "range"] },
];

interface FurnishPaletteProps {
  selectedPresetId: string;
  onSelectPreset: (presetId: string) => void;
  unitPreference: UnitPreference;
}

export function FurnishPalette({
  selectedPresetId,
  onSelectPreset,
  unitPreference,
}: FurnishPaletteProps) {
  const activePreset = furnishingPresetById(selectedPresetId) ?? FURNISHING_PRESETS[0]!;

  return (
    <div
      className={`pointer-events-auto w-[min(360px,calc(100vw-6rem))] rounded-lg px-2.5 py-2 text-[11px] ${EDITOR_CHROME}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className={`${EDITOR_CHROME_MUTED} text-[10px] uppercase tracking-wide`}>
          Placing
        </div>
        <div className="truncate text-xs font-medium text-zinc-100">
          {activePreset.label}
        </div>
      </div>

      <div className="max-h-44 space-y-2 overflow-y-auto pr-0.5">
        {FURNISHING_GROUPS.map((group) => {
          const presets = group.presetIds
            .map((id) => furnishingPresetById(id))
            .filter((preset) => preset !== undefined);
          if (presets.length === 0) return null;

          return (
            <div key={group.label}>
              <div className={`mb-1 ${EDITOR_CHROME_MUTED} text-[10px] font-medium uppercase tracking-wide`}>
                {group.label}
              </div>
              <div className="grid grid-cols-2 gap-1">
                {presets.map((preset) => {
                  const active = preset.id === selectedPresetId;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      className={`rounded-md px-2 py-1.5 text-left ${EDITOR_CLICKABLE} ${
                        active
                          ? "bg-sky-500/25 font-medium text-sky-100 ring-1 ring-sky-400/45"
                          : "text-zinc-300 hover:bg-zinc-600/45"
                      }`}
                      onClick={() => onSelectPreset(preset.id)}
                    >
                      <div className="truncate text-[11px]">{preset.label}</div>
                      <div className={`${EDITOR_CHROME_MUTED} text-[10px] tabular-nums`}>
                        {formatMm(preset.widthMm, unitPreference)} ×{" "}
                        {formatMm(preset.depthMm, unitPreference)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
