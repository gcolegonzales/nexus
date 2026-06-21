"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { useHomeMaintenance } from "@/tools/home-maintenance/HomeMaintenanceProvider";
import { TaskForm } from "@/tools/home-maintenance/components/TaskForm";
import { TaskCompleteActions } from "@/tools/home-maintenance/components/TaskCompleteActions";
import { getAssetCardTitle } from "@/tools/home-maintenance/lib/asset-label";
import { findAssetForTask } from "@/tools/home-maintenance/lib/schedule-generator";
import { taskNeedsInfo } from "@/tools/home-maintenance/lib/needs-info";
import { NeedsInfoBadge } from "@/tools/home-maintenance/components/NeedsInfoBadge";
import { getCompletionAt, getCompletionCondition } from "@/tools/home-maintenance/lib/completions";
import {
  HVAC_FILTER_CONDITION_LABELS,
  isHvacFilterInspectionTask,
  isHvacFilterTask,
} from "@/tools/home-maintenance/lib/task-templates";
import type { Asset } from "@/tools/home-maintenance/types/asset";
import type { TaskCompletionRecord } from "@/tools/home-maintenance/types/completion";
import type { Task } from "@/tools/home-maintenance/types/task";
import { EditIcon } from "@nexus/ui";
import { IconActionButton } from "@nexus/ui";
import { FormActions } from "@nexus/next";
import { AccordionCaret } from "@nexus/ui";
import { Collapsible } from "@nexus/ui";
import { Badge } from "@nexus/ui";
import { Card } from "@nexus/ui";
import {
  accordionCardClassName,
  accordionCardTransitionClassName,
  accordionHeaderClassName,
  accordionPanelClassName,
} from "@/tools/home-maintenance/components/accordion-styles";

interface TaskAccordionRowProps {
  task: Task;
  assets: Asset[];
  hvacFilterSize?: string;
  completion?: TaskCompletionRecord;
}

export function TaskAccordionRow({
  task,
  assets,
  hvacFilterSize,
  completion,
}: TaskAccordionRowProps) {
  const { updateTask, markTaskComplete } = useHomeMaintenance();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Task>(task);
  const panelId = `task-panel-${task.id}`;

  const summaryTask = editing ? task : draft;
  const asset = findAssetForTask(assets, summaryTask);
  const flags = taskNeedsInfo(summaryTask, asset, hvacFilterSize);
  const completedAt = getCompletionAt(completion);
  const completionCondition = getCompletionCondition(completion);
  const replacementRecommended = Boolean(asset?.hvac?.filter?.replacementNeeded);

  useEffect(() => {
    if (!editing) {
      setDraft(task);
    }
  }, [task, editing]);

  function handleHeaderClick() {
    if (open && editing) {
      setDraft(task);
      setEditing(false);
      setOpen(false);
      return;
    }

    if (open) {
      setOpen(false);
      return;
    }

    setEditing(false);
    setDraft(task);
    setOpen(true);
  }

  function handleEditClick(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    setDraft(task);
    setEditing(true);
    setOpen(true);
  }

  function handleCancel(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    setDraft(task);
    setEditing(false);
    setOpen(false);
  }

  async function handleSave(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    await updateTask(draft.id, {
      enabled: draft.enabled,
      title: draft.title,
      intervalMonths: draft.intervalMonths,
      startOffsetDays: draft.startOffsetDays,
      instructions: draft.instructions,
    });
    setEditing(false);
  }

  return (
    <Card
      padding={false}
      className={`${accordionCardTransitionClassName} ${accordionCardClassName(open)}`}
    >
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={handleHeaderClick}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleHeaderClick();
          }
        }}
        className={accordionHeaderClassName(open)}
      >
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-text">{summaryTask.title}</h3>
            {asset && (
              <>
                <Badge variant="sky">{getAssetCardTitle(asset)}</Badge>
                {asset.model && <Badge variant="mint">{asset.model}</Badge>}
              </>
            )}
            {!summaryTask.enabled && <Badge>Disabled</Badge>}
            {completedAt && !isHvacFilterTask(task.templateKey) && (
              <Badge variant="mint">Completed Locally</Badge>
            )}
            {completionCondition && isHvacFilterInspectionTask(task.templateKey) && (
              <Badge variant="mint">
                Last: {HVAC_FILTER_CONDITION_LABELS[completionCondition]}
              </Badge>
            )}
            {replacementRecommended && (
              <Badge variant="amber">Replacement Recommended</Badge>
            )}
          </div>
          <p className="text-sm text-muted">
            Every {summaryTask.intervalMonths} month
            {summaryTask.intervalMonths === 1 ? "" : "s"}
          </p>
          <NeedsInfoBadge flags={flags} />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {!editing && (
            <IconActionButton
              label={`Edit ${summaryTask.title}`}
              onClick={handleEditClick}
            >
              <EditIcon />
            </IconActionButton>
          )}
          <AccordionCaret open={open} />
        </div>
      </div>

      <Collapsible open={open} id={panelId} innerClassName={accordionPanelClassName}>
        <div onClick={(event) => event.stopPropagation()}>
          {completedAt && !editing && (
            <Badge variant="mint" className="mb-4">
              Last Completed {new Date(completedAt).toLocaleDateString()}
              {completionCondition &&
                isHvacFilterInspectionTask(task.templateKey) &&
                ` · ${HVAC_FILTER_CONDITION_LABELS[completionCondition]}`}
            </Badge>
          )}

          <TaskForm
            task={draft}
            assets={assets}
            hvacFilterSize={hvacFilterSize}
            readOnly={!editing}
            showNeedsInfoBadge={false}
            onChange={setDraft}
          />

          {!editing && (
            <FormActions
              left={
                <TaskCompleteActions
                  task={task}
                  replacementRecommended={replacementRecommended}
                  onMarkComplete={(options) => markTaskComplete(task.id, options)}
                />
              }
            />
          )}

          {editing && (
            <FormActions
              onCancel={handleCancel}
              onSave={(event) => void handleSave(event)}
            />
          )}
        </div>
      </Collapsible>
    </Card>
  );
}

export function taskRowNeedsAttention(
  task: Task,
  assets: Asset[],
  hvacFilterSize?: string,
): boolean {
  const asset = findAssetForTask(assets, task);
  return taskNeedsInfo(task, asset, hvacFilterSize).length > 0;
}
