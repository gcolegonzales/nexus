"use client";

import { useMemo, useState } from "react";
import { useHomeMaintenance } from "@/tools/home-maintenance/HomeMaintenanceProvider";
import { ToolSection } from "@/tools/home-maintenance/components/ToolSection";
import { TaskAccordionRow } from "@/tools/home-maintenance/components/TaskAccordionRow";
import { getAssetCardTitle } from "@/tools/home-maintenance/lib/asset-label";
import { useDeferredFilter } from "@/shared/hooks/useDeferredFilter";
import { FilterTransitionPanel } from "@nexus/ui";
import { MultiSelect } from "@nexus/ui";
import { StaggerItem } from "@nexus/ui";

type FilterMode = "all" | "enabled" | "disabled";

export default function SchedulePage() {
  const { activeHome, activeAllAssets, activeTasks, state } =
    useHomeMaintenance();
  const [filter, setFilter] = useState<FilterMode>("all");
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);

  const assetOptions = useMemo(
    () =>
      activeAllAssets.map((asset) => ({
        value: asset.id,
        label: getAssetCardTitle(asset),
      })),
    [activeAllAssets],
  );

  const tasks = useMemo(() => {
    let sorted = [...activeTasks];

    if (filter === "enabled") sorted = sorted.filter((task) => task.enabled);
    if (filter === "disabled") sorted = sorted.filter((task) => !task.enabled);

    if (selectedAssetIds.length > 0) {
      sorted = sorted.filter((task) => selectedAssetIds.includes(task.assetId));
    }

    return sorted;
  }, [activeTasks, filter, selectedAssetIds]);

  const filterKey = `${filter}:${[...selectedAssetIds].sort().join(",")}`;
  const {
    value: displayTasks,
    isPending,
    animateKey,
  } = useDeferredFilter(filterKey, tasks);

  return (
    <ToolSection
      title="Schedule"
      description={`Balanced intervals for ${activeHome.name} — not aggressive manufacturer worst-case schedules. Every task is editable.`}
    >
      <StaggerItem className="relative z-30">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {(["all", "enabled", "disabled"] as FilterMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setFilter(mode)}
              className={`rounded-xl px-4 py-2 text-sm font-medium capitalize transition-all duration-200 ease-out cursor-pointer ${
                filter === mode
                  ? "bg-primary text-white"
                  : "bg-border/50 text-muted hover:text-text"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        <MultiSelect
          label="Filter by asset"
          options={assetOptions}
          values={selectedAssetIds}
          onChange={setSelectedAssetIds}
          placeholder="All assets"
          className="min-w-[20rem] sm:min-w-[22rem]"
        />
        </div>
      </StaggerItem>

      <FilterTransitionPanel
        isPending={isPending}
        animateKey={animateKey}
        className="mt-6"
        listClassName="grid gap-4"
      >
        {displayTasks.map((task) => (
          <StaggerItem key={task.id}>
            <TaskAccordionRow
              task={task}
              assets={activeAllAssets}
              hvacFilterSize={activeHome.hvacFilterSize}
              completion={state.completions[task.id]}
            />
          </StaggerItem>
        ))}
      </FilterTransitionPanel>
    </ToolSection>
  );
}
