"use client";

import type { ReactNode } from "react";
import { PageTransition } from "@nexus/next";
import { ToolShellProvider } from "@/shared/ui/tool/ToolShellContext";

interface ToolShellProps {
  nav: ReactNode;
  headerActions?: ReactNode;
  children: ReactNode;
}

export function ToolShell({ nav, headerActions, children }: ToolShellProps) {
  return (
    <ToolShellProvider headerActions={headerActions}>
      <div className="mx-auto max-w-6xl px-4 pb-10 pt-5 sm:px-6 sm:pt-6">
        {nav}
        <PageTransition className="mt-4">{children}</PageTransition>
      </div>
    </ToolShellProvider>
  );
}
