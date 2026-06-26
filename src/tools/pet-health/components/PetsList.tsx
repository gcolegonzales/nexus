"use client";

import { useState } from "react";
import { usePetHealth } from "@/tools/pet-health/PetHealthProvider";
import type { Pet } from "@/tools/pet-health/types/state";
import { PetForm } from "@/tools/pet-health/components/PetForm";
import { Modal, EditIcon, IconActionButton } from "@nexus/ui";
import { useConfirm } from "@nexus/ui";
import { Button } from "@nexus/next";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function speciesLabel(species: string): string {
  return species.charAt(0).toUpperCase() + species.slice(1);
}

function petSummary(pet: Pet): string {
  const parts: string[] = [];
  if (pet.species) parts.push(speciesLabel(pet.species));
  if (pet.breed) parts.push(pet.breed);
  if (pet.dateOfBirth) {
    const age = Math.floor(
      (Date.now() - new Date(pet.dateOfBirth).getTime()) /
        (1000 * 60 * 60 * 24 * 365.25),
    );
    if (!isNaN(age) && age >= 0) parts.push(`${age} yr`);
  }
  return parts.join(" · ");
}

// ---------------------------------------------------------------------------
// PetsList — manage pets (edit / delete / add)
// ---------------------------------------------------------------------------

interface PetsListProps {
  onAddPet: () => void;
}

export function PetsList({ onAddPet }: PetsListProps) {
  const { state, activePetId, setActivePet, deletePet } = usePetHealth();
  const confirm = useConfirm();
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [editDirty, setEditDirty] = useState(false);

  async function handleDelete(pet: Pet) {
    const confirmed = await confirm({
      title: "Delete pet?",
      message: `Delete ${pet.name} and all of their records and chat history? This cannot be undone.`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!confirmed) return;
    await deletePet(pet.id);
  }

  if (state.pets.length === 0) return null;

  return (
    <>
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-text">Manage Pets</h4>
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {state.pets.map((pet) => {
            const isActive = pet.id === activePetId;
            return (
              <div
                key={pet.id}
                className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${
                  isActive ? "bg-primary/[0.06]" : "hover:bg-border/30"
                }`}
              >
                {/* Select pet */}
                <button
                  type="button"
                  onClick={() => setActivePet(pet.id)}
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
                  aria-pressed={isActive}
                >
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      isActive ? "bg-primary" : "bg-border"
                    }`}
                    aria-hidden="true"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-text">
                      {pet.name}
                    </span>
                    {petSummary(pet) && (
                      <span className="block truncate text-xs text-muted">
                        {petSummary(pet)}
                      </span>
                    )}
                  </span>
                </button>

                {/* Actions — far right */}
                <div className="flex shrink-0 items-center gap-1">
                  <IconActionButton
                    label={`Edit ${pet.name}`}
                    onClick={() => setEditingPet(pet)}
                  >
                    <EditIcon />
                  </IconActionButton>
                  <button
                    type="button"
                    aria-label={`Delete ${pet.name}`}
                    onClick={() => void handleDelete(pet)}
                    className="btn-interactive inline-flex cursor-pointer items-center justify-center rounded-lg p-1.5 text-sm text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14H6L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4h6v2" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-2">
          <Button variant="secondary" onClick={onAddPet}>
            Add Another Pet
          </Button>
        </div>
      </div>

      {/* Edit modal */}
      <Modal
        open={editingPet !== null}
        onClose={() => {
          setEditingPet(null);
          setEditDirty(false);
        }}
        title={`Edit ${editingPet?.name ?? "pet"}`}
        dirty={editDirty}
      >
        {editingPet && (
          <PetForm
            pet={editingPet}
            onDone={() => {
              setEditingPet(null);
              setEditDirty(false);
            }}
            onDirtyChange={setEditDirty}
          />
        )}
      </Modal>
    </>
  );
}
