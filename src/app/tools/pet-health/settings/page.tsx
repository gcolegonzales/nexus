"use client";

import { StorageSettings } from "@/tools/pet-health/components/StorageSettings";
import { ToolSection } from "@/tools/pet-health/components/ToolSection";

export default function SettingsPage() {
  return (
    <ToolSection
      title="Storage Settings"
      description="Export a portable backup of your pet records."
    >
      <div className="space-y-10 max-w-2xl">
        {/* ---------------------------------------------------------------- */}
        {/* Data durability                                                    */}
        {/* ---------------------------------------------------------------- */}
        <section>
          <h2 className="mb-4 text-base font-semibold text-text">
            Data Durability
          </h2>
          <p className="mb-4 text-sm text-muted">
            Your pets and records live in your browser&apos;s local storage.
            Persistent storage is requested automatically when the tool loads.
            Export an archive below to keep a portable backup.
          </p>
          <StorageSettings />
        </section>
      </div>
    </ToolSection>
  );
}
