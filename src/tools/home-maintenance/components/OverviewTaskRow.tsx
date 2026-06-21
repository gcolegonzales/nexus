"use client";

import { getAssetCardTitle } from "@/tools/home-maintenance/lib/asset-label";
import {
  formatTaskDueLabel,
  type TaskDueInfo,
} from "@/tools/home-maintenance/lib/task-due";
import { TaskCompleteActions } from "@/tools/home-maintenance/components/TaskCompleteActions";
import type { Asset } from "@/tools/home-maintenance/types/asset";
import type { Task } from "@/tools/home-maintenance/types/task";
import type { HvacFilterCondition } from "@/tools/home-maintenance/types/completion";
import { Badge } from "@nexus/ui";
import { Card } from "@nexus/ui";

interface OverviewTaskRowProps {
  task: Task;
  asset?: Asset;
  dueInfo: TaskDueInfo;
  replacementRecommended: boolean;
  onMarkComplete: (options?: {
    condition?: HvacFilterCondition;
    alsoReplaceFilter?: boolean;
  }) => void | Promise<void>;
}

function dueBadgeVariant(
  kind: TaskDueInfo["kind"],
  replacementRecommended: boolean,
): "amber" | "mint" | "sky" {
  if (replacementRecommended || kind === "overdue") return "amber";
  if (kind === "due-soon") return "amber";
  return "sky";
}

export function OverviewTaskRow({
  task,
  asset,
  dueInfo,
  replacementRecommended,
  onMarkComplete,
}: OverviewTaskRowProps) {
  const dueLabel = replacementRecommended
    ? "Replacement Recommended"
    : formatTaskDueLabel(dueInfo);

  return (
    <Card padding={false} className="overflow-hidden">
      <div className="flex flex-col gap-4 px-4 py-3.5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-text">{task.title}</h3>
            {asset && (
              <>
                <Badge variant="sky">{getAssetCardTitle(asset)}</Badge>
                {asset.model && <Badge variant="mint">{asset.model}</Badge>}
              </>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={dueBadgeVariant(dueInfo.kind, replacementRecommended)}>
              {dueLabel}
            </Badge>
            <span className="text-sm text-muted">
              Every {task.intervalMonths} month
              {task.intervalMonths === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        <div className="shrink-0 lg:pt-0.5">
          <TaskCompleteActions
            task={task}
            replacementRecommended={replacementRecommended}
            onMarkComplete={onMarkComplete}
          />
        </div>
      </div>
    </Card>
  );
}
