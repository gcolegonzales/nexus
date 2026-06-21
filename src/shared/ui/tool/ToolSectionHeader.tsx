"use client";

import type { ReactNode } from "react";
import { StaggerItem } from "@nexus/ui";
import { useToolShellHeaderActions } from "@/shared/ui/tool/ToolShellContext";

interface ToolSectionHeaderProps {
  title?: string;
  description?: string;
  action?: ReactNode;
}

export function ToolSectionHeader({
  title,
  description,
  action,
}: ToolSectionHeaderProps) {
  const headerActions = useToolShellHeaderActions();
  const hasActions = Boolean(action || headerActions);

  if (!title && !description && !hasActions) return null;

  return (
    <StaggerItem className="relative z-30 mb-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          {title && (
            <h2 className="text-lg font-semibold tracking-tight text-text">
              {title}
            </h2>
          )}
          {description && (
            <p className="max-w-2xl text-sm leading-snug text-muted">
              {description}
            </p>
          )}
        </div>
        {hasActions && (
          <div className="relative z-30 flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
            {action}
            {headerActions}
          </div>
        )}
      </div>
    </StaggerItem>
  );
}
