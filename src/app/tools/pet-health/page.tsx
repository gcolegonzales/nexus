"use client";

import { useEffect, useState } from "react";
import { usePetHealth } from "@/tools/pet-health/PetHealthProvider";
import { PetsList } from "@/tools/pet-health/components/PetsList";
import { PetForm } from "@/tools/pet-health/components/PetForm";
import { ToolSection } from "@/tools/pet-health/components/ToolSection";
import { Card, Modal, StaggerItem } from "@nexus/ui";
import { Button } from "@nexus/next";
import Link from "next/link";
import type { PetRecord } from "@/tools/pet-health/types/state";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeAge(dateOfBirth: string): string {
  const birth = new Date(dateOfBirth);
  if (isNaN(birth.getTime())) return "";
  const now = Date.now();
  const years = Math.floor((now - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
  if (years < 0) return "";
  if (years === 0) {
    const months = Math.floor((now - birth.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
    return months <= 1 ? "< 1 month" : `${months} months`;
  }
  return years === 1 ? "1 year" : `${years} years`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function recordDate(record: PetRecord): string {
  return record.documentDate ?? record.uploadedAt;
}

// ---------------------------------------------------------------------------
// Overview page
// ---------------------------------------------------------------------------

export default function PetHealthPage() {
  const { isReady, state, activePetId, setActivePet } = usePetHealth();
  const [addingPet, setAddingPet] = useState(false);
  const [addDirty, setAddDirty] = useState(false);

  // Auto-select first pet if none active and pets exist
  useEffect(() => {
    if (isReady && state.pets.length > 0 && !activePetId) {
      setActivePet(state.pets[0].id);
    }
  }, [isReady, state.pets, activePetId, setActivePet]);

  // Loading state
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
  const activePet = state.pets.find((p) => p.id === activePetId) ?? state.pets[0] ?? null;
  const petRecords = activePet
    ? state.records.filter((r) => r.petId === activePet.id)
    : [];

  // Record stats
  const totalRecords = petRecords.length;
  const readableRecords = petRecords.filter((r) => r.extractionStatus === "done").length;
  const unreadableRecords = totalRecords - readableRecords;
  const sortedByDate = [...petRecords].sort(
    (a, b) => new Date(recordDate(b)).getTime() - new Date(recordDate(a)).getTime(),
  );
  const mostRecentRecord = sortedByDate[0] ?? null;
  const recentRecords = sortedByDate.slice(0, 5);

  return (
    <ToolSection title="Overview">
      {/* ------------------------------------------------------------------ */}
      {/* Empty state                                                          */}
      {/* ------------------------------------------------------------------ */}
      {!hasPets && (
        <StaggerItem>
          <Card className="space-y-5 py-12 text-center">
            <div className="space-y-2">
              <p className="text-lg font-semibold text-text">Add your first pet</p>
              <p className="mx-auto max-w-md text-sm text-muted">
                Create a pet profile to start tracking health records and vet visits. The
                document vault works right away — no account or API key needed.
              </p>
            </div>

            <div className="mx-auto max-w-sm rounded-xl border border-border/60 bg-background/60 px-4 py-3 text-sm text-muted">
              <span className="font-medium text-text">AI chat</span> requires your own API
              key, configured in{" "}
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
      {/* Dashboard — active pet                                               */}
      {/* ------------------------------------------------------------------ */}
      {hasPets && activePet && (
        <>
          {/* Key facts */}
          <StaggerItem>
            <Card className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-text">{activePet.name}</h3>
                  {activePet.species && (
                    <p className="text-sm text-muted">{capitalize(activePet.species)}</p>
                  )}
                </div>
                <Button variant="secondary" href="/tools/pet-health/records">
                  View Records
                </Button>
              </div>

              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
                {activePet.breed && (
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                      Breed
                    </dt>
                    <dd className="mt-0.5 text-sm text-text">{activePet.breed}</dd>
                  </div>
                )}
                {activePet.dateOfBirth && (
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                      Age
                    </dt>
                    <dd className="mt-0.5 text-sm text-text">
                      {computeAge(activePet.dateOfBirth)}
                    </dd>
                  </div>
                )}
                {activePet.sex && (
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                      Sex
                    </dt>
                    <dd className="mt-0.5 text-sm text-text">{capitalize(activePet.sex)}</dd>
                  </div>
                )}
                {activePet.weight && (
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                      Weight
                    </dt>
                    <dd className="mt-0.5 text-sm text-text">{activePet.weight}</dd>
                  </div>
                )}
                {activePet.vetName && (
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                      Vet
                    </dt>
                    <dd className="mt-0.5 text-sm text-text">
                      {activePet.vetName}
                      {activePet.clinic ? ` · ${activePet.clinic}` : ""}
                    </dd>
                  </div>
                )}
              </dl>
            </Card>
          </StaggerItem>

          {/* Record stats */}
          <StaggerItem className="mt-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Card className="space-y-1">
                <p className="text-2xl font-bold text-text">{totalRecords}</p>
                <p className="text-sm text-muted">Total Records</p>
              </Card>
              <Card className="space-y-1">
                <p className="text-2xl font-bold text-text">{readableRecords}</p>
                <p className="text-sm text-muted">Readable</p>
              </Card>
              <Card className="space-y-1">
                <p className="text-2xl font-bold text-text">
                  {mostRecentRecord ? formatDate(recordDate(mostRecentRecord)) : "—"}
                </p>
                <p className="text-sm text-muted">Most Recent</p>
              </Card>
            </div>
          </StaggerItem>

          {/* Recent records */}
          {recentRecords.length > 0 && (
            <StaggerItem className="mt-4">
              <Card className="space-y-3">
                <h4 className="text-sm font-semibold text-text">Recent Records</h4>
                <ul className="divide-y divide-border">
                  {recentRecords.map((record) => (
                    <li key={record.id} className="py-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-text">
                            {record.title}
                          </p>
                          <p className="text-xs text-muted">
                            {capitalize(record.documentType.replace("-", " "))}
                            {" · "}
                            {formatDate(recordDate(record))}
                          </p>
                        </div>
                        {unreadableRecords > 0 && record.extractionStatus !== "done" && (
                          <span className="shrink-0 rounded-full bg-border/60 px-2 py-0.5 text-xs text-muted">
                            Processing
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            </StaggerItem>
          )}

          {/* Manage pets */}
          <StaggerItem className="mt-6">
            <PetsList onAddPet={() => setAddingPet(true)} />
          </StaggerItem>
        </>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Add pet modal                                                        */}
      {/* ------------------------------------------------------------------ */}
      <Modal
        open={addingPet}
        onClose={() => {
          setAddingPet(false);
          setAddDirty(false);
        }}
        title="Add a pet"
        dirty={addDirty}
      >
        <PetForm
          onDone={() => {
            setAddingPet(false);
            setAddDirty(false);
          }}
          onDirtyChange={setAddDirty}
        />
      </Modal>
    </ToolSection>
  );
}
