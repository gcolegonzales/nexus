import type { Asset } from "@/tools/home-maintenance/types/asset";
import type { Home } from "@/tools/home-maintenance/types/home";
import type { Task } from "@/tools/home-maintenance/types/task";
import { getHvacFilterSize } from "@/tools/home-maintenance/lib/hvac-filter";
import { isHvacFilterTask } from "@/tools/home-maintenance/lib/task-templates";

export function assetNeedsInfo(asset: Asset): string[] {
  const flags: string[] = [];

  if (asset.category === "water-filter" && !asset.model) {
    flags.push("Model Unknown");
  } else if (
    asset.category !== "house" &&
    asset.category !== "safety" &&
    asset.category !== "hvac" &&
    !asset.model
  ) {
    flags.push("Model Missing");
  }

  if (asset.category !== "house" && asset.category !== "hvac" && !asset.installDate) {
    flags.push("Install Date Unknown");
  }

  if (asset.category === "hvac" && !getHvacFilterSize(asset)) {
    flags.push("Filter Size Needed");
  }

  if (asset.hvac?.filter?.replacementNeeded) {
    flags.push("Replacement Recommended");
  }

  return flags;
}

export function taskNeedsInfo(
  task: Task,
  asset: Asset | undefined,
  hvacFilterSize?: string,
): string[] {
  const flags: string[] = [];

  if (isHvacFilterTask(task.templateKey)) {
    const size = asset
      ? getHvacFilterSize(
          asset,
          hvacFilterSize ? ({ hvacFilterSize } as Home) : undefined,
        )
      : hvacFilterSize;
    if (!size?.trim()) {
      flags.push("Filter Size Needed");
    }
  }

  if (asset) {
    flags.push(...assetNeedsInfo(asset));
  }

  return [...new Set(flags)];
}

export function hasNeedsInfo(
  task: Task,
  asset: Asset | undefined,
  hvacFilterSize?: string,
): boolean {
  return taskNeedsInfo(task, asset, hvacFilterSize).length > 0;
}
