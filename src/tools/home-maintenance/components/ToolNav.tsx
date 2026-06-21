"use client";

import { ToolNavBar, type ToolNavLink } from "@/shared/ui/tool/ToolNavBar";

const links: ToolNavLink[] = [
  {
    href: "/tools/home-maintenance",
    label: "Overview",
    isActive: (pathname) => pathname === "/tools/home-maintenance",
  },
  {
    href: "/tools/home-maintenance/assets",
    label: "Assets",
    isActive: (pathname) =>
      pathname.startsWith("/tools/home-maintenance/assets"),
  },
  {
    href: "/tools/home-maintenance/schedule",
    label: "Schedule",
    isActive: (pathname) =>
      pathname.startsWith("/tools/home-maintenance/schedule") ||
      pathname.startsWith("/tools/home-maintenance/tasks"),
  },
  {
    href: "/tools/home-maintenance/sync",
    label: "Calendar",
    isActive: (pathname) => pathname.startsWith("/tools/home-maintenance/sync"),
  },
];

export function ToolNav() {
  return (
    <ToolNavBar links={links} ariaLabel="Home maintenance sections" />
  );
}
