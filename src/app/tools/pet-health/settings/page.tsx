"use client";

import { AiSettings } from "@/tools/pet-health/components/AiSettings";
import { StorageSettings } from "@/tools/pet-health/components/StorageSettings";
import { ToolSection } from "@/tools/pet-health/components/ToolSection";
import { useAiAvailable } from "@/tools/pet-health/lib/ai-availability";

export default function SettingsPage() {
  const { refresh: refreshAi } = useAiAvailable();

  return (
    <ToolSection
      title="Settings"
      description="Configure your AI provider and data storage preferences."
    >
      <div className="space-y-10 max-w-2xl">
        {/* ---------------------------------------------------------------- */}
        {/* AI provider                                                        */}
        {/* ---------------------------------------------------------------- */}
        <section>
          <h2 className="mb-4 text-base font-semibold text-text">
            AI provider
          </h2>
          <p className="mb-4 text-sm text-muted">
            Pet Health chat uses your own API key — no Nexus account required.
            Your key is stored only on this device and never included in data
            exports.
          </p>
          <AiSettings onConfigChange={() => void refreshAi()} />
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Durability                                                         */}
        {/* ---------------------------------------------------------------- */}
        <section>
          <h2 className="mb-4 text-base font-semibold text-text">
            Data durability
          </h2>
          <p className="mb-4 text-sm text-muted">
            Your pets and records live in your browser&apos;s local storage. Use
            the options below to protect them from eviction, mirror them to a
            folder on disk, or export a portable backup.
          </p>
          <StorageSettings />
        </section>
      </div>
    </ToolSection>
  );
}
