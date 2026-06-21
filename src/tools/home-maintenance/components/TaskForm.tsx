"use client";

import { getAssetLabel } from "@/tools/home-maintenance/lib/asset-label";
import { findAssetForTask } from "@/tools/home-maintenance/lib/schedule-generator";
import { taskNeedsInfo } from "@/tools/home-maintenance/lib/needs-info";
import { NeedsInfoBadge } from "@/tools/home-maintenance/components/NeedsInfoBadge";
import type { Asset } from "@/tools/home-maintenance/types/asset";
import type { Task } from "@/tools/home-maintenance/types/task";
import { Input, Textarea } from "@nexus/ui";
import { Checkbox } from "@nexus/ui";

const disabledFieldClass =
  "cursor-pointer disabled:cursor-not-allowed disabled:bg-border/30 disabled:text-text disabled:opacity-100";

interface TaskFormProps {
  task: Task;
  assets: Asset[];
  hvacFilterSize?: string;
  readOnly?: boolean;
  showNeedsInfoBadge?: boolean;
  onChange: (task: Task) => void;
}

export function TaskForm({
  task,
  assets,
  hvacFilterSize,
  readOnly = false,
  showNeedsInfoBadge = true,
  onChange,
}: TaskFormProps) {
  const asset = findAssetForTask(assets, task);
  const flags = taskNeedsInfo(task, asset, hvacFilterSize);

  function update<K extends keyof Task>(field: K, value: Task[K]) {
    if (readOnly) return;
    onChange({ ...task, [field]: value });
  }

  return (
    <div className="space-y-5">
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-text">Asset</span>
        <select
          value={task.assetId}
          disabled
          className={`w-full cursor-pointer rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none disabled:cursor-not-allowed ${disabledFieldClass}`}
        >
          {assets.map((item) => (
            <option key={item.id} value={item.id}>
              {getAssetLabel(item)}
            </option>
          ))}
        </select>
      </label>

      <Checkbox
        label="Task enabled"
        hint="When enabled, this task appears in your schedule and calendar sync."
        checked={task.enabled}
        disabled={readOnly}
        onChange={(event) => update("enabled", event.target.checked)}
      />

      <Input
        label="Title"
        value={task.title}
        disabled={readOnly}
        onChange={(event) => update("title", event.target.value)}
        className={disabledFieldClass}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Interval (months)"
          type="number"
          min={1}
          value={task.intervalMonths}
          disabled={readOnly}
          onChange={(event) =>
            update("intervalMonths", Math.max(1, Number(event.target.value) || 1))
          }
          className={disabledFieldClass}
        />
        <Input
          label="Start offset (days)"
          type="number"
          min={0}
          value={task.startOffsetDays}
          disabled={readOnly}
          onChange={(event) =>
            update(
              "startOffsetDays",
              Math.max(0, Number(event.target.value) || 0),
            )
          }
          hint="Days after setup before the first occurrence."
          className={disabledFieldClass}
        />
      </div>

      <Textarea
        label="Instructions"
        value={task.instructions}
        disabled={readOnly}
        onChange={(event) => update("instructions", event.target.value)}
        className={disabledFieldClass}
      />

      {(task.parts.length > 0 || task.links.length > 0) && (
        <div className="space-y-4 rounded-xl border border-border bg-border/20 p-4">
          {task.parts.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-text">Parts</h4>
              <ul className="space-y-2 text-sm text-muted">
                {task.parts.map((part) => (
                  <li key={`${part.name}-${part.partNumber ?? "part"}`}>
                    <span className="font-medium text-text">{part.name}</span>
                    {part.partNumber ? ` · ${part.partNumber}` : ""}
                    {part.type ? ` (${part.type})` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {task.links.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-text">Links</h4>
              <ul className="space-y-2">
                {task.links.map((link) => (
                  <li key={link.url}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {showNeedsInfoBadge && <NeedsInfoBadge flags={flags} />}
    </div>
  );
}
