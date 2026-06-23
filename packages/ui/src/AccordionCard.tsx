"use client";

import { useId, type KeyboardEvent, type ReactNode } from "react";
import { AccordionCaret } from "./AccordionCaret";
import { Card } from "./Card";
import { Collapsible } from "./Collapsible";
import {
  accordionCardClassName,
  accordionCardTransitionClassName,
  accordionHeaderActionsClassName,
  accordionHeaderClassName,
  accordionHeaderDescriptionClassName,
  accordionHeaderTitleClassName,
  accordionPanelClassName,
} from "./accordion-styles";

interface AccordionCardProps {
  open: boolean;
  onHeaderClick: () => void;
  children: ReactNode;
  header?: ReactNode;
  title?: string;
  description?: string;
  headerActions?: ReactNode;
  panelId?: string;
}

function handleHeaderKeyDown(
  event: KeyboardEvent<HTMLDivElement>,
  onHeaderClick: () => void,
) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    onHeaderClick();
  }
}

export function AccordionCard({
  open,
  onHeaderClick,
  children,
  header,
  title,
  description,
  headerActions,
  panelId: panelIdProp,
}: AccordionCardProps) {
  const generatedPanelId = useId();
  const panelId = panelIdProp ?? generatedPanelId;

  const headerContent = header ? (
    <div className="min-w-0 flex-1">{header}</div>
  ) : title ? (
    <div className="min-w-0 flex-1">
      <h3 className={accordionHeaderTitleClassName}>{title}</h3>
      {description ? (
        <p className={accordionHeaderDescriptionClassName}>{description}</p>
      ) : null}
    </div>
  ) : null;

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
        onClick={onHeaderClick}
        onKeyDown={(event) => handleHeaderKeyDown(event, onHeaderClick)}
        className={accordionHeaderClassName(open)}
      >
        {headerContent}
        <div className={accordionHeaderActionsClassName}>
          {headerActions}
          <AccordionCaret open={open} />
        </div>
      </div>

      <Collapsible open={open} id={panelId} innerClassName={accordionPanelClassName}>
        <div onClick={(event) => event.stopPropagation()}>{children}</div>
      </Collapsible>
    </Card>
  );
}
