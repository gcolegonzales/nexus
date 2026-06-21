"use client";

import { useRoomCoat } from "@/tools/room-coat/RoomCoatProvider";
import type { UnitPreference } from "@/tools/room-coat/types/state";
import { unitLabel } from "@/tools/room-coat/lib/units";

export function UnitToggle() {
  const { state, setUnitPreference } = useRoomCoat();

  function toggle() {
    const next: UnitPreference =
      state.unitPreference === "imperial" ? "metric" : "imperial";
    void setUnitPreference(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="btn-interactive rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium text-text hover:border-primary/30"
      aria-label={`Switch units. Currently ${unitLabel(state.unitPreference)}`}
    >
      {unitLabel(state.unitPreference)}
    </button>
  );
}
