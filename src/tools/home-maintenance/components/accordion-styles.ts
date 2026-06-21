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
  return `flex w-full cursor-pointer flex-col gap-2.5 px-4 py-3.5 text-left transition-colors duration-200 ease-out sm:flex-row sm:items-center sm:justify-between ${
    open ? "bg-background" : "group-hover:bg-background"
  }`;
}

export const accordionPanelClassName = "space-y-4 px-4 pb-4 pt-3";
