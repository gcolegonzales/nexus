"use client";

import type { ReactNode } from "react";
import { StaggerGroup } from "./Stagger";

interface FilterTransitionPanelProps {
  isPending: boolean;
  animateKey: string;
  children: ReactNode;
  className?: string;
  listClassName?: string;
}

export function FilterTransitionPanel({
  isPending,
  animateKey,
  children,
  className = "",
  listClassName = "",
}: FilterTransitionPanelProps) {
  return (
    <div className={`relative min-h-[4rem] ${className}`.trim()}>
      {isPending && (
        <div
          className="absolute inset-0 z-10 flex items-start justify-center rounded-2xl bg-surface/85 pt-20 backdrop-blur-[2px] animate-fade-in"
          aria-busy="true"
          aria-live="polite"
        >
          <div
            className="h-5 w-5 animate-spin rounded-full border-2 border-primary/20 border-t-primary"
            role="status"
            aria-label="Updating results"
          />
        </div>
      )}

      <StaggerGroup
        resetKey={animateKey}
        className={`${listClassName} ${isPending ? "invisible" : ""}`.trim()}
      >
        {children}
      </StaggerGroup>
    </div>
  );
}
