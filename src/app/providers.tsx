"use client";

import type { ReactNode } from "react";
import { ProfileProvider } from "@/core/profile/ProfileProvider";
import { ThemeProvider } from "@nexus/ui";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ProfileProvider>{children}</ProfileProvider>
    </ThemeProvider>
  );
}
