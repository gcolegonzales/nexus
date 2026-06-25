import { TOOLS } from "@/core/registry/tools";
import { Button } from "@nexus/next";
import { PAGE_CONTAINER } from "@/shared/ui/page-container";
import { ToolCard } from "@/shared/ui/ToolCard";
import { BlobBackground } from "@/shared/ui/illustrations/BlobBackground";
import { HeroIllustration } from "@/shared/ui/illustrations/HeroIllustration";
import { ToolIconHomeMaintenance } from "@/shared/ui/illustrations/ToolIconHomeMaintenance";
import { ToolIconRoomCoat } from "@/shared/ui/illustrations/ToolIconRoomCoat";
import { ToolIconPetHealth } from "@/shared/ui/illustrations/ToolIconPetHealth";

function ToolIconPlaceholder({ label }: { label: string }) {
  return (
    <span className="text-lg font-bold" aria-hidden="true">
      {label}
    </span>
  );
}

function getToolIcon(id: string) {
  switch (id) {
    case "home-maintenance":
      return <ToolIconHomeMaintenance size={26} />;
    case "room-coat":
      return <ToolIconRoomCoat size={26} />;
    case "pet-health":
      return <ToolIconPetHealth size={26} />;
    default:
      return <ToolIconPlaceholder label="?" />;
  }
}

export default function HomePage() {
  return (
    <div className="hero-gradient">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <BlobBackground />
        <div className={`relative ${PAGE_CONTAINER} grid gap-10 py-16 lg:grid-cols-2 lg:items-center lg:py-24`}>
          <div className="space-y-6">
            <p className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              Local-first personal tools
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-text sm:text-5xl lg:text-6xl">
              Nexus
            </h1>
            <p className="max-w-lg text-lg leading-relaxed text-muted">
              Your central hub for personal tech tools. Start with home
              maintenance, add more over time — all on your device, on your
              terms.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button href="/tools/home-maintenance">Open Home Maintenance</Button>
              <Button variant="secondary" href="/settings">
                Settings
              </Button>
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <HeroIllustration className="h-auto w-full max-w-sm drop-shadow-sm" />
          </div>
        </div>
      </section>

      {/* Tools grid */}
      <section className={`${PAGE_CONTAINER} pb-20`}>
        <div className="mb-8 space-y-2">
          <h2 className="text-2xl font-bold text-text">Tools</h2>
          <p className="text-muted">
            Pick a tool to get started. More utilities will appear here as Nexus
            grows.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((tool) => (
            <ToolCard
              key={tool.id}
              name={tool.name}
              description={tool.description}
              href={tool.href}
              status={tool.status}
              accent={tool.accent}
              requiresAI={tool.requiresAI}
              icon={getToolIcon(tool.id)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
