"use client";

import type { ReactNode } from "react";
import { ProfileProvider } from "@/core/profile/ProfileProvider";
import { ThemeProvider, ToastProvider } from "@nexus/ui";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ProfileProvider>{children}</ProfileProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
