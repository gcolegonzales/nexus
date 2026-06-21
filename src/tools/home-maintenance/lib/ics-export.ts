import { downloadBlob } from "@/shared/download/downloadBlob";
import type { HubProfile } from "@/core/profile/types";
import {
  buildRecurrenceRule,
  formatIcsDate,
  formatIcsDateTimeUtc,
  getTaskStartDate,
} from "@/tools/home-maintenance/lib/calendar-dates";
import {
  buildEventDescription,
  buildEventSummary,
  escapeIcsText,
} from "@/tools/home-maintenance/lib/event-description";
import type { Asset } from "@/tools/home-maintenance/types/asset";
import type { HomeMaintenanceState } from "@/tools/home-maintenance/types/state";
import type { Task } from "@/tools/home-maintenance/types/task";

export const HOME_MAINTENANCE_CALENDAR_NAME = "Home Maintenance";

function foldIcsLine(line: string): string {
  const max = 75;
  if (line.length <= max) return line;

  const parts = [line.slice(0, max)];
  let index = max;
  while (index < line.length) {
    parts.push(` ${line.slice(index, index + max - 1)}`);
    index += max - 1;
  }
  return parts.join("\r\n");
}

function buildVevent(
  task: Task,
  assets: Asset[],
  profile: HubProfile,
  homeName: string,
  stamp: Date,
  completions: HomeMaintenanceState["completions"],
): string {
  const start = getTaskStartDate(profile, task, completions[task.id]);
  const uid = `${task.id}@nexus-home-maintenance`;
  const lines = [
    "BEGIN:VEVENT",
    foldIcsLine(`UID:${uid}`),
    foldIcsLine(`DTSTAMP:${formatIcsDateTimeUtc(stamp)}`),
    foldIcsLine(`DTSTART;VALUE=DATE:${formatIcsDate(start)}`),
    foldIcsLine(
      `DTEND;VALUE=DATE:${formatIcsDate(new Date(start.getTime() + 86400000))}`,
    ),
    foldIcsLine(`SUMMARY:${escapeIcsText(buildEventSummary(task, assets))}`),
    foldIcsLine(
      `DESCRIPTION:${buildEventDescription(task, assets, {
        householdName: profile.householdName,
        homeName,
      })}`,
    ),
    foldIcsLine(buildRecurrenceRule(task.intervalMonths)),
    "BEGIN:VALARM",
    "TRIGGER:-P1D",
    "ACTION:DISPLAY",
    "DESCRIPTION:Home maintenance reminder",
    "END:VALARM",
    "END:VEVENT",
  ];

  return lines.join("\r\n");
}

export function buildHomeMaintenanceIcs(
  tasks: Task[],
  assets: Asset[],
  profile: HubProfile,
  homeName: string,
  completions: HomeMaintenanceState["completions"] = {},
): string {
  const stamp = new Date();
  const enabledTasks = tasks.filter((task) => task.enabled);
  const events = enabledTasks
    .map((task) =>
      buildVevent(task, assets, profile, homeName, stamp, completions),
    )
    .join("\r\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Nexus//Home Maintenance//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    foldIcsLine(`X-WR-CALNAME:${HOME_MAINTENANCE_CALENDAR_NAME}`),
    events,
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadHomeMaintenanceIcs(
  tasks: Task[],
  assets: Asset[],
  profile: HubProfile,
  homeName: string,
  completions: HomeMaintenanceState["completions"] = {},
): void {
  downloadBlob(
    buildHomeMaintenanceIcs(tasks, assets, profile, homeName, completions),
    "home-maintenance.ics",
    "text/calendar;charset=utf-8",
  );
}
