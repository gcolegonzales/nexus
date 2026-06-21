import type { ReactNode } from "react";
import { RoomCoatProvider } from "@/tools/room-coat/RoomCoatProvider";
import { ToolLayout } from "@/tools/room-coat/components/ToolLayout";

export default function RoomCoatLayout({ children }: { children: ReactNode }) {
  return (
    <RoomCoatProvider>
      <ToolLayout>{children}</ToolLayout>
    </RoomCoatProvider>
  );
}
