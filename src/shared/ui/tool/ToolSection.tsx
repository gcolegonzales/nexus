import type { ReactNode } from "react";
import { StaggerItem } from "@nexus/ui";
import { ToolSectionHeader } from "@/shared/ui/tool/ToolSectionHeader";

interface ToolSectionProps {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  maxWidth?: "2xl" | "3xl" | "full";
}

const widthClasses = {
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  full: "",
};

export function ToolSection({
  title,
  description,
  action,
  maxWidth = "full",
  children,
}: ToolSectionProps) {
  const widthClass = widthClasses[maxWidth];
  const hasHeader = Boolean(title || description || action);

  return (
    <div className={widthClass ? `mx-auto ${widthClass}` : undefined}>
      {hasHeader && (
        <ToolSectionHeader
          title={title}
          description={description}
          action={action}
        />
      )}
      <StaggerItem>{children}</StaggerItem>
    </div>
  );
}

export function ToolSectionBlock({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <StaggerItem className={className}>{children}</StaggerItem>;
}
