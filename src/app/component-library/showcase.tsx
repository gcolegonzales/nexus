import type { ReactNode } from "react";

interface DocSectionProps {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
  code?: string;
}

export function DocSection({
  id,
  title,
  description,
  children,
  code,
}: DocSectionProps) {
  return (
    <section id={id} className="scroll-mt-24 border-b border-border pb-12 last:border-b-0">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight text-text">{title}</h2>
        <p className="max-w-3xl text-sm leading-relaxed text-muted">{description}</p>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)]">
        {children}
      </div>

      {code && (
        <pre className="mt-4 overflow-x-auto rounded-xl border border-border bg-background p-4 text-xs leading-relaxed text-text">
          <code>{code.trim()}</code>
        </pre>
      )}
    </section>
  );
}

interface NavLinkProps {
  href: string;
  label: string;
}

export function NavLink({ href, label }: NavLinkProps) {
  return (
    <a
      href={href}
      className="block rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-border/40 hover:text-text"
    >
      {label}
    </a>
  );
}
