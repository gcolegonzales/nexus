"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";

interface StaggerContextValue {
  consume: () => number;
}

const StaggerContext = createContext<StaggerContextValue | null>(null);

const MAX_STAGGER_INDEX = 14;
const STAGGER_STEP_MS = 100;

interface StaggerGroupProps {
  resetKey: string;
  children: ReactNode;
  className?: string;
}

export function StaggerGroup({
  resetKey,
  children,
  className = "",
}: StaggerGroupProps) {
  const counterRef = useRef(0);

  counterRef.current = 0;

  const consume = useCallback(() => {
    const next = counterRef.current;
    counterRef.current += 1;
    return Math.min(next, MAX_STAGGER_INDEX);
  }, []);

  return (
    <StaggerContext.Provider value={{ consume }}>
      <div key={resetKey} className={className}>
        {children}
      </div>
    </StaggerContext.Provider>
  );
}

interface StaggerItemProps {
  children: ReactNode;
  className?: string;
}

export function StaggerItem({ children, className = "" }: StaggerItemProps) {
  const context = useContext(StaggerContext);
  const indexRef = useRef<number | null>(null);

  if (indexRef.current === null && context) {
    indexRef.current = context.consume();
  }

  const index = indexRef.current ?? 0;

  return (
    <div
      className={`stagger-item ${className}`.trim()}
      style={
        {
          "--stagger-index": index,
          "--stagger-delay": `${index * STAGGER_STEP_MS}ms`,
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}
