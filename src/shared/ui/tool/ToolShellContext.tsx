"use client";

import { createContext, useContext, type ReactNode } from "react";

const ToolShellContext = createContext<{ headerActions?: ReactNode }>({});

export function ToolShellProvider({
  headerActions,
  children,
}: {
  headerActions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <ToolShellContext.Provider value={{ headerActions }}>
      {children}
    </ToolShellContext.Provider>
  );
}

export function useToolShellHeaderActions() {
  return useContext(ToolShellContext).headerActions;
}
