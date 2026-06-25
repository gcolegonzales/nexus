import Link from "next/link";
import type { ReactNode } from "react";
import type { ToolAccent, ToolStatus } from "@/core/registry/types";
import { Badge, Card } from "@nexus/ui";

const accentClasses: Record<ToolAccent, string> = {
  coral: "bg-accent-coral/12 text-accent-coral ring-accent-coral/20",
  mint: "bg-accent-mint/12 text-[var(--badge-mint)] ring-accent-mint/20",
  sky: "bg-accent-sky/20 text-[var(--badge-sky)] ring-accent-sky/25",
  amber: "bg-accent-amber/15 text-[var(--badge-amber)] ring-accent-amber/20",
};

interface ToolCardProps {
  name: string;
  description: string;
  href: string;
  status: ToolStatus;
  accent: ToolAccent;
  icon: ReactNode;
  requiresAI?: boolean;
}

export function ToolCard({
  name,
  description,
  href,
  status,
  accent,
  icon,
  requiresAI,
}: ToolCardProps) {
  const isAvailable = status === "available";

  const content = (
    <Card
      interactive={isAvailable}
      className={`flex h-full flex-col gap-4 ${!isAvailable ? "opacity-70" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1 ${accentClasses[accent]}`}
        >
          {icon}
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          <Badge variant={isAvailable ? "mint" : "sky"}>
            {isAvailable ? "Available" : "Coming Soon"}
          </Badge>
          {requiresAI && <Badge variant="amber">AI Required</Badge>}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <h3 className="text-lg font-semibold text-text">{name}</h3>
        <p className="text-sm leading-relaxed text-muted">{description}</p>
      </div>
      {isAvailable && (
        <span className="text-sm font-medium text-primary">Open tool →</span>
      )}
    </Card>
  );

  if (!isAvailable) {
    return <div className="h-full cursor-default">{content}</div>;
  }

  return (
    <Link href={href} className="block h-full">
      {content}
    </Link>
  );
}
