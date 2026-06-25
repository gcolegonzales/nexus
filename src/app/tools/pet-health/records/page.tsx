"use client";

import Link from "next/link";
import { usePetHealth } from "@/tools/pet-health/PetHealthProvider";
import { RecordUpload } from "@/tools/pet-health/components/RecordUpload";
import { RecordsList } from "@/tools/pet-health/components/RecordsList";
import { ToolSection } from "@/tools/pet-health/components/ToolSection";
import { Card } from "@nexus/ui";
import { Button } from "@nexus/next";

export default function RecordsPage() {
  const { isReady, state, activePetId } = usePetHealth();

  if (!isReady) {
    return (
      <ToolSection title="Records">
        <div className="py-16 text-center">
          <p className="text-sm text-muted">Loading records…</p>
        </div>
      </ToolSection>
    );
  }

  const activePet = state.pets.find((p) => p.id === activePetId) ?? null;

  if (!activePet) {
    return (
      <ToolSection title="Records">
        <Card className="space-y-5 py-12 text-center">
          <div className="space-y-2">
            <p className="text-lg font-semibold text-text">No pet selected</p>
            <p className="mx-auto max-w-md text-sm text-muted">
              Pick or add a pet first, then come back here to upload and manage
              their records.
            </p>
          </div>
          <div className="pt-1">
            <Button href="/tools/pet-health">Go to Overview</Button>
          </div>
        </Card>
      </ToolSection>
    );
  }

  return (
    <ToolSection
      title={`${activePet.name}'s Records`}
      description="Upload and manage vet records, discharge documents, lab results, and more."
    >
      <div className="space-y-6">
        <RecordUpload />
        <RecordsList />
      </div>
    </ToolSection>
  );
}
