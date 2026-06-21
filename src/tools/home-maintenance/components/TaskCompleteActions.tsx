"use client";

import type { MouseEvent } from "react";
import type { HvacFilterCondition } from "@/tools/home-maintenance/types/completion";
import {
  HVAC_FILTER_CONDITION_LABELS,
  isHvacFilterInspectionTask,
  isHvacFilterReplacementTask,
} from "@/tools/home-maintenance/lib/task-templates";
import type { Task } from "@/tools/home-maintenance/types/task";
import { Button } from "@nexus/next";

interface TaskCompleteActionsProps {
  task: Task;
  replacementRecommended?: boolean;
  onMarkComplete: (options?: {
    condition?: HvacFilterCondition;
    alsoReplaceFilter?: boolean;
  }) => void | Promise<void>;
}

export function TaskCompleteActions({
  task,
  replacementRecommended = false,
  onMarkComplete,
}: TaskCompleteActionsProps) {
  if (isHvacFilterInspectionTask(task.templateKey)) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted">Record filter condition:</p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(HVAC_FILTER_CONDITION_LABELS) as HvacFilterCondition[]).map(
            (condition) => (
              <Button
                key={condition}
                variant={condition === "replace-needed" ? "primary" : "secondary"}
                onClick={(event: MouseEvent<HTMLButtonElement>) => {
                  event.stopPropagation();
                  void onMarkComplete({ condition });
                }}
              >
                {HVAC_FILTER_CONDITION_LABELS[condition]}
              </Button>
            ),
          )}
        </div>
        <Button
          variant="primary"
          onClick={(event: MouseEvent<HTMLButtonElement>) => {
            event.stopPropagation();
            void onMarkComplete({
              condition: "replace-needed",
              alsoReplaceFilter: true,
            });
          }}
        >
          Replace filter now
        </Button>
      </div>
    );
  }

  if (isHvacFilterReplacementTask(task.templateKey)) {
    return (
      <Button
        variant={replacementRecommended ? "primary" : "secondary"}
        onClick={(event: MouseEvent<HTMLButtonElement>) => {
          event.stopPropagation();
          void onMarkComplete();
        }}
      >
        Mark filter replaced
      </Button>
    );
  }

  return (
    <Button
      variant="secondary"
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        void onMarkComplete();
      }}
    >
      Mark complete locally
    </Button>
  );
}
