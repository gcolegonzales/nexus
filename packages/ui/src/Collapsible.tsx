import type { ReactNode } from "react";

interface CollapsibleProps {
  open: boolean;
  id?: string;
  children: ReactNode;
  innerClassName?: string;
}

export function Collapsible({
  open,
  id,
  children,
  innerClassName = "",
}: CollapsibleProps) {
  return (
    <div
      id={id}
      aria-hidden={!open}
      className={`grid transition-[grid-template-rows] duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
      }`}
    >
      <div className="overflow-hidden">
        <div
          className={`transition-opacity duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            open
              ? "border-t border-border opacity-100"
              : "pointer-events-none border-t border-transparent opacity-0"
          } ${innerClassName}`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
