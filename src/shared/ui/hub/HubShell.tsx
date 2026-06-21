import type { ReactNode } from "react";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { HubMainTransition } from "./HubMainTransition";

interface HubShellProps {
  children: ReactNode;
}

export function HubShell({ children }: HubShellProps) {
  return (
    <>
      <Header />
      <main className="flex-1">
        <HubMainTransition>{children}</HubMainTransition>
      </main>
      <Footer />
    </>
  );
}
