import { createId } from "@/shared/ids/createId";
import { normalizeCompletion } from "@/tools/home-maintenance/lib/completions";
import { houseAssetIdForHome } from "@/tools/home-maintenance/lib/house-asset";
import { HOUSE_ASSET_ID } from "@/tools/home-maintenance/lib/seed-assets";
import type { Asset } from "@/tools/home-maintenance/types/asset";
import type { Home } from "@/tools/home-maintenance/types/home";
import {
  EMPTY_ORPHANED_EVENTS,
  type HomeMaintenanceState,
  type OrphanedCalendarEvents,
} from "@/tools/home-maintenance/types/state";
import type { Task } from "@/tools/home-maintenance/types/task";

interface LegacyHomeMaintenanceState {
  homes?: Home[];
  activeHomeId?: string;
  assets?: Asset[];
  tasks?: Task[];
  completions?: HomeMaintenanceState["completions"];
  hvacFilterSize?: string;
  googleCalendarId?: string;
  microsoftCalendarId?: string;
  orphanedCalendarEvents?: OrphanedCalendarEvents;
  initialized?: boolean;
  schemaVersion?: number;
}

export function migrateStateIfNeeded(
  raw: LegacyHomeMaintenanceState,
): HomeMaintenanceState {
  let state =
    (raw.schemaVersion ?? 1) >= 2 && raw.homes?.length && raw.activeHomeId
      ? (raw as HomeMaintenanceState)
      : migrateV1ToV2(raw);

  if ((state.schemaVersion ?? 2) < 3) {
    state = migrateV2ToV3(state);
  }

  return state;
}

function migrateV1ToV2(raw: LegacyHomeMaintenanceState): HomeMaintenanceState {
  const homeId = createId();
  const home: Home = {
    id: homeId,
    name: "Home",
    hvacFilterSize: raw.hvacFilterSize,
    googleCalendarId: raw.googleCalendarId,
    microsoftCalendarId: raw.microsoftCalendarId,
    orphanedCalendarEvents: raw.orphanedCalendarEvents ?? EMPTY_ORPHANED_EVENTS,
  };

  const assets: Asset[] = (raw.assets ?? [])
    .filter((asset) => asset.category !== "house" && asset.id !== HOUSE_ASSET_ID)
    .map((asset) => ({
      ...asset,
      homeId,
    }));

  assets.push({
    id: houseAssetIdForHome(homeId),
    homeId,
    category: "house",
    nickname: home.name,
  });

  const tasks: Task[] = (raw.tasks ?? []).map((task) => ({
    ...task,
    homeId,
    assetId:
      !task.assetId || task.assetId === HOUSE_ASSET_ID
        ? houseAssetIdForHome(homeId)
        : task.assetId,
  }));

  return {
    homes: [home],
    activeHomeId: homeId,
    assets,
    tasks,
    completions: raw.completions ?? {},
    initialized: raw.initialized ?? false,
    schemaVersion: 2,
  };
}

function migrateV2ToV3(state: HomeMaintenanceState): HomeMaintenanceState {
  const completions = Object.fromEntries(
    Object.entries(state.completions ?? {}).flatMap(([taskId, value]) => {
      const normalized = normalizeCompletion(value);
      return normalized ? [[taskId, normalized]] : [];
    }),
  );

  const tasks = state.tasks.filter((task) => {
    if (task.templateKey !== "hvac-filter-replacement") return true;
    const asset = state.assets.find((item) => item.id === task.assetId);
    return asset?.category !== "house";
  });

  return {
    ...state,
    tasks,
    completions,
    schemaVersion: 3,
  };
}
