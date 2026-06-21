"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { AccordionCaret } from "@nexus/ui";
import { PopoverPanel } from "@nexus/ui";
import { ThemeToggle } from "@nexus/ui";

const menuLinks = [
  { href: "/profile", label: "Profile" },
  { href: "/settings", label: "Settings" },
];

function MenuIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden
      className="h-5 w-5 text-muted"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="10" cy="7" r="3" />
      <path d="M4.5 16.5c0-2.76 2.46-5 5.5-5s5.5 2.24 5.5 5" />
    </svg>
  );
}

export function HubMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="menu"
        onClick={() => setOpen((current) => !current)}
        className={`btn-interactive flex cursor-pointer items-center gap-2 rounded-xl border bg-surface px-3 py-2 text-sm font-medium text-text transition-all duration-200 ease-out hover:border-primary/30 ${
          open ? "border-primary/40 shadow-sm" : "border-border"
        }`}
      >
        <MenuIcon />
        <span className="hidden sm:inline">Account</span>
        <AccordionCaret open={open} />
      </button>

      <PopoverPanel
        open={open}
        id={menuId}
        align="end"
        className="right-0 w-56 overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-lg"
      >
        <ul role="menu" aria-label="Account menu">
          {menuLinks.map((link) => {
            const active = pathname === link.href;

            return (
              <li key={link.href} role="none">
                <Link
                  href={link.href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className={`block px-3 py-2.5 text-sm transition-colors duration-150 ${
                    active
                      ? "bg-accent-sky/15 font-medium text-text"
                      : "text-text hover:bg-border/40"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="border-t border-border px-3 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-text">Dark Mode</p>
              <p className="text-xs text-muted">Toggle appearance</p>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </PopoverPanel>
    </div>
  );
}
