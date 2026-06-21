interface AccordionCaretProps {
  open: boolean;
  className?: string;
}

export function AccordionCaret({ open, className = "" }: AccordionCaretProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className={`h-4 w-4 shrink-0 text-muted transition-transform duration-300 ease-out ${
        open ? "rotate-180" : "rotate-0"
      } ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}
