import { createHome } from "@/tools/home-maintenance/lib/home-scope";
import { migrateStateIfNeeded } from "@/tools/home-maintenance/lib/migrate-state";
import {
  applyScheduleRegeneration,
  normalizeOrphanedEvents,
} from "@/tools/home-maintenance/lib/regenerate-schedule";
import { ensureHouseAssets } from "@/tools/home-maintenance/lib/house-asset";
import { createSeedAssets } from "@/tools/home-maintenance/lib/seed-assets";
import { applyLocalHvacSeedIfNeeded } from "@/tools/home-maintenance/lib/local-seed";
import {
  CURRENT_HOME_MAINTENANCE_SCHEMA_VERSION,
  DEFAULT_HOME_MAINTENANCE_STATE,
  type HomeMaintenanceState,
} from "@/tools/home-maintenance/types/state";
import type { Asset } from "@/tools/home-maintenance/types/asset";
import type { Home } from "@/tools/home-maintenance/types/home";
import type { Task } from "@/tools/home-maintenance/types/task";
import { getItem, setItem } from "@/core/storage/db";
import { STORAGE_KEYS } from "@/core/storage/keys";

function parseHome(value: unknown): Home | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<Home>;
  if (typeof item.id !== "string" || typeof item.name !== "string") return null;
  return {
    id: item.id,
    name: item.name,
    hvacFilterSize:
      typeof item.hvacFilterSize === "string" ? item.hvacFilterSize : undefined,
    setupDate: typeof item.setupDate === "string" ? item.setupDate : undefined,
    notes: typeof item.notes === "string" ? item.notes : undefined,
    googleCalendarId:
      typeof item.googleCalendarId === "string"
        ? item.googleCalendarId
        : undefined,
    microsoftCalendarId:
      typeof item.microsoftCalendarId === "string"
        ? item.microsoftCalendarId
        : undefined,
    orphanedCalendarEvents: item.orphanedCalendarEvents,
  };
}

function parseAsset(value: unknown): Asset | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<Asset>;
  if (
    typeof item.id !== "string" ||
    typeof item.category !== "string" ||
    typeof item.homeId !== "string"
  ) {
    return null;
  }
  return item as Asset;
}

function parseTask(value: unknown): Task | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<Task>;
  if (
    typeof item.id !== "string" ||
    typeof item.homeId !== "string" ||
    typeof item.templateKey !== "string" ||
    typeof item.title !== "string" ||
    typeof item.assetId !== "string"
  ) {
    return null;
  }
  return {
    id: item.id,
    homeId: item.homeId,
    templateKey: item.templateKey,
    assetId: item.assetId,
    title: item.title,
    intervalMonths: Number(item.intervalMonths) || 1,
    startOffsetDays: Number(item.startOffsetDays) || 30,
    instructions: typeof item.instructions === "string" ? item.instructions : "",
    parts: Array.isArray(item.parts) ? item.parts : [],
    links: Array.isArray(item.links) ? item.links : [],
    calendarEventId:
      typeof item.calendarEventId === "string" ? item.calendarEventId : undefined,
    microsoftCalendarEventId:
      typeof item.microsoftCalendarEventId === "string"
        ? item.microsoftCalendarEventId
        : undefined,
    enabled: item.enabled !== false,
  };
}

function normalizeState(raw: Partial<HomeMaintenanceState>): HomeMaintenanceState {
  const migrated = migrateStateIfNeeded(raw as HomeMaintenanceState);
  let normalized = ensureHouseAssets(migrated);

  const homes = Array.isArray(normalized.homes)
    ? normalized.homes.map(parseHome).filter((item): item is Home => item !== null)
    : [];

  const assets = Array.isArray(normalized.assets)
    ? normalized.assets.map(parseAsset).filter((item): item is Asset => item !== null)
    : [];

  const tasks = Array.isArray(normalized.tasks)
    ? normalized.tasks
        .map(parseTask)
        .filter((item): item is Task => item !== null)
    : [];

  const activeHomeId =
    typeof normalized.activeHomeId === "string" &&
    homes.some((home) => home.id === normalized.activeHomeId)
      ? normalized.activeHomeId
      : homes[0]?.id ?? "";

  return normalizeOrphanedEvents({
    ...DEFAULT_HOME_MAINTENANCE_STATE,
    ...normalized,
    homes,
    activeHomeId,
    assets,
    tasks,
    completions:
      normalized.completions && typeof normalized.completions === "object"
        ? normalized.completions
        : {},
    initialized: Boolean(normalized.initialized),
    schemaVersion: CURRENT_HOME_MAINTENANCE_SCHEMA_VERSION,
  });
}

export async function loadHomeMaintenance(): Promise<HomeMaintenanceState> {
  const stored = await getItem<HomeMaintenanceState>(STORAGE_KEYS.homeMaintenance);
  if (!stored) {
    const fresh = initializeFreshState();
    await saveHomeMaintenance(fresh);
    return fresh;
  }

  let state = normalizeState(stored);

  if (!state.initialized || state.homes.length === 0) {
    const fresh = initializeFreshState(state);
    await saveHomeMaintenance(fresh);
    return fresh;
  }

  state = applyScheduleRegeneration(state);
  state = applyLocalHvacSeedIfNeeded(state);
  await saveHomeMaintenance(state);
  return state;
}

function initializeFreshState(
  partial: Partial<HomeMaintenanceState> = {},
): HomeMaintenanceState {
  const home = createHome("Home");
  const assets = createSeedAssets(home.id);

  return applyLocalHvacSeedIfNeeded(
    normalizeState({
      ...DEFAULT_HOME_MAINTENANCE_STATE,
      ...partial,
      homes: [home],
      activeHomeId: home.id,
      assets,
      tasks: applyScheduleRegeneration({
        ...DEFAULT_HOME_MAINTENANCE_STATE,
        homes: [home],
        activeHomeId: home.id,
        assets,
        tasks: [],
        initialized: false,
      }).tasks,
      initialized: true,
    }),
  );
}

export async function saveHomeMaintenance(
  state: HomeMaintenanceState,
): Promise<void> {
  await setItem(STORAGE_KEYS.homeMaintenance, normalizeOrphanedEvents(state));
}

export function importHomeMaintenanceSlice(
  data: unknown,
): HomeMaintenanceState {
  if (!data || typeof data !== "object") {
    return DEFAULT_HOME_MAINTENANCE_STATE;
  }

  const imported = normalizeState(data as Partial<HomeMaintenanceState>);
  return applyScheduleRegeneration(imported);
}
