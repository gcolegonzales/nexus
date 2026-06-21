import type { HomeMaintenanceState } from "@/tools/home-maintenance/types/state";
import { applyScheduleRegeneration } from "@/tools/home-maintenance/lib/regenerate-schedule";
import {
  buildLocalHvacSeed,
  mergeLocalHvacSeed,
} from "@/tools/home-maintenance/lib/local-seed.user.example";

export function applyLocalHvacSeedIfNeeded(
  state: HomeMaintenanceState,
): HomeMaintenanceState {
  if (process.env.NEXT_PUBLIC_LOCAL_HVAC_SEED !== "true") {
    return state;
  }

  const homeId = state.activeHomeId || state.homes[0]?.id;
  if (!homeId) return state;

  const hasHvac = state.assets.some(
    (asset) => asset.homeId === homeId && asset.category === "hvac",
  );
  if (hasHvac) return state;

  const merged = mergeLocalHvacSeed(state, buildLocalHvacSeed(homeId));
  return applyScheduleRegeneration(merged);
}
