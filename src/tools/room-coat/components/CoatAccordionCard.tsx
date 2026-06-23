"use client";

import { useId, useState, type ReactNode } from "react";
import { AccordionCard } from "@nexus/ui";

interface CoatAccordionCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  headerActions?: ReactNode;
}

export function CoatAccordionCard({
  title,
  description,
  children,
  defaultOpen = false,
  open: openProp,
  onOpenChange,
  headerActions,
}: CoatAccordionCardProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = openProp ?? internalOpen;
  const panelId = useId();

  function setOpen(next: boolean) {
    onOpenChange?.(next);
    if (openProp === undefined) {
      setInternalOpen(next);
    }
  }

  return (
    <AccordionCard
      open={open}
      onHeaderClick={() => setOpen(!open)}
      title={title}
      description={description}
      headerActions={headerActions}
      panelId={panelId}
    >
      {children}
    </AccordionCard>
  );
}
