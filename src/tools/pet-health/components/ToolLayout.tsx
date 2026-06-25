"use client";

import type { ReactNode } from "react";
import { ToolShell } from "@/shared/ui/tool/ToolShell";
import { ToolNav } from "@/tools/pet-health/components/ToolNav";
import { PetSelector } from "@/tools/pet-health/components/PetSelector";

export function ToolLayout({ children }: { children: ReactNode }) {
  return (
    <ToolShell
      nav={<ToolNav />}
      headerActions={
        <div className="flex flex-wrap items-center gap-2">
          <PetSelector />
        </div>
      }
    >
      {children}
    </ToolShell>
  );
}
