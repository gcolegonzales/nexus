import { createId } from "@/shared/ids/createId";
import { findHouseAsset } from "@/tools/home-maintenance/lib/house-asset";
import { TASK_TEMPLATES } from "@/tools/home-maintenance/lib/default-tasks";
import type { Asset } from "@/tools/home-maintenance/types/asset";
import type { Home } from "@/tools/home-maintenance/types/home";
import type { Task, TaskTemplate } from "@/tools/home-maintenance/types/task";

function taskKey(homeId: string, templateKey: string, assetId: string): string {
  return `${homeId}:${templateKey}:${assetId}`;
}

function resolveIntervalMonths(
  template: TaskTemplate,
  ctx: {
    hvacFilter?: import("@/tools/home-maintenance/types/asset").HvacFilterInfo;
  },
): number {
  if (template.templateKey === "hvac-filter-inspection") {
    return ctx.hvacFilter?.inspectionIntervalMonths ?? template.intervalMonths;
  }
  if (template.templateKey === "hvac-filter-replacement") {
    return ctx.hvacFilter?.replacementIntervalMonths ?? template.intervalMonths;
  }
  return template.intervalMonths;
}

const USER_EDITABLE_FIELDS: (keyof Task)[] = [
  "enabled",
  "intervalMonths",
  "startOffsetDays",
  "instructions",
  "title",
  "parts",
  "links",
  "calendarEventId",
  "microsoftCalendarEventId",
];

function pickUserEdits(existing: Task): Partial<Task> {
  const picked: Partial<Task> = { id: existing.id };
  for (const field of USER_EDITABLE_FIELDS) {
    (picked as Record<string, unknown>)[field] = existing[field];
  }
  return picked;
}

export function generateSchedule(
  home: Home,
  assets: Asset[],
  existingTasks: Task[] = [],
): Task[] {
  const houseAsset = findHouseAsset(assets, home.id);
  if (!houseAsset) {
    return [];
  }

  const applianceAssets = assets.filter((asset) => asset.category !== "house");
  const existingByKey = new Map(
    existingTasks.map((task) => [
      taskKey(home.id, task.templateKey, task.assetId),
      task,
    ]),
  );

  const generated: Task[] = [];

  for (const template of TASK_TEMPLATES) {
    if (template.assetCategory === "house") {
      const ctx = {
        home,
        asset: houseAsset,
        assets: applianceAssets,
        hvacFilterSize: home.hvacFilterSize,
        hvacFilter: undefined,
      };
      const enabled = template.isEnabled ? template.isEnabled(ctx) : true;
      const key = taskKey(home.id, template.templateKey, houseAsset.id);
      const previous = existingByKey.get(key);

      const base: Task = {
        id: previous?.id ?? createId(),
        homeId: home.id,
        templateKey: template.templateKey,
        assetId: houseAsset.id,
        title: template.title,
        intervalMonths: resolveIntervalMonths(template, ctx),
        startOffsetDays: template.startOffsetDays,
        instructions: template.buildInstructions(ctx),
        parts: template.buildParts(ctx),
        links: template.buildLinks(ctx),
        enabled,
        calendarEventId: previous?.calendarEventId,
        microsoftCalendarEventId: previous?.microsoftCalendarEventId,
      };

      const merged = previous
        ? ({ ...base, ...pickUserEdits(previous) } as Task)
        : base;

      if (template.isEnabled && !template.isEnabled(ctx)) {
        merged.enabled = false;
      }

      generated.push(merged);
      continue;
    }

    for (const asset of applianceAssets.filter(
      (item) => item.category === template.assetCategory,
    )) {
      const ctx = {
        home,
        asset,
        assets: applianceAssets,
        hvacFilterSize: home.hvacFilterSize ?? asset.hvac?.filter?.size,
        hvacFilter: asset.hvac?.filter,
      };
      const enabled = template.isEnabled ? template.isEnabled(ctx) : true;
      const key = taskKey(home.id, template.templateKey, asset.id);
      const previous = existingByKey.get(key);

      const base: Task = {
        id: previous?.id ?? createId(),
        homeId: home.id,
        templateKey: template.templateKey,
        assetId: asset.id,
        title: template.title,
        intervalMonths: resolveIntervalMonths(template, ctx),
        startOffsetDays: template.startOffsetDays,
        instructions: template.buildInstructions(ctx),
        parts: template.buildParts(ctx),
        links: template.buildLinks(ctx),
        enabled,
        calendarEventId: previous?.calendarEventId,
        microsoftCalendarEventId: previous?.microsoftCalendarEventId,
      };

      const merged = previous
        ? ({ ...base, ...pickUserEdits(previous) } as Task)
        : base;

      if (template.isEnabled && !template.isEnabled(ctx)) {
        merged.enabled = false;
      }

      generated.push(merged);
    }
  }

  return generated.sort((a, b) => a.title.localeCompare(b.title));
}

export function findAssetForTask(assets: Asset[], task: Task): Asset | undefined {
  return assets.find((asset) => asset.id === task.assetId);
}

export function findHomeNameForTask(
  homes: Home[],
  task: Task,
): string | undefined {
  return homes.find((home) => home.id === task.homeId)?.name;
}
