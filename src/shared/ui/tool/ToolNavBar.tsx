"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface ToolNavLink {
  href: string;
  label: string;
  isActive: (pathname: string) => boolean;
}

interface ToolNavBarProps {
  links: ToolNavLink[];
  ariaLabel: string;
}

export function ToolNavBar({ links, ariaLabel }: ToolNavBarProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label={ariaLabel}
      className="rounded-xl border border-border bg-surface p-1.5 shadow-[var(--shadow)]"
    >
      <div className="flex gap-1 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden">
        {links.map((link) => {
          const active = link.isActive(pathname);

          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`shrink-0 cursor-pointer rounded-lg px-4 py-2 text-center text-sm font-medium transition-all duration-200 ease-out sm:px-5 ${
                active
                  ? "bg-primary/12 font-semibold text-primary shadow-sm ring-1 ring-primary/20"
                  : "text-muted hover:bg-background hover:text-text"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
