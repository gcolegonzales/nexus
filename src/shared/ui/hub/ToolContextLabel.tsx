"use client";

import { usePathname } from "next/navigation";
import { TOOLS } from "@/core/registry/tools";

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  );
}

function resolveToolForPath(pathname: string) {
  return TOOLS.find(
    (tool) =>
      pathname === tool.href || pathname.startsWith(`${tool.href}/`),
  );
}

export function ToolContextLabel() {
  const pathname = usePathname();
  const tool = resolveToolForPath(pathname);

  if (!tool) return null;

  return (
    <div className="hidden items-center gap-2 border-l border-border/80 pl-4 sm:flex">
      <span className="text-sm font-semibold text-text">{tool.name}</span>
      <span className="relative group">
        <button
          type="button"
          className="btn-interactive rounded-md p-1 text-muted hover:text-text"
          aria-label={`About ${tool.name}`}
        >
          <InfoIcon className="h-4 w-4" />
        </button>
        <span
          role="tooltip"
          className="pointer-events-none absolute left-1/2 top-[calc(100%+0.5rem)] z-50 w-72 -translate-x-1/2 rounded-lg border border-border bg-surface px-3 py-2 text-left text-xs leading-snug text-muted opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
        >
          {tool.description}
        </span>
      </span>
    </div>
  );
}
