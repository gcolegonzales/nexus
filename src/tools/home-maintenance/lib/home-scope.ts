import { createId } from "@/shared/ids/createId";
import type { Asset } from "@/tools/home-maintenance/types/asset";
import type { Home } from "@/tools/home-maintenance/types/home";
import type { HomeMaintenanceState } from "@/tools/home-maintenance/types/state";
import type { Task } from "@/tools/home-maintenance/types/task";

export function getHomeById(state: HomeMaintenanceState, homeId: string): Home {
  const home = state.homes.find((item) => item.id === homeId);
  if (!home) {
    throw new Error(`Home not found: ${homeId}`);
  }
  return home;
}

export function getActiveHome(state: HomeMaintenanceState): Home {
  return getHomeById(state, state.activeHomeId);
}

export function getHomeAssets(state: HomeMaintenanceState, homeId: string): Asset[] {
  return state.assets.filter((asset) => asset.homeId === homeId);
}

export function getApplianceAssets(state: HomeMaintenanceState, homeId: string): Asset[] {
  return getHomeAssets(state, homeId).filter((asset) => asset.category !== "house");
}

export function getHomeTasks(state: HomeMaintenanceState, homeId: string): Task[] {
  return state.tasks.filter((task) => task.homeId === homeId);
}

export function createHome(name: string): Home {
  return {
    id: createId(),
    name: name.trim() || "Home",
  };
}

export function scopeStateToHome(
  state: HomeMaintenanceState,
  homeId: string,
): Pick<HomeMaintenanceState, "assets" | "tasks"> & { home: Home } {
  const home = getHomeById(state, homeId);
  return {
    home,
    assets: getHomeAssets(state, homeId),
    tasks: getHomeTasks(state, homeId),
  };
}
