import type { Asset } from "@/tools/home-maintenance/types/asset";
import type { Home } from "@/tools/home-maintenance/types/home";
import type { HomeMaintenanceState } from "@/tools/home-maintenance/types/state";
import type { TaskCompletion } from "@/tools/home-maintenance/types/completion";

export interface LocalHvacSeed {
  homeId: string;
  homePatch?: Partial<Home>;
  assets: Asset[];
  initialCompletions?: Record<string, TaskCompletion>;
}

/**
 * Example local HVAC inventory. Not applied unless
 * NEXT_PUBLIC_LOCAL_HVAC_SEED=true in .env.local.
 */
export function buildLocalHvacSeed(homeId: string): LocalHvacSeed {
  return {
    homeId,
    homePatch: {
      hvacFilterSize: "16x25x4.375",
    },
    assets: [
      {
        id: "asset-hvac",
        homeId,
        category: "hvac",
        brand: "Lennox",
        nickname: "Air handler / furnace",
        hvac: {
          location: "Attic",
          configuration: "Gas furnace with attic-mounted evaporator coil",
          evaporatorCoilModel: "ADP LH35/36W9B",
          filter: {
            brand: "Trion",
            model: "Air Bear OEM-2",
            size: "16x25x4.375",
            merv: 8,
            replacementIntervalMonths: 9,
            inspectionIntervalMonths: 6,
            condition: "good",
            replacementNeeded: false,
          },
        },
      },
    ],
  };
}

export function mergeLocalHvacSeed(
  state: HomeMaintenanceState,
  seed: LocalHvacSeed,
): HomeMaintenanceState {
  const home = state.homes.find((item) => item.id === seed.homeId);
  if (!home) return state;

  const homes = state.homes.map((item) =>
    item.id === seed.homeId ? { ...item, ...seed.homePatch } : item,
  );

  const seedAssetIds = new Set(seed.assets.map((asset) => asset.id));
  const assets = [
    ...state.assets.filter(
      (asset) => asset.homeId !== seed.homeId || !seedAssetIds.has(asset.id),
    ),
    ...seed.assets,
  ];

  return {
    ...state,
    homes,
    assets,
  };
}
