import Link from "next/link";
import { PAGE_CONTAINER } from "@/shared/ui/page-container";
import { HubMenu } from "@/shared/ui/hub/HubMenu";
import { ToolContextLabel } from "@/shared/ui/hub/ToolContextLabel";
import { NexusLogo } from "@/shared/ui/illustrations/NexusLogo";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-surface/90 backdrop-blur-md">
      <div className={`${PAGE_CONTAINER} flex h-14 items-center justify-between gap-4`}>
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href="/"
            className="btn-interactive flex shrink-0 items-center gap-2.5 rounded-xl px-1 py-1"
          >
            <NexusLogo size={32} />
            <span className="text-lg font-bold tracking-tight text-text">
              Nexus
            </span>
          </Link>
          <ToolContextLabel />
        </div>

        <HubMenu />
      </div>
    </header>
  );
}
