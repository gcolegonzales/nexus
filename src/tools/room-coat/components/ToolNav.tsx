"use client";

import { ToolNavBar, type ToolNavLink } from "@/shared/ui/tool/ToolNavBar";

const links: ToolNavLink[] = [
  {
    href: "/tools/room-coat",
    label: "Overview",
    isActive: (pathname) => pathname === "/tools/room-coat",
  },
  {
    href: "/tools/room-coat/rooms",
    label: "Rooms",
    isActive: (pathname) => pathname.startsWith("/tools/room-coat/rooms"),
  },
  {
    href: "/tools/room-coat/paints",
    label: "Paints",
    isActive: (pathname) => pathname.startsWith("/tools/room-coat/paints"),
  },
  {
    href: "/tools/room-coat/schedule",
    label: "Schedule",
    isActive: (pathname) => pathname.startsWith("/tools/room-coat/schedule"),
  },
];

export function ToolNav() {
  return <ToolNavBar links={links} ariaLabel="Room Coat sections" />;
}
