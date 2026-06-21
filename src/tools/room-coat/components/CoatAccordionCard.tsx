"use client";

import { useId, useState, type ReactNode } from "react";
import { AccordionCaret, Card, Collapsible } from "@nexus/ui";
import {
  accordionCardClassName,
  accordionCardTransitionClassName,
  accordionHeaderClassName,
  accordionPanelClassName,
} from "@/tools/room-coat/components/accordion-styles";

interface CoatAccordionCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

export function CoatAccordionCard({
  title,
  description,
  children,
  defaultOpen = false,
}: CoatAccordionCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <Card
      padding={false}
      className={`${accordionCardTransitionClassName} ${accordionCardClassName(open)}`}
    >
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen((current) => !current);
          }
        }}
        className={accordionHeaderClassName(open)}
      >
        <div>
          <h3 className="text-lg font-semibold text-text">{title}</h3>
          {description ? (
            <p className="mt-1 text-sm text-muted">{description}</p>
          ) : null}
        </div>
        <AccordionCaret open={open} />
      </div>

      <Collapsible open={open} id={panelId} innerClassName={accordionPanelClassName}>
        <div onClick={(event) => event.stopPropagation()}>{children}</div>
      </Collapsible>
    </Card>
  );
}
