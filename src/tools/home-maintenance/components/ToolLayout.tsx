"use client";

import type { ReactNode } from "react";
import { ToolShell } from "@/shared/ui/tool/ToolShell";
import { HomeSwitcher } from "@/tools/home-maintenance/components/HomeSwitcher";
import { ToolNav } from "@/tools/home-maintenance/components/ToolNav";

export function ToolLayout({ children }: { children: ReactNode }) {
  return (
    <ToolShell nav={<ToolNav />} headerActions={<HomeSwitcher />}>
      {children}
    </ToolShell>
  );
}
