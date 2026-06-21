"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { StaggerGroup } from "@nexus/ui";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export function PageTransition({
  children,
  className = "",
}: PageTransitionProps) {
  const pathname = usePathname();

  return (
    <StaggerGroup resetKey={pathname} className={className}>
      {children}
    </StaggerGroup>
  );
}
