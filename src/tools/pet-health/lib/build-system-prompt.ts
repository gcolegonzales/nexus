// ---------------------------------------------------------------------------
// Pet Health — system-prompt builder.
//
// Produces the provider-agnostic system message for a pet chat: the pet's
// profile (only the fields that are present), followed by the extracted text
// of each of its records under a per-record header, and an explicit
// non-clinical disclaimer instruction.
//
// PURE: no React, no DOM, no I/O. Deterministic — same inputs, same output.
// ---------------------------------------------------------------------------

import type { Pet, PetRecord } from "../types/state";

/** The non-clinical framing the assistant must always operate under. */
export const NON_CLINICAL_INSTRUCTION =
  "You are an informational aid for a pet owner, grounded in the pet profile " +
  "and record excerpts below. You are NOT a veterinarian and must not provide " +
  "a diagnosis, prescribe treatment, or make medical decisions. Answer only " +
  "from the information provided; if it is not covered, say so plainly rather " +
  "than guessing. For anything involving the pet's health, urge the owner to " +
  "consult their veterinarian — and to seek urgent veterinary care for any " +
  "emergency.";

const SEX_LABEL: Record<NonNullable<Pet["sex"]>, string> = {
  male: "Male",
  female: "Female",
  unknown: "Unknown",
};

const DOCUMENT_TYPE_LABEL: Record<PetRecord["documentType"], string> = {
  "medical-record": "Medical record",
  discharge: "Discharge summary",
  lab: "Lab result",
  imaging: "Imaging",
  invoice: "Invoice",
  other: "Other",
};

function hasText(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** Render the pet profile, including only fields that are present. */
function buildProfileSection(pet: Pet): string {
  const lines: string[] = ["# Pet profile"];

  const field = (label: string, value: string | undefined) => {
    if (hasText(value)) lines.push(`- ${label}: ${value.trim()}`);
  };

  field("Name", pet.name);
  field("Species", pet.species);
  field("Breed", pet.breed);
  field("Date of birth", pet.dateOfBirth);
  if (pet.sex) lines.push(`- Sex: ${SEX_LABEL[pet.sex]}`);
  field("Weight", pet.weight);
  field("Microchip ID", pet.microchipId);
  field("Veterinarian", pet.vetName);
  field("Clinic", pet.clinic);
  field("Notes", pet.notes);

  return lines.join("\n");
}

/** Header line for a single record, e.g. "## Rabies vaccine — Lab result — 2024-05-01". */
function recordHeader(record: PetRecord): string {
  const parts: string[] = [hasText(record.title) ? record.title.trim() : "Untitled record"];
  parts.push(DOCUMENT_TYPE_LABEL[record.documentType] ?? "Other");
  if (hasText(record.documentDate)) parts.push(record.documentDate.trim());
  if (hasText(record.source)) parts.push(record.source.trim());
  return `## ${parts.join(" — ")}`;
}

/**
 * Build the system prompt for a pet's chat.
 *
 * @param pet     The selected pet.
 * @param records The pet's records (any pet's records may be passed; only those
 *                belonging to `pet` are included).
 * @returns       A single system message string.
 */
export function buildSystemPrompt(pet: Pet, records: PetRecord[]): string {
  const sections: string[] = [NON_CLINICAL_INSTRUCTION, buildProfileSection(pet)];

  const own = records.filter((r) => r.petId === pet.id);
  const readable = own.filter((r) => hasText(r.extractedText));
  const unreadable = own.filter((r) => !hasText(r.extractedText));

  if (readable.length > 0) {
    const recordBlocks = readable.map(
      (record) => `${recordHeader(record)}\n\n${record.extractedText!.trim()}`,
    );
    sections.push(["# Records", ...recordBlocks].join("\n\n"));
  }

  if (unreadable.length > 0) {
    const noted = unreadable
      .map((record) => `- ${recordHeader(record).replace(/^##\s*/, "")}`)
      .join("\n");
    sections.push(
      "# Records without extracted text\n" +
        "These records exist but their text could not be extracted, so their " +
        "contents are not available to you:\n" +
        noted,
    );
  }

  if (readable.length === 0 && unreadable.length === 0) {
    sections.push(
      "# Records\nNo records have been uploaded for this pet yet.",
    );
  }

  return sections.join("\n\n");
}
