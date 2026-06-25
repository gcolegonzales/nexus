"use client";

import { ToolNavBar, type ToolNavLink } from "@/shared/ui/tool/ToolNavBar";

const links: ToolNavLink[] = [
  {
    href: "/tools/pet-health",
    label: "Overview",
    isActive: (pathname) => pathname === "/tools/pet-health",
  },
  {
    href: "/tools/pet-health/records",
    label: "Records",
    isActive: (pathname) =>
      pathname.startsWith("/tools/pet-health/records"),
  },
  {
    href: "/tools/pet-health/chat",
    label: "AI Chat",
    isActive: (pathname) =>
      pathname.startsWith("/tools/pet-health/chat"),
  },
  {
    href: "/tools/pet-health/settings",
    label: "Settings",
    isActive: (pathname) =>
      pathname.startsWith("/tools/pet-health/settings"),
  },
];

export function ToolNav() {
  return (
    <ToolNavBar links={links} ariaLabel="Pet health sections" />
  );
}
