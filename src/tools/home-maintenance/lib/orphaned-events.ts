import type { OrphanedCalendarEvents } from "@/tools/home-maintenance/types/state";

export function collectOrphanedEventIds(
  previousTasks: { id: string; calendarEventId?: string; microsoftCalendarEventId?: string }[],
  nextTasks: { id: string }[],
): OrphanedCalendarEvents {
  const nextIds = new Set(nextTasks.map((task) => task.id));
  const google: string[] = [];
  const microsoft: string[] = [];

  for (const task of previousTasks) {
    if (nextIds.has(task.id)) continue;
    if (task.calendarEventId) google.push(task.calendarEventId);
    if (task.microsoftCalendarEventId) microsoft.push(task.microsoftCalendarEventId);
  }

  return { google, microsoft };
}

export function mergeOrphanedQueues(
  existing: OrphanedCalendarEvents | undefined,
  added: OrphanedCalendarEvents,
): OrphanedCalendarEvents {
  return {
    google: [...new Set([...(existing?.google ?? []), ...added.google])],
    microsoft: [
      ...new Set([...(existing?.microsoft ?? []), ...added.microsoft]),
    ],
  };
}

export function removeFromOrphanedQueue(
  queue: string[],
  removedId: string,
): string[] {
  return queue.filter((id) => id !== removedId);
}
