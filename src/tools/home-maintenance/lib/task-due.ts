import {
  addMonths,
  differenceInDays,
  isBefore,
  startOfDay,
} from "date-fns";
import type { HubProfile } from "@/core/profile/types";
import { getTaskStartDate } from "@/tools/home-maintenance/lib/calendar-dates";
import { findAssetForTask } from "@/tools/home-maintenance/lib/schedule-generator";
import type { Asset } from "@/tools/home-maintenance/types/asset";
import type { TaskCompletionRecord } from "@/tools/home-maintenance/types/completion";
import type { Task } from "@/tools/home-maintenance/types/task";

export type TaskDueKind = "overdue" | "due-soon" | "upcoming";

export interface TaskDueInfo {
  due: Date;
  kind: TaskDueKind;
  daysUntil: number;
}

const DUE_SOON_DAYS = 30;

export function getCurrentTaskDueDate(
  profile: HubProfile,
  task: Task,
  lastCompletion?: TaskCompletionRecord,
): Date {
  let due = startOfDay(getTaskStartDate(profile, task, lastCompletion));
  const today = startOfDay(new Date());

  while (isBefore(addMonths(due, task.intervalMonths), today)) {
    due = addMonths(due, task.intervalMonths);
  }

  return due;
}

export function getTaskDueInfo(
  profile: HubProfile,
  task: Task,
  lastCompletion?: TaskCompletionRecord,
): TaskDueInfo {
  const due = getCurrentTaskDueDate(profile, task, lastCompletion);
  const today = startOfDay(new Date());
  const daysUntil = differenceInDays(due, today);

  if (daysUntil < 0) {
    return { due, kind: "overdue", daysUntil };
  }

  if (daysUntil <= DUE_SOON_DAYS) {
    return { due, kind: "due-soon", daysUntil };
  }

  return { due, kind: "upcoming", daysUntil };
}

export function formatTaskDueLabel(info: TaskDueInfo): string {
  if (info.kind === "overdue") {
    const days = Math.abs(info.daysUntil);
    return days === 0
      ? "Due Today"
      : `Overdue By ${days} Day${days === 1 ? "" : "s"}`;
  }

  if (info.daysUntil === 0) {
    return "Due Today";
  }

  if (info.daysUntil === 1) {
    return "Due Tomorrow";
  }

  if (info.kind === "due-soon") {
    return `Due In ${info.daysUntil} Days`;
  }

  return `Due ${info.due.toLocaleDateString()}`;
}

export interface CurrentTaskEntry {
  task: Task;
  dueInfo: TaskDueInfo;
  asset?: Asset;
  replacementRecommended: boolean;
}

export function getCurrentTasks(
  profile: HubProfile,
  tasks: Task[],
  assets: Asset[],
  completions: Record<string, TaskCompletionRecord>,
): CurrentTaskEntry[] {
  return tasks
    .filter((task) => task.enabled)
    .map((task) => {
      const asset = findAssetForTask(assets, task);
      const dueInfo = getTaskDueInfo(profile, task, completions[task.id]);
      const replacementRecommended = Boolean(asset?.hvac?.filter?.replacementNeeded);

      return { task, dueInfo, asset, replacementRecommended };
    })
    .filter(({ dueInfo, replacementRecommended }) => {
      return (
        replacementRecommended ||
        dueInfo.kind === "overdue" ||
        dueInfo.kind === "due-soon"
      );
    })
    .sort((a, b) => {
      if (a.replacementRecommended !== b.replacementRecommended) {
        return a.replacementRecommended ? -1 : 1;
      }
      if (a.dueInfo.kind !== b.dueInfo.kind) {
        const rank = { overdue: 0, "due-soon": 1, upcoming: 2 };
        return rank[a.dueInfo.kind] - rank[b.dueInfo.kind];
      }
      return a.dueInfo.due.getTime() - b.dueInfo.due.getTime();
    });
}
