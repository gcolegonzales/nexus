"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { PageTransition } from "@nexus/next";
import { StaggerItem } from "@nexus/ui";

interface HubMainTransitionProps {
  children: ReactNode;
}

export function HubMainTransition({ children }: HubMainTransitionProps) {
  const pathname = usePathname();

  if (
    pathname.startsWith("/tools/") ||
    pathname === "/profile" ||
    pathname === "/settings" ||
    pathname.startsWith("/component-library")
  ) {
    return children;
  }

  return (
    <PageTransition>
      <StaggerItem>{children}</StaggerItem>
    </PageTransition>
  );
}
