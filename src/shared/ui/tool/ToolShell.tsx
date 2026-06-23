"use client";

import type { ReactNode } from "react";
import { PageTransition } from "@nexus/next";
import { PAGE_CONTAINER } from "@/shared/ui/page-container";
import { ToolShellProvider } from "@/shared/ui/tool/ToolShellContext";

interface ToolShellProps {
  nav: ReactNode;
  headerActions?: ReactNode;
  children: ReactNode;
}

export function ToolShell({ nav, headerActions, children }: ToolShellProps) {
  return (
    <ToolShellProvider headerActions={headerActions}>
      <div className={`${PAGE_CONTAINER} pb-10 pt-5 sm:pt-6`}>
        {nav}
        <PageTransition className="mt-4">{children}</PageTransition>
      </div>
    </ToolShellProvider>
  );
}
