"use client";

import type { ReactNode } from "react";
import { ToolShell } from "@/shared/ui/tool/ToolShell";
import { ToolNav } from "@/tools/room-coat/components/ToolNav";
import { UnitSwitcher } from "@/tools/room-coat/components/UnitSwitcher";

export function ToolLayout({ children }: { children: ReactNode }) {
  return (
    <ToolShell
      nav={<ToolNav />}
      headerActions={
        <div className="flex flex-wrap items-center gap-2">
          <UnitSwitcher />
        </div>
      }
    >
      {children}
    </ToolShell>
  );
}
