"use client";

import type { ReactNode } from "react";
import { ToolShell } from "@/shared/ui/tool/ToolShell";
import { ToolNav } from "@/tools/pet-health/components/ToolNav";

export function ToolLayout({ children }: { children: ReactNode }) {
  return (
    <ToolShell nav={<ToolNav />}>
      {children}
    </ToolShell>
  );
}
