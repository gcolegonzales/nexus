"use client";

import { useEffect, useState } from "react";
import type { Pet } from "@/tools/pet-health/types/state";
import type {
  CreatePetInput,
  UpdatePetPatch,
} from "@/tools/pet-health/PetHealthProvider";
import { usePetHealth } from "@/tools/pet-health/PetHealthProvider";
import { Input, Textarea, Select, useModalClose } from "@nexus/ui";
import type { SelectOption } from "@nexus/ui";
import { FormActions } from "@nexus/next";

// ---------------------------------------------------------------------------
// Species options
// ---------------------------------------------------------------------------

const speciesOptions: SelectOption[] = [
  { value: "dog", label: "Dog" },
  { value: "cat", label: "Cat" },
  { value: "bird", label: "Bird" },
  { value: "rabbit", label: "Rabbit" },
  { value: "fish", label: "Fish" },
  { value: "reptile", label: "Reptile" },
  { value: "small animal", label: "Small animal" },
  { value: "other", label: "Other" },
];

const sexOptions: SelectOption[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

// ---------------------------------------------------------------------------
// Draft shape — mirrors Pet but with empty-string stand-ins for optionals
// ---------------------------------------------------------------------------

interface PetDraft {
  name: string;
  species: string;
  breed: string;
  dateOfBirth: string;
  sex: string;
  weight: string;
  microchipId: string;
  vetName: string;
  clinic: string;
  notes: string;
}

function toDraft(pet?: Pet): PetDraft {
  return {
    name: pet?.name ?? "",
    species: pet?.species ?? "",
    breed: pet?.breed ?? "",
    dateOfBirth: pet?.dateOfBirth ?? "",
    sex: pet?.sex ?? "",
    weight: pet?.weight ?? "",
    microchipId: pet?.microchipId ?? "",
    vetName: pet?.vetName ?? "",
    clinic: pet?.clinic ?? "",
    notes: pet?.notes ?? "",
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface PetFormProps {
  /** When provided, the form edits an existing pet. */
  pet?: Pet;
  onDone: () => void;
  /** Reports whether the form has unsaved changes vs. its initial values. */
  onDirtyChange?: (dirty: boolean) => void;
}

export function PetForm({ pet, onDone, onDirtyChange }: PetFormProps) {
  const { createPet, updatePet } = usePetHealth();
  const modalClose = useModalClose();
  const initial = useState<PetDraft>(() => toDraft(pet))[0];
  const [draft, setDraft] = useState<PetDraft>(() => toDraft(pet));
  const [errors, setErrors] = useState<{ name?: string; species?: string }>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const dirty =
    !saved && JSON.stringify(draft) !== JSON.stringify(initial);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  function set<K extends keyof PetDraft>(field: K, value: PetDraft[K]) {
    setDraft((prev) => ({ ...prev, [field]: value }));
    if (field === "name" || field === "species") {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  function validate(): boolean {
    const next: typeof errors = {};
    if (!draft.name.trim()) next.name = "Name is required.";
    if (!draft.species.trim()) next.species = "Species is required.";
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return false;
    }
    return true;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      const patch: CreatePetInput | UpdatePetPatch = {
        name: draft.name.trim(),
        species: draft.species.trim(),
        breed: draft.breed.trim() || undefined,
        dateOfBirth: draft.dateOfBirth || undefined,
        sex: (draft.sex as Pet["sex"]) || undefined,
        weight: draft.weight.trim() || undefined,
        microchipId: draft.microchipId.trim() || undefined,
        vetName: draft.vetName.trim() || undefined,
        clinic: draft.clinic.trim() || undefined,
        notes: draft.notes.trim() || undefined,
      };

      if (pet) {
        await updatePet(pet.id, patch as UpdatePetPatch);
      } else {
        await createPet(patch as CreatePetInput);
      }
      // Clear dirty before requesting close so the guard does not fire on save.
      setSaved(true);
      onDirtyChange?.(false);
      onDone();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        void handleSave();
      }}
    >
      <div className="space-y-1.5">
        <Input
          label="Pet name"
          placeholder="e.g. Buddy"
          value={draft.name}
          onChange={(e) => set("name", e.target.value)}
          autoFocus
        />
        {errors.name && (
          <p className="text-sm text-danger">{errors.name}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Select
          label="Species"
          value={draft.species || null}
          options={speciesOptions}
          onChange={(value) => set("species", value ?? "")}
          placeholder="Select species…"
          fullWidth
        />
        {errors.species && (
          <p className="text-sm text-danger">{errors.species}</p>
        )}
      </div>

      <Input
        label="Breed"
        placeholder="e.g. Golden Retriever"
        value={draft.breed}
        onChange={(e) => set("breed", e.target.value)}
      />

      <Input
        label="Date of birth"
        type="date"
        value={draft.dateOfBirth}
        onChange={(e) => set("dateOfBirth", e.target.value)}
      />

      <Select
        label="Sex"
        value={draft.sex || null}
        options={sexOptions}
        onChange={(value) => set("sex", value ?? "")}
        fullWidth
        allowUnset
        unsetLabel="Unknown / not set"
      />

      <Input
        label="Weight"
        placeholder="e.g. 12.5 lbs"
        value={draft.weight}
        onChange={(e) => set("weight", e.target.value)}
      />

      <Input
        label="Microchip ID"
        placeholder="15-digit number"
        value={draft.microchipId}
        onChange={(e) => set("microchipId", e.target.value)}
      />

      <Input
        label="Vet name"
        placeholder="Dr. Smith"
        value={draft.vetName}
        onChange={(e) => set("vetName", e.target.value)}
      />

      <Input
        label="Clinic"
        placeholder="Happy Paws Veterinary"
        value={draft.clinic}
        onChange={(e) => set("clinic", e.target.value)}
      />

      <Textarea
        label="Notes"
        placeholder="Allergies, medications, or anything else worth noting…"
        value={draft.notes}
        onChange={(e) => set("notes", e.target.value)}
      />

      <FormActions
        saveLabel={pet ? "Save changes" : "Add pet"}
        onSave={() => void handleSave()}
        onCancel={modalClose ?? onDone}
        className={saving ? "opacity-60 pointer-events-none" : ""}
      />
    </form>
  );
}
