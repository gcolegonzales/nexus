import { generateSchedule } from "@/tools/home-maintenance/lib/schedule-generator";
import { ensureHouseAssets } from "@/tools/home-maintenance/lib/house-asset";
import { getHomeAssets, getHomeTasks } from "@/tools/home-maintenance/lib/home-scope";
import {
  collectOrphanedEventIds,
  mergeOrphanedQueues,
} from "@/tools/home-maintenance/lib/orphaned-events";
import {
  EMPTY_ORPHANED_EVENTS,
  type HomeMaintenanceState,
} from "@/tools/home-maintenance/types/state";
import type { Task } from "@/tools/home-maintenance/types/task";

export function applyScheduleRegeneration(
  state: HomeMaintenanceState,
): HomeMaintenanceState {
  const prepared = ensureHouseAssets(state);
  const nextTasks: Task[] = [];

  const nextHomes = prepared.homes.map((home) => {
    const homeAssets = getHomeAssets(prepared, home.id);
    const existingTasks = getHomeTasks(prepared, home.id);
    const regenerated = generateSchedule(home, homeAssets, existingTasks);
    const orphaned = collectOrphanedEventIds(existingTasks, regenerated);

    nextTasks.push(...regenerated);

    return {
      ...home,
      orphanedCalendarEvents: mergeOrphanedQueues(
        home.orphanedCalendarEvents,
        orphaned,
      ),
    };
  });

  return {
    ...prepared,
    homes: nextHomes,
    tasks: nextTasks,
  };
}

export function normalizeOrphanedEvents(
  state: HomeMaintenanceState,
): HomeMaintenanceState {
  return {
    ...state,
    homes: state.homes.map((home) => ({
      ...home,
      orphanedCalendarEvents:
        home.orphanedCalendarEvents ?? EMPTY_ORPHANED_EVENTS,
    })),
  };
}
