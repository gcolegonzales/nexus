import type { ReactNode } from "react";
import { Button } from "@nexus/next";
import { PageHeader } from "@nexus/ui";

interface ComingSoonPageProps {
  title: string;
  description: string;
  children?: ReactNode;
}

export function ComingSoonPage({
  title,
  description,
  children,
}: ComingSoonPageProps) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <PageHeader title={title} description={description} />
      <div className="mt-10 rounded-2xl border border-dashed border-border bg-surface/80 p-8 text-center">
        <p className="text-lg font-medium text-text">Coming soon</p>
        <p className="mt-2 text-sm text-muted">
          This section is part of the Nexus roadmap and will be built in a
          future update.
        </p>
        {children}
        <div className="mt-6">
          <Button variant="secondary" href="/">
            ← Back to Nexus
          </Button>
        </div>
      </div>
    </div>
  );
}
