"use client";

import { useState } from "react";
import { usePetHealth } from "@/tools/pet-health/PetHealthProvider";
import { PetsList } from "@/tools/pet-health/components/PetsList";
import { PetForm } from "@/tools/pet-health/components/PetForm";
import { ToolSection } from "@/tools/pet-health/components/ToolSection";
import { Card, Modal, StaggerItem } from "@nexus/ui";
import { Button } from "@nexus/next";
import Link from "next/link";

export default function PetHealthPage() {
  const { isReady, state, activePetId } = usePetHealth();
  const [addingPet, setAddingPet] = useState(false);

  // Loading state — provider sets isReady once IndexedDB hydration completes.
  if (!isReady) {
    return (
      <ToolSection title="Pet Health">
        <div className="py-16 text-center">
          <p className="text-sm text-muted">Loading your pets…</p>
        </div>
      </ToolSection>
    );
  }

  const hasPets = state.pets.length > 0;
  const activePet = state.pets.find((p) => p.id === activePetId) ?? null;

  return (
    <ToolSection title="Overview" description="Your pets and their health records.">
      {/* ------------------------------------------------------------------ */}
      {/* Empty state                                                          */}
      {/* ------------------------------------------------------------------ */}
      {!hasPets && (
        <StaggerItem>
          <Card className="space-y-5 py-12 text-center">
            <div className="space-y-2">
              <p className="text-lg font-semibold text-text">
                Add your first pet
              </p>
              <p className="mx-auto max-w-md text-sm text-muted">
                Create a pet profile to start tracking health records and vet
                visits. The document vault works right away — no account or API
                key needed.
              </p>
            </div>

            <div className="rounded-xl border border-border/60 bg-background/60 px-4 py-3 text-sm text-muted mx-auto max-w-sm">
              <span className="font-medium text-text">AI chat</span> requires
              your own API key, configured in{" "}
              <Link
                href="/tools/pet-health/settings"
                className="font-medium text-primary hover:underline"
              >
                Settings
              </Link>
              . Records and document storage work without one.
            </div>

            <div className="pt-1">
              <Button onClick={() => setAddingPet(true)}>Add your first pet</Button>
            </div>
          </Card>
        </StaggerItem>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Pet list                                                             */}
      {/* ------------------------------------------------------------------ */}
      {hasPets && (
        <>
          <StaggerItem>
            <PetsList onAddPet={() => setAddingPet(true)} />
          </StaggerItem>

          {/* Navigation shortcuts for the active pet */}
          {activePet && (
            <StaggerItem className="mt-8">
              <div className="mb-3">
                <h3 className="text-base font-semibold text-text">
                  {activePet.name}
                </h3>
                <p className="text-sm text-muted">
                  Jump to a section for {activePet.name}.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button variant="secondary" href="/tools/pet-health/records">
                  View records
                </Button>
                <Button variant="secondary" href="/tools/pet-health/chat">
                  AI chat
                </Button>
                <Button variant="secondary" href="/tools/pet-health/settings">
                  Settings
                </Button>
              </div>

              <div className="mt-4 rounded-xl border border-border/60 bg-background/60 px-4 py-3 text-sm text-muted max-w-lg">
                <span className="font-medium text-text">AI chat</span> requires
                your own API key in{" "}
                <Link
                  href="/tools/pet-health/settings"
                  className="font-medium text-primary hover:underline"
                >
                  Settings
                </Link>
                . The document vault and records work without one.
              </div>
            </StaggerItem>
          )}
        </>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Add pet modal                                                        */}
      {/* ------------------------------------------------------------------ */}
      <Modal
        open={addingPet}
        onClose={() => setAddingPet(false)}
        title="Add a pet"
      >
        <PetForm onDone={() => setAddingPet(false)} />
      </Modal>
    </ToolSection>
  );
}
