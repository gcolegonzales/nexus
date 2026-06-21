import type { Asset } from "@/tools/home-maintenance/types/asset";
import type { Home } from "@/tools/home-maintenance/types/home";
import type { HomeMaintenanceState } from "@/tools/home-maintenance/types/state";

export function houseAssetIdForHome(homeId: string): string {
  return `house-${homeId}`;
}

export function createHouseAsset(home: Home): Asset {
  return {
    id: houseAssetIdForHome(home.id),
    homeId: home.id,
    category: "house",
    nickname: home.name,
  };
}

export function isHouseAsset(asset: Asset): boolean {
  return asset.category === "house";
}

export function findHouseAsset(
  assets: Asset[],
  homeId: string,
): Asset | undefined {
  return assets.find(
    (asset) => asset.homeId === homeId && asset.category === "house",
  );
}

export function ensureHouseAssets(
  state: HomeMaintenanceState,
): HomeMaintenanceState {
  let assets = [...state.assets];

  for (const home of state.homes) {
    const houseAsset = createHouseAsset(home);
    const existingIndex = assets.findIndex((asset) => asset.id === houseAsset.id);

    if (existingIndex === -1) {
      assets.push(houseAsset);
      continue;
    }

    if (assets[existingIndex]?.nickname !== home.name) {
      assets = assets.map((asset) =>
        asset.id === houseAsset.id ? { ...asset, nickname: home.name } : asset,
      );
    }
  }

  const tasks = state.tasks.map((task) => {
    if (task.assetId) return task;
    return { ...task, assetId: houseAssetIdForHome(task.homeId) };
  });

  return { ...state, assets, tasks };
}
