"use client";

import type { ReactNode } from "react";
import { ProfileProvider } from "@/core/profile/ProfileProvider";
import { ConfirmProvider, ThemeProvider, ToastProvider } from "@nexus/ui";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ProfileProvider>
          <ConfirmProvider>{children}</ConfirmProvider>
        </ProfileProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
