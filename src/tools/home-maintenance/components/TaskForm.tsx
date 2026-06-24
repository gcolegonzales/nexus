"use client";

import { getAssetLabel } from "@/tools/home-maintenance/lib/asset-label";
import { findAssetForTask } from "@/tools/home-maintenance/lib/schedule-generator";
import { taskNeedsInfo } from "@/tools/home-maintenance/lib/needs-info";
import { NeedsInfoBadge } from "@/tools/home-maintenance/components/NeedsInfoBadge";
import type { Asset } from "@/tools/home-maintenance/types/asset";
import type { BuyLink, Part, Task } from "@/tools/home-maintenance/types/task";
import { Input, Textarea } from "@nexus/ui";
import { Checkbox } from "@nexus/ui";

const disabledFieldClass =
  "cursor-pointer disabled:cursor-not-allowed disabled:bg-border/30 disabled:text-text disabled:opacity-100";

const editRowInputClass =
  "w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none focus:border-primary";

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

  function setPart(index: number, patch: Partial<Part>) {
    update(
      "parts",
      task.parts.map((part, i) => (i === index ? { ...part, ...patch } : part)),
    );
  }
  function addPart() {
    update("parts", [...task.parts, { name: "" }]);
  }
  function removePart(index: number) {
    update(
      "parts",
      task.parts.filter((_, i) => i !== index),
    );
  }
  function setLink(index: number, patch: Partial<BuyLink>) {
    update(
      "links",
      task.links.map((link, i) => (i === index ? { ...link, ...patch } : link)),
    );
  }
  function addLink() {
    update("links", [...task.links, { label: "", url: "" }]);
  }
  function removeLink(index: number) {
    update(
      "links",
      task.links.filter((_, i) => i !== index),
    );
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

      {readOnly
        ? (task.parts.length > 0 || task.links.length > 0) && (
            <div className="space-y-4 rounded-xl border border-border bg-border/20 p-4">
              {task.parts.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-text">Parts</h4>
                  <ul className="space-y-2 text-sm text-muted">
                    {task.parts.map((part, index) => (
                      <li key={`${part.name}-${part.partNumber ?? "part"}-${index}`}>
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
                    {task.links.map((link, index) => (
                      <li key={`${link.url}-${index}`}>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          {link.label || link.url}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )
        : (
            <div className="space-y-5 rounded-xl border border-border bg-border/20 p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-text">Parts</h4>
                  <button
                    type="button"
                    onClick={addPart}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    + Add part
                  </button>
                </div>
                {task.parts.length === 0 && (
                  <p className="text-sm text-muted">No parts added.</p>
                )}
                {task.parts.map((part, index) => (
                  <div
                    key={index}
                    className="grid items-center gap-2 sm:grid-cols-[1.5fr_1fr_1fr_auto]"
                  >
                    <input
                      aria-label="Part name"
                      placeholder="Name"
                      value={part.name}
                      onChange={(event) =>
                        setPart(index, { name: event.target.value })
                      }
                      className={editRowInputClass}
                    />
                    <input
                      aria-label="Part number"
                      placeholder="Part #"
                      value={part.partNumber ?? ""}
                      onChange={(event) =>
                        setPart(index, {
                          partNumber: event.target.value || undefined,
                        })
                      }
                      className={editRowInputClass}
                    />
                    <input
                      aria-label="Part type"
                      placeholder="Type"
                      value={part.type ?? ""}
                      onChange={(event) =>
                        setPart(index, { type: event.target.value || undefined })
                      }
                      className={editRowInputClass}
                    />
                    <button
                      type="button"
                      onClick={() => removePart(index)}
                      className="rounded-xl border border-border px-3 py-2.5 text-sm font-medium text-muted hover:text-danger"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-text">Links</h4>
                  <button
                    type="button"
                    onClick={addLink}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    + Add link
                  </button>
                </div>
                {task.links.length === 0 && (
                  <p className="text-sm text-muted">No links added.</p>
                )}
                {task.links.map((link, index) => (
                  <div
                    key={index}
                    className="grid items-center gap-2 sm:grid-cols-[1fr_1.5fr_auto]"
                  >
                    <input
                      aria-label="Link label"
                      placeholder="Label"
                      value={link.label}
                      onChange={(event) =>
                        setLink(index, { label: event.target.value })
                      }
                      className={editRowInputClass}
                    />
                    <input
                      aria-label="Link URL"
                      placeholder="https://…"
                      value={link.url}
                      onChange={(event) =>
                        setLink(index, { url: event.target.value })
                      }
                      className={editRowInputClass}
                    />
                    <button
                      type="button"
                      onClick={() => removeLink(index)}
                      className="rounded-xl border border-border px-3 py-2.5 text-sm font-medium text-muted hover:text-danger"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

      {showNeedsInfoBadge && <NeedsInfoBadge flags={flags} />}
    </div>
  );
}
