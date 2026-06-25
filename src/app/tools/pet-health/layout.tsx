import type { ReactNode } from "react";
import { PetHealthProvider } from "@/tools/pet-health/PetHealthProvider";
import { ToolLayout } from "@/tools/pet-health/components/ToolLayout";

export default function PetHealthLayout({ children }: { children: ReactNode }) {
  return (
    <PetHealthProvider>
      <ToolLayout>{children}</ToolLayout>
    </PetHealthProvider>
  );
}
