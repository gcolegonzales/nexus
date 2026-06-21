import type { Asset } from "@/tools/home-maintenance/types/asset";
import type { HomeMaintenanceState } from "@/tools/home-maintenance/types/state";
import { mergeHvacDetails } from "@/tools/home-maintenance/lib/hvac-filter";
import {
  isHvacFilterInspectionTask,
  isHvacFilterReplacementTask,
} from "@/tools/home-maintenance/lib/task-templates";
import type { HvacFilterCondition } from "@/tools/home-maintenance/types/completion";

export function mapHvacConditionToAsset(
  condition: HvacFilterCondition,
): "good" | "moderate-dust" | "replace-needed" {
  if (condition === "clean") return "good";
  if (condition === "moderate-dust") return "moderate-dust";
  return "replace-needed";
}

export function updateAssetAfterHvacInspection(
  asset: Asset,
  condition: HvacFilterCondition,
  replaced: boolean,
): Asset {
  if (asset.category !== "hvac") return asset;

  const mapped = mapHvacConditionToAsset(condition);
  const filter = asset.hvac?.filter;

  return {
    ...asset,
    hvac: mergeHvacDetails(asset.hvac, {
      filter: {
        ...filter,
        condition: replaced ? "good" : mapped,
        replacementNeeded: replaced ? false : condition === "replace-needed",
        installedAt: replaced
          ? new Date().toISOString().slice(0, 10)
          : filter?.installedAt,
      },
    }),
  };
}

export function updateAssetAfterHvacReplacement(asset: Asset): Asset {
  if (asset.category !== "hvac") return asset;

  return {
    ...asset,
    hvac: mergeHvacDetails(asset.hvac, {
      filter: {
        ...asset.hvac?.filter,
        condition: "good",
        replacementNeeded: false,
        installedAt: new Date().toISOString().slice(0, 10),
      },
    }),
  };
}

export function findReplacementTaskForAsset(
  state: HomeMaintenanceState,
  assetId: string,
) {
  return state.tasks.find(
    (task) =>
      task.assetId === assetId &&
      isHvacFilterReplacementTask(task.templateKey),
  );
}

export function findInspectionTaskForAsset(
  state: HomeMaintenanceState,
  assetId: string,
) {
  return state.tasks.find(
    (task) =>
      task.assetId === assetId &&
      isHvacFilterInspectionTask(task.templateKey),
  );
}
