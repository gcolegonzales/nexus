import { addDays, addMonths, format, isValid, parseISO } from "date-fns";
import type { HubProfile } from "@/core/profile/types";
import { normalizeCompletion } from "@/tools/home-maintenance/lib/completions";
import type { TaskCompletionRecord } from "@/tools/home-maintenance/types/completion";
import type { Task } from "@/tools/home-maintenance/types/task";

export function getScheduleAnchorDate(profile: HubProfile): Date {
  if (profile.homeSetupDate) {
    const parsed = parseISO(profile.homeSetupDate);
    if (isValid(parsed)) return parsed;
  }
  return new Date();
}

export function getTaskStartDate(
  profile: HubProfile,
  task: Task,
  lastCompletion?: TaskCompletionRecord,
): Date {
  const completion = normalizeCompletion(lastCompletion);
  if (completion?.at) {
    const completedAt = parseISO(completion.at);
    if (isValid(completedAt)) {
      const nextDue = addMonths(completedAt, task.intervalMonths);
      if (isValid(nextDue)) return nextDue;
    }
  }

  const anchor = getScheduleAnchorDate(profile);
  const start = addDays(anchor, task.startOffsetDays);
  return isValid(start) ? start : new Date();
}

export function formatIcsDate(date: Date): string {
  return format(date, "yyyyMMdd");
}

export function formatIcsDateTimeUtc(date: Date): string {
  return `${format(date, "yyyyMMdd'T'HHmmss'Z'")}`;
}

export function buildRecurrenceRule(intervalMonths: number): string {
  return `RRULE:FREQ=MONTHLY;INTERVAL=${Math.max(1, intervalMonths)}`;
}
