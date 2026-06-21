"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useHubProfile } from "@/core/profile/ProfileProvider";
import { useHomeMaintenance } from "@/tools/home-maintenance/HomeMaintenanceProvider";
import { OverviewTaskRow } from "@/tools/home-maintenance/components/OverviewTaskRow";
import { taskRowNeedsAttention } from "@/tools/home-maintenance/components/TaskAccordionRow";
import { getCurrentTasks } from "@/tools/home-maintenance/lib/task-due";
import { ToolSection } from "@/tools/home-maintenance/components/ToolSection";
import { Button } from "@nexus/next";
import { Card } from "@nexus/ui";
import { Badge } from "@nexus/ui";
import { StaggerItem } from "@nexus/ui";

export default function HomeMaintenancePage() {
  const {
    activeHome,
    activeAssets,
    activeAllAssets,
    activeTasks,
    state,
    markTaskComplete,
  } = useHomeMaintenance();
  const { profile } = useHubProfile();

  const enabledTasks = activeTasks.filter((task) => task.enabled);
  const needsInfoCount = activeTasks.filter((task) =>
    taskRowNeedsAttention(task, activeAllAssets, activeHome.hvacFilterSize),
  ).length;

  const currentTasks = useMemo(
    () => getCurrentTasks(profile, activeTasks, activeAllAssets, state.completions),
    [profile, activeTasks, activeAllAssets, state.completions],
  );

  const overdueCount = currentTasks.filter(
    (entry) => entry.dueInfo.kind === "overdue",
  ).length;

  return (
    <ToolSection
      title="Overview"
      description={`What's due at ${activeHome.name} and what needs your attention.`}
    >
      <div className="grid gap-5 sm:grid-cols-3">
        <StaggerItem>
          <Card>
            <p className="text-sm text-muted">Assets</p>
            <p className="mt-2 text-3xl font-bold text-text">
              {activeAssets.length}
            </p>
          </Card>
        </StaggerItem>
        <StaggerItem>
          <Card>
            <p className="text-sm text-muted">Due now</p>
            <p className="mt-2 text-3xl font-bold text-text">
              {currentTasks.length}
            </p>
          </Card>
        </StaggerItem>
        <StaggerItem>
          <Card>
            <p className="text-sm text-muted">Needs info</p>
            <p className="mt-2 text-3xl font-bold text-text">
              {needsInfoCount}
            </p>
          </Card>
        </StaggerItem>
      </div>

      {needsInfoCount > 0 && (
        <StaggerItem className="mt-6">
          <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="font-medium text-text">
                {needsInfoCount} task{needsInfoCount === 1 ? "" : "s"} missing
                details
              </p>
              <p className="text-sm text-muted">
                Add install dates, models, or filter sizes on the Assets or
                Schedule tabs.
              </p>
            </div>
            <Button variant="secondary" href="/tools/home-maintenance/assets">
              Review assets
            </Button>
          </Card>
        </StaggerItem>
      )}

      <StaggerItem className="mt-8">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-text">Current tasks</h3>
            <p className="text-sm text-muted">
              Overdue, due within 30 days, or flagged for replacement.
              {overdueCount > 0 && (
                <>
                  {" "}
                  <Badge variant="amber" className="ml-1">
                    {overdueCount} Overdue
                  </Badge>
                </>
              )}
            </p>
          </div>
          <Link
            href="/tools/home-maintenance/schedule"
            className="text-sm font-medium text-primary hover:underline"
          >
            View full schedule
          </Link>
        </div>

        {currentTasks.length === 0 ? (
          <Card className="space-y-5 py-10 text-center">
            <p className="font-medium text-text">Nothing due right now</p>
            <p className="mx-auto max-w-md text-sm text-muted">
              You have {enabledTasks.length} active task
              {enabledTasks.length === 1 ? "" : "s"} on the calendar. Check back
              as due dates approach.
            </p>
            <div className="pt-1">
              <Button variant="secondary" href="/tools/home-maintenance/schedule">
                Open schedule
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid gap-3">
            {currentTasks.map((entry) => (
              <StaggerItem key={entry.task.id}>
                <OverviewTaskRow
                  task={entry.task}
                  asset={entry.asset}
                  dueInfo={entry.dueInfo}
                  replacementRecommended={entry.replacementRecommended}
                  onMarkComplete={(options) =>
                    markTaskComplete(entry.task.id, options)
                  }
                />
              </StaggerItem>
            ))}
          </div>
        )}
      </StaggerItem>
    </ToolSection>
  );
}
