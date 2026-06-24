import { addDays, format } from "date-fns";
import type { HubProfile } from "@/core/profile/types";
import type { CalendarSyncAdapter } from "@/tools/home-maintenance/lib/calendar-sync-engine";
import { runCalendarSync } from "@/tools/home-maintenance/lib/calendar-sync-engine";
import {
  buildRecurrenceRule,
  getTaskStartDate,
} from "@/tools/home-maintenance/lib/calendar-dates";
import {
  buildEventDescriptionPlain,
  buildEventSummary,
} from "@/tools/home-maintenance/lib/event-description";
import {
  getHomeAssets,
  getHomeById,
  getHomeTasks,
} from "@/tools/home-maintenance/lib/home-scope";
import { HOME_MAINTENANCE_CALENDAR_NAME } from "@/tools/home-maintenance/lib/ics-export";
import {
  EMPTY_ORPHANED_EVENTS,
  type HomeMaintenanceState,
} from "@/tools/home-maintenance/types/state";
import type { Asset } from "@/tools/home-maintenance/types/asset";
import type { Home } from "@/tools/home-maintenance/types/home";
import type { Task } from "@/tools/home-maintenance/types/task";

interface GoogleCalendarListEntry {
  id: string;
  summary?: string;
}

interface GoogleCalendarEvent {
  id?: string;
}

async function googleFetch<T>(
  accessToken: string,
  url: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Google API error (${response.status})`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function buildGoogleEventBody(
  task: Task,
  assets: Asset[],
  profile: HubProfile,
  homeName: string,
  completions: HomeMaintenanceState["completions"],
) {
  const start = getTaskStartDate(profile, task, completions[task.id]);
  const end = addDays(start, 1);

  return {
    summary: buildEventSummary(task, assets),
    description: buildEventDescriptionPlain(task, assets, {
      householdName: profile.householdName,
      homeName,
    }),
    start: { date: format(start, "yyyy-MM-dd") },
    end: { date: format(end, "yyyy-MM-dd") },
    recurrence: [buildRecurrenceRule(task.intervalMonths)],
    reminders: {
      useDefault: false,
      overrides: [{ method: "popup", minutes: 24 * 60 }],
    },
  };
}

const googleAdapterCore: Omit<
  CalendarSyncAdapter,
  "getCalendarId" | "getOrphanedQueue" | "applySyncResult"
> = {
  async ensureCalendar(accessToken, existingCalendarId) {
    if (existingCalendarId) {
      try {
        await googleFetch(
          accessToken,
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(existingCalendarId)}`,
        );
        return existingCalendarId;
      } catch {
        // Calendar missing — recreate below.
      }
    }

    const list = await googleFetch<{ items?: GoogleCalendarListEntry[] }>(
      accessToken,
      "https://www.googleapis.com/calendar/v3/users/me/calendarList",
    );

    const existing = list.items?.find(
      (item) => item.summary === HOME_MAINTENANCE_CALENDAR_NAME,
    );
    if (existing?.id) return existing.id;

    const created = await googleFetch<{ id: string }>(
      accessToken,
      "https://www.googleapis.com/calendar/v3/calendars",
      {
        method: "POST",
        body: JSON.stringify({ summary: HOME_MAINTENANCE_CALENDAR_NAME }),
      },
    );

    return created.id;
  },

  async upsertEvent(accessToken, calendarId, task, assets, profile) {
    throw new Error("Use createGoogleAdapter(home) for scoped sync.");
  },

  async deleteEvent(accessToken, calendarId, eventId) {
    await googleFetch(
      accessToken,
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      { method: "DELETE" },
    );
  },

  getEventId(task) {
    return task.calendarEventId;
  },

  withEventId(task, eventId) {
    return { ...task, calendarEventId: eventId };
  },
};

function createGoogleAdapter(
  home: Home,
  completions: HomeMaintenanceState["completions"],
): CalendarSyncAdapter {
  return {
    ...googleAdapterCore,
    async upsertEvent(accessToken, calendarId, task, assets, profile) {
      const body = buildGoogleEventBody(
        task,
        assets,
        profile,
        home.name,
        completions,
      );

      if (task.calendarEventId) {
        try {
          await googleFetch(
            accessToken,
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(task.calendarEventId)}`,
            {
              method: "PATCH",
              body: JSON.stringify(body),
            },
          );
          return task.calendarEventId;
        } catch {
          // PATCH failed: the event may be stale or already gone. Best-effort
          // delete it before creating a replacement so we don't leave a
          // duplicate behind on the calendar.
          try {
            await googleFetch(
              accessToken,
              `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(task.calendarEventId)}`,
              { method: "DELETE" },
            );
          } catch {
            // Ignore: the event is likely already deleted.
          }
        }
      }

      const created = await googleFetch<GoogleCalendarEvent>(
        accessToken,
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
        {
          method: "POST",
          body: JSON.stringify(body),
        },
      );

      if (!created.id) {
        throw new Error(`Failed to create calendar event for "${task.title}".`);
      }

      return created.id;
    },
    getCalendarId() {
      return home.googleCalendarId;
    },
    getOrphanedQueue() {
      return home.orphanedCalendarEvents?.google ?? EMPTY_ORPHANED_EVENTS.google;
    },
    applySyncResult(state, calendarId, tasks, orphanedQueue) {
      return {
        ...state,
        homes: state.homes.map((item) =>
          item.id === home.id
            ? {
                ...item,
                googleCalendarId: calendarId,
                orphanedCalendarEvents: {
                  google: orphanedQueue,
                  microsoft:
                    item.orphanedCalendarEvents?.microsoft ??
                    EMPTY_ORPHANED_EVENTS.microsoft,
                },
              }
            : item,
        ),
        tasks: [
          ...state.tasks.filter((task) => task.homeId !== home.id),
          ...tasks,
        ],
      };
    },
  };
}

export type { CalendarSyncResult } from "@/tools/home-maintenance/lib/calendar-sync-engine";

export async function syncHomeMaintenanceToGoogle(
  accessToken: string,
  state: HomeMaintenanceState,
  profile: HubProfile,
  homeId: string = state.activeHomeId,
) {
  const home = getHomeById(state, homeId);
  const scopedState: HomeMaintenanceState = {
    ...state,
    assets: getHomeAssets(state, homeId),
    tasks: getHomeTasks(state, homeId),
  };

  return runCalendarSync(
    accessToken,
    scopedState,
    profile,
    createGoogleAdapter(home, state.completions),
  );
}
