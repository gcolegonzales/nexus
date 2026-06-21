import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-text sm:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="max-w-2xl text-base text-muted">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
