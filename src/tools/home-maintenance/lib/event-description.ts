import type { HubProfile } from "@/core/profile/types";
import { getAssetLabel } from "@/tools/home-maintenance/lib/asset-label";
import { findAssetForTask } from "@/tools/home-maintenance/lib/schedule-generator";
import type { Asset } from "@/tools/home-maintenance/types/asset";
import type { Task } from "@/tools/home-maintenance/types/task";

export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

interface EventDescriptionOptions {
  householdName?: string;
  homeName?: string;
}

export function buildEventDescriptionPlain(
  task: Task,
  assets: Asset[],
  options: EventDescriptionOptions = {},
): string {
  const asset = findAssetForTask(assets, task);
  const lines: string[] = [];

  if (options.homeName) {
    lines.push(`Home: ${options.homeName}`);
  }

  if (options.householdName) {
    lines.push(`Household: ${options.householdName}`);
  }

  lines.push(task.instructions);

  if (asset) {
    const modelLine = [asset.brand, asset.model].filter(Boolean).join(" ");
    if (modelLine) lines.push(`Model: ${modelLine}`);
    if (asset.nickname) lines.push(`Asset: ${asset.nickname}`);
  }

  if (task.parts.length > 0) {
    lines.push("Parts:");
    for (const part of task.parts) {
      const bits = [part.name];
      if (part.partNumber) bits.push(`Part #: ${part.partNumber}`);
      if (part.type) bits.push(`Type: ${part.type}`);
      lines.push(`- ${bits.join(" · ")}`);
    }
  }

  if (task.links.length > 0) {
    lines.push("Links:");
    for (const link of task.links) {
      lines.push(`- ${link.label}: ${link.url}`);
    }
  }

  lines.push("—");
  lines.push("Managed by Nexus Home Maintenance");

  return lines.join("\n");
}

export function buildEventDescription(
  task: Task,
  assets: Asset[],
  options: EventDescriptionOptions = {},
): string {
  return escapeIcsText(buildEventDescriptionPlain(task, assets, options));
}

export function buildEventSummary(task: Task, assets: Asset[]): string {
  const asset = findAssetForTask(assets, task);
  if (!asset) return task.title;
  const label = getAssetLabel(asset);
  if (label === task.title || label === asset.category) return task.title;
  return `${task.title} (${label})`;
}
