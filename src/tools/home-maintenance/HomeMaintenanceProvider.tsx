"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createId } from "@/shared/ids/createId";
import { ensureHouseAssets, isHouseAsset } from "@/tools/home-maintenance/lib/house-asset";
import {
  createHome,
  getActiveHome,
  getApplianceAssets,
  getHomeAssets,
  getHomeTasks,
} from "@/tools/home-maintenance/lib/home-scope";
import type { HvacFilterCondition, TaskCompletion } from "@/tools/home-maintenance/types/completion";
import {
  findReplacementTaskForAsset,
  updateAssetAfterHvacInspection,
  updateAssetAfterHvacReplacement,
} from "@/tools/home-maintenance/lib/hvac-maintenance";
import { applyScheduleRegeneration } from "@/tools/home-maintenance/lib/regenerate-schedule";
import {
  isHvacFilterInspectionTask,
  isHvacFilterReplacementTask,
} from "@/tools/home-maintenance/lib/task-templates";
import {
  loadHomeMaintenance,
  saveHomeMaintenance,
} from "@/tools/home-maintenance/storage";
import type { Asset } from "@/tools/home-maintenance/types/asset";
import type { Home } from "@/tools/home-maintenance/types/home";
import type { HomeMaintenanceState } from "@/tools/home-maintenance/types/state";
import type { Task } from "@/tools/home-maintenance/types/task";
import { ensureSchemaVersion } from "@/core/storage/db";

interface HomeMaintenanceContextValue {
  state: HomeMaintenanceState;
  activeHome: Home;
  activeAssets: Asset[];
  activeAllAssets: Asset[];
  activeTasks: Task[];
  isReady: boolean;
  refresh: () => Promise<void>;
  saveState: (next: HomeMaintenanceState) => Promise<void>;
  setActiveHomeId: (homeId: string) => Promise<void>;
  addHome: (name: string) => Promise<void>;
  updateHome: (homeId: string, patch: Partial<Home>) => Promise<void>;
  deleteHome: (homeId: string) => Promise<void>;
  upsertAsset: (asset: Asset) => Promise<void>;
  deleteAsset: (assetId: string) => Promise<void>;
  updateTask: (taskId: string, patch: Partial<Task>) => Promise<void>;
  markTaskComplete: (
    taskId: string,
    options?: {
      condition?: HvacFilterCondition;
      alsoReplaceFilter?: boolean;
    },
  ) => Promise<void>;
  setHvacFilterSize: (size: string) => Promise<void>;
}

const HomeMaintenanceContext =
  createContext<HomeMaintenanceContextValue | null>(null);

export function HomeMaintenanceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<HomeMaintenanceState | null>(null);
  const [isReady, setIsReady] = useState(false);

  const refresh = useCallback(async () => {
    await ensureSchemaVersion();
    const loaded = await loadHomeMaintenance();
    setState(loaded);
    setIsReady(true);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveState = useCallback(async (next: HomeMaintenanceState) => {
    await saveHomeMaintenance(next);
    setState(next);
  }, []);

  const mutateState = useCallback(
    async (
      updater: (current: HomeMaintenanceState) => HomeMaintenanceState,
    ) => {
      if (!state) return;
      const next = updater(state);
      await saveState(next);
    },
    [state, saveState],
  );

  const setActiveHomeId = useCallback(
    async (homeId: string) => {
      await mutateState((current) => {
        if (!current.homes.some((home) => home.id === homeId)) {
          return current;
        }
        return { ...current, activeHomeId: homeId };
      });
    },
    [mutateState],
  );

  const addHome = useCallback(
    async (name: string) => {
      await mutateState((current) => {
        const home = createHome(name);
        return applyScheduleRegeneration({
          ...current,
          homes: [...current.homes, home],
          activeHomeId: home.id,
        });
      });
    },
    [mutateState],
  );

  const updateHome = useCallback(
    async (homeId: string, patch: Partial<Home>) => {
      await mutateState((current) => {
        const homes = current.homes.map((home) =>
          home.id === homeId ? { ...home, ...patch } : home,
        );
        let next = ensureHouseAssets({ ...current, homes });
        const regenFields: (keyof Home)[] = ["hvacFilterSize"];
        if (regenFields.some((field) => field in patch)) {
          return applyScheduleRegeneration(next);
        }
        return next;
      });
    },
    [mutateState],
  );

  const deleteHome = useCallback(
    async (homeId: string) => {
      await mutateState((current) => {
        if (current.homes.length <= 1) return current;

        const homes = current.homes.filter((home) => home.id !== homeId);
        const assets = current.assets.filter((asset) => asset.homeId !== homeId);
        const tasks = current.tasks.filter((task) => task.homeId !== homeId);
        const completions = { ...current.completions };
        for (const task of current.tasks) {
          if (task.homeId === homeId) {
            delete completions[task.id];
          }
        }

        const activeHomeId =
          current.activeHomeId === homeId
            ? homes[0]?.id ?? ""
            : current.activeHomeId;

        return applyScheduleRegeneration({
          ...current,
          homes,
          assets,
          tasks,
          completions,
          activeHomeId,
        });
      });
    },
    [mutateState],
  );

  const upsertAsset = useCallback(
    async (asset: Asset) => {
      await mutateState((current) => {
        const assets = current.assets.some((item) => item.id === asset.id)
          ? current.assets.map((item) => (item.id === asset.id ? asset : item))
          : [...current.assets, asset];

        let homes = current.homes;
        const filterSize = asset.hvac?.filter?.size?.trim();
        if (asset.category === "hvac" && filterSize) {
          homes = current.homes.map((home) =>
            home.id === asset.homeId
              ? { ...home, hvacFilterSize: filterSize }
              : home,
          );
        }

        return applyScheduleRegeneration({ ...current, assets, homes });
      });
    },
    [mutateState],
  );

  const deleteAsset = useCallback(
    async (assetId: string) => {
      await mutateState((current) => {
        const target = current.assets.find((item) => item.id === assetId);
        if (target && isHouseAsset(target)) return current;

        const assets = current.assets.filter((item) => item.id !== assetId);
        const completions = { ...current.completions };
        const remainingTasks = current.tasks.filter((task) => {
          if (task.assetId === assetId) {
            delete completions[task.id];
            return false;
          }
          return true;
        });

        return applyScheduleRegeneration({
          ...current,
          assets,
          tasks: remainingTasks,
          completions,
        });
      });
    },
    [mutateState],
  );

  const updateTask = useCallback(
    async (taskId: string, patch: Partial<Task>) => {
      await mutateState((current) => ({
        ...current,
        tasks: current.tasks.map((task) =>
          task.id === taskId ? { ...task, ...patch } : task,
        ),
      }));
    },
    [mutateState],
  );

  const markTaskComplete = useCallback(
    async (
      taskId: string,
      options?: {
        condition?: HvacFilterCondition;
        alsoReplaceFilter?: boolean;
      },
    ) => {
      await mutateState((current) => {
        const task = current.tasks.find((item) => item.id === taskId);
        if (!task) return current;

        const asset = current.assets.find((item) => item.id === task.assetId);
        const at = new Date().toISOString();
        const completion: TaskCompletion = {
          at,
          condition: options?.condition,
        };

        const completions = {
          ...current.completions,
          [taskId]: completion,
        };
        let assets = current.assets;

        if (
          isHvacFilterInspectionTask(task.templateKey) &&
          asset &&
          options?.condition
        ) {
          const replaced = options.alsoReplaceFilter === true;
          assets = assets.map((item) =>
            item.id === asset.id
              ? updateAssetAfterHvacInspection(item, options.condition!, replaced)
              : item,
          );

          if (replaced) {
            const replacementTask = findReplacementTaskForAsset(current, asset.id);
            if (replacementTask) {
              completions[replacementTask.id] = { at };
              assets = assets.map((item) =>
                item.id === asset.id ? updateAssetAfterHvacReplacement(item) : item,
              );
            }
          }
        } else if (isHvacFilterReplacementTask(task.templateKey) && asset) {
          assets = assets.map((item) =>
            item.id === asset.id ? updateAssetAfterHvacReplacement(item) : item,
          );
        }

        return {
          ...current,
          assets,
          completions,
        };
      });
    },
    [mutateState],
  );

  const setHvacFilterSize = useCallback(
    async (size: string) => {
      if (!state) return;
      const activeHome = getActiveHome(state);
      await updateHome(activeHome.id, {
        hvacFilterSize: size.trim() || undefined,
      });
    },
    [state, updateHome],
  );

  const value = useMemo(() => {
    if (!state) return null;

    const activeHome = getActiveHome(state);

    return {
      state,
      activeHome,
      activeAssets: getApplianceAssets(state, activeHome.id),
      activeAllAssets: getHomeAssets(state, activeHome.id),
      activeTasks: getHomeTasks(state, activeHome.id),
      isReady,
      refresh,
      saveState,
      setActiveHomeId,
      addHome,
      updateHome,
      deleteHome,
      upsertAsset,
      deleteAsset,
      updateTask,
      markTaskComplete,
      setHvacFilterSize,
    };
  }, [
    state,
    isReady,
    refresh,
    saveState,
    setActiveHomeId,
    addHome,
    updateHome,
    deleteHome,
    upsertAsset,
    deleteAsset,
    updateTask,
    markTaskComplete,
    setHvacFilterSize,
  ]);

  if (!value) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-muted">
        Loading home maintenance…
      </div>
    );
  }

  return (
    <HomeMaintenanceContext.Provider value={value}>
      {children}
    </HomeMaintenanceContext.Provider>
  );
}

export function useHomeMaintenance(): HomeMaintenanceContextValue {
  const context = useContext(HomeMaintenanceContext);
  if (!context) {
    throw new Error(
      "useHomeMaintenance must be used within HomeMaintenanceProvider",
    );
  }
  return context;
}

export function createEmptyAsset(homeId: string): Asset {
  return {
    id: createId(),
    homeId,
    category: "other",
  };
}
