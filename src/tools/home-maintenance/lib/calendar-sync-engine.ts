import type { HubProfile } from "@/core/profile/types";
import type { Asset } from "@/tools/home-maintenance/types/asset";
import type {
  HomeMaintenanceState,
  OrphanedCalendarEvents,
} from "@/tools/home-maintenance/types/state";

import type { Task } from "@/tools/home-maintenance/types/task";
import { removeFromOrphanedQueue } from "@/tools/home-maintenance/lib/orphaned-events";

export interface CalendarSyncAdapter {
  ensureCalendar(
    accessToken: string,
    existingCalendarId?: string,
  ): Promise<string>;
  upsertEvent(
    accessToken: string,
    calendarId: string,
    task: Task,
    assets: Asset[],
    profile: HubProfile,
  ): Promise<string>;
  deleteEvent(
    accessToken: string,
    calendarId: string,
    eventId: string,
  ): Promise<void>;
  getEventId(task: Task): string | undefined;
  withEventId(task: Task, eventId: string | undefined): Task;
  getCalendarId(): string | undefined;
  getOrphanedQueue(): string[];
  applySyncResult(
    state: HomeMaintenanceState,
    calendarId: string,
    tasks: Task[],
    orphanedQueue: string[],
  ): HomeMaintenanceState;
}

export interface CalendarSyncResult {
  state: HomeMaintenanceState;
  syncedCount: number;
  removedCount: number;
  calendarId: string;
}

async function deleteOrphanedEvents(
  accessToken: string,
  calendarId: string,
  adapter: CalendarSyncAdapter,
  queue: string[],
): Promise<{ removedCount: number; remaining: string[] }> {
  let removedCount = 0;
  let remaining = [...queue];

  for (const eventId of queue) {
    try {
      await adapter.deleteEvent(accessToken, calendarId, eventId);
      removedCount += 1;
      remaining = removeFromOrphanedQueue(remaining, eventId);
    } catch {
      // Keep in queue for a future sync attempt.
    }
  }

  return { removedCount, remaining };
}

async function tryDeleteEvent(
  accessToken: string,
  calendarId: string,
  adapter: CalendarSyncAdapter,
  eventId: string,
): Promise<boolean> {
  try {
    await adapter.deleteEvent(accessToken, calendarId, eventId);
    return true;
  } catch {
    return false;
  }
}

export async function runCalendarSync(
  accessToken: string,
  state: HomeMaintenanceState,
  profile: HubProfile,
  adapter: CalendarSyncAdapter,
): Promise<CalendarSyncResult> {
  const calendarId = await adapter.ensureCalendar(
    accessToken,
    adapter.getCalendarId(),
  );

  let removedCount = 0;
  let orphanedQueue = adapter.getOrphanedQueue();

  const orphanResult = await deleteOrphanedEvents(
    accessToken,
    calendarId,
    adapter,
    orphanedQueue,
  );
  removedCount += orphanResult.removedCount;
  orphanedQueue = orphanResult.remaining;

  let syncedCount = 0;
  const nextTasks: Task[] = [];

  for (const task of state.tasks) {
    if (!task.enabled) {
      const eventId = adapter.getEventId(task);
      if (eventId) {
        const deleted = await tryDeleteEvent(
          accessToken,
          calendarId,
          adapter,
          eventId,
        );
        if (deleted) {
          removedCount += 1;
          nextTasks.push(adapter.withEventId(task, undefined));
        } else {
          nextTasks.push(task);
        }
      } else {
        nextTasks.push(task);
      }
      continue;
    }

    const eventId = await adapter.upsertEvent(
      accessToken,
      calendarId,
      task,
      state.assets,
      profile,
    );
    syncedCount += 1;
    nextTasks.push(adapter.withEventId(task, eventId));
  }

  return {
    state: adapter.applySyncResult(
      state,
      calendarId,
      nextTasks,
      orphanedQueue,
    ),
    syncedCount,
    removedCount,
    calendarId,
  };
}

export type { OrphanedCalendarEvents };
