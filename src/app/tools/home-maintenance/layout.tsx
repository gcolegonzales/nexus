import type { ReactNode } from "react";
import { HomeMaintenanceProvider } from "@/tools/home-maintenance/HomeMaintenanceProvider";
import { ToolLayout } from "@/tools/home-maintenance/components/ToolLayout";

export default function HomeMaintenanceLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <HomeMaintenanceProvider>
      <ToolLayout>{children}</ToolLayout>
    </HomeMaintenanceProvider>
  );
}
