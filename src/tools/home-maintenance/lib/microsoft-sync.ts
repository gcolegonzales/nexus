import { addDays, format, getDate } from "date-fns";
import type { HubProfile } from "@/core/profile/types";
import type { CalendarSyncAdapter } from "@/tools/home-maintenance/lib/calendar-sync-engine";
import { runCalendarSync } from "@/tools/home-maintenance/lib/calendar-sync-engine";
import { getTaskStartDate } from "@/tools/home-maintenance/lib/calendar-dates";
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

interface GraphCalendar {
  id: string;
  name?: string;
}

interface GraphEvent {
  id?: string;
}

async function graphFetch<T>(
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
    throw new Error(text || `Microsoft Graph error (${response.status})`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function getTimeZone(profile: HubProfile): string {
  return profile.timezone || "UTC";
}

function buildMicrosoftEventBody(
  task: Task,
  assets: Asset[],
  profile: HubProfile,
  homeName: string,
  completions: HomeMaintenanceState["completions"],
) {
  const start = getTaskStartDate(profile, task, completions[task.id]);
  const end = addDays(start, 1);
  const timeZone = getTimeZone(profile);
  const startDate = format(start, "yyyy-MM-dd");
  const dayOfMonth = Math.min(getDate(start), 28);

  return {
    subject: buildEventSummary(task, assets),
    body: {
      contentType: "Text",
      content: buildEventDescriptionPlain(task, assets, {
        householdName: profile.householdName,
        homeName,
      }),
    },
    start: {
      dateTime: `${startDate}T00:00:00`,
      timeZone,
    },
    end: {
      dateTime: `${format(end, "yyyy-MM-dd")}T00:00:00`,
      timeZone,
    },
    isAllDay: true,
    recurrence: {
      pattern: {
        type: "absoluteMonthly",
        interval: Math.max(1, task.intervalMonths),
        dayOfMonth,
      },
      range: {
        type: "noEnd",
        startDate,
        recurrenceTimeZone: timeZone,
      },
    },
    reminderMinutesBeforeStart: 24 * 60,
  };
}

const microsoftAdapterCore: Omit<
  CalendarSyncAdapter,
  "getCalendarId" | "getOrphanedQueue" | "applySyncResult"
> = {
  async ensureCalendar(accessToken, existingCalendarId) {
    if (existingCalendarId) {
      try {
        await graphFetch<GraphCalendar>(
          accessToken,
          `https://graph.microsoft.com/v1.0/me/calendars/${encodeURIComponent(existingCalendarId)}`,
        );
        return existingCalendarId;
      } catch {
        // Calendar missing — recreate below.
      }
    }

    const list = await graphFetch<{ value?: GraphCalendar[] }>(
      accessToken,
      "https://graph.microsoft.com/v1.0/me/calendars",
    );

    const existing = list.value?.find(
      (item) => item.name === HOME_MAINTENANCE_CALENDAR_NAME,
    );
    if (existing?.id) return existing.id;

    const created = await graphFetch<GraphCalendar>(
      accessToken,
      "https://graph.microsoft.com/v1.0/me/calendars",
      {
        method: "POST",
        body: JSON.stringify({ name: HOME_MAINTENANCE_CALENDAR_NAME }),
      },
    );

    if (!created.id) {
      throw new Error("Failed to create Outlook calendar.");
    }

    return created.id;
  },

  async upsertEvent() {
    throw new Error("Use createMicrosoftAdapter(home) for scoped sync.");
  },

  async deleteEvent(accessToken, calendarId, eventId) {
    await graphFetch(
      accessToken,
      `https://graph.microsoft.com/v1.0/me/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      { method: "DELETE" },
    );
  },

  getEventId(task) {
    return task.microsoftCalendarEventId;
  },

  withEventId(task, eventId) {
    return { ...task, microsoftCalendarEventId: eventId };
  },
};

function createMicrosoftAdapter(
  home: Home,
  completions: HomeMaintenanceState["completions"],
): CalendarSyncAdapter {
  return {
    ...microsoftAdapterCore,
    async upsertEvent(accessToken, calendarId, task, assets, profile) {
      const body = buildMicrosoftEventBody(
        task,
        assets,
        profile,
        home.name,
        completions,
      );

      if (task.microsoftCalendarEventId) {
        try {
          await graphFetch(
            accessToken,
            `https://graph.microsoft.com/v1.0/me/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(task.microsoftCalendarEventId)}`,
            {
              method: "PATCH",
              body: JSON.stringify(body),
            },
          );
          return task.microsoftCalendarEventId;
        } catch {
          // PATCH failed: best-effort delete the (possibly stale) event before
          // creating a replacement so we don't leave a duplicate behind.
          try {
            await graphFetch(
              accessToken,
              `https://graph.microsoft.com/v1.0/me/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(task.microsoftCalendarEventId)}`,
              { method: "DELETE" },
            );
          } catch {
            // Ignore: the event is likely already deleted.
          }
        }
      }

      const created = await graphFetch<GraphEvent>(
        accessToken,
        `https://graph.microsoft.com/v1.0/me/calendars/${encodeURIComponent(calendarId)}/events`,
        {
          method: "POST",
          body: JSON.stringify(body),
        },
      );

      if (!created.id) {
        throw new Error(`Failed to create Outlook event for "${task.title}".`);
      }

      return created.id;
    },
    getCalendarId() {
      return home.microsoftCalendarId;
    },
    getOrphanedQueue() {
      return (
        home.orphanedCalendarEvents?.microsoft ?? EMPTY_ORPHANED_EVENTS.microsoft
      );
    },
    applySyncResult(state, calendarId, tasks, orphanedQueue) {
      return {
        ...state,
        homes: state.homes.map((item) =>
          item.id === home.id
            ? {
                ...item,
                microsoftCalendarId: calendarId,
                orphanedCalendarEvents: {
                  google:
                    item.orphanedCalendarEvents?.google ??
                    EMPTY_ORPHANED_EVENTS.google,
                  microsoft: orphanedQueue,
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

export async function syncHomeMaintenanceToMicrosoft(
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
    createMicrosoftAdapter(home, state.completions),
  );
}
