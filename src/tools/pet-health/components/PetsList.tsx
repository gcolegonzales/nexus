"use client";

import { useState } from "react";
import { usePetHealth } from "@/tools/pet-health/PetHealthProvider";
import type { Pet } from "@/tools/pet-health/types/state";
import { PetForm } from "@/tools/pet-health/components/PetForm";
import { Modal, Card, EditIcon, IconActionButton } from "@nexus/ui";
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {state.pets.map((pet) => {
            const isActive = pet.id === activePetId;
            return (
              <Card
                key={pet.id}
                className={`relative transition-all duration-150 ${
                  isActive ? "ring-2 ring-primary/40 shadow-sm" : ""
                }`}
              >
                {/* Select pet button */}
                <button
                  type="button"
                  onClick={() => setActivePet(pet.id)}
                  className="block w-full cursor-pointer text-left"
                  aria-pressed={isActive}
                >
                  {isActive && (
                    <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-primary" />
                  )}
                  <div className="pr-6">
                    <p className="text-base font-semibold leading-snug text-text">
                      {pet.name}
                    </p>
                    {petSummary(pet) && (
                      <p className="mt-0.5 text-sm text-muted">{petSummary(pet)}</p>
                    )}
                    {pet.vetName && (
                      <p className="mt-1 text-xs text-muted">
                        Vet: {pet.vetName}
                        {pet.clinic ? ` · ${pet.clinic}` : ""}
                      </p>
                    )}
                  </div>
                </button>

                <div className="mt-3 flex items-center gap-2">
                  <IconActionButton
                    label={`Edit ${pet.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingPet(pet);
                    }}
                  >
                    <EditIcon />
                  </IconActionButton>
                  <button
                    type="button"
                    aria-label={`Delete ${pet.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDelete(pet);
                    }}
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
              </Card>
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
        onClose={() => setEditingPet(null)}
        title={`Edit ${editingPet?.name ?? "pet"}`}
      >
        {editingPet && (
          <PetForm pet={editingPet} onDone={() => setEditingPet(null)} />
        )}
      </Modal>
    </>
  );
}
