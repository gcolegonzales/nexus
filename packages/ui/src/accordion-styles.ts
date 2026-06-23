export function accordionCardClassName(open: boolean) {
  return `group ${
    open
      ? "border-primary/30 shadow-[var(--shadow-hover)]"
      : "hover:border-primary/30 hover:shadow-[var(--shadow-hover)] hover:-translate-y-1"
  }`;
}

export const accordionCardTransitionClassName =
  "overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]";

export function accordionHeaderClassName(open: boolean) {
  return `flex w-full cursor-pointer items-start justify-between gap-3 px-3 py-3 text-left transition-colors duration-200 ease-out sm:px-4 sm:py-3.5 ${
    open ? "bg-background" : "group-hover:bg-background"
  }`;
}

export const accordionHeaderTitleClassName =
  "text-lg font-semibold leading-snug text-text";

export const accordionHeaderDescriptionClassName =
  "mt-0.5 text-sm leading-snug text-muted";

export const accordionHeaderActionsClassName =
  "flex shrink-0 items-center gap-2 pt-0.5";

export const accordionPanelClassName =
  "space-y-4 px-3 pb-3 pt-2 sm:px-4 sm:pb-4 sm:pt-3";
