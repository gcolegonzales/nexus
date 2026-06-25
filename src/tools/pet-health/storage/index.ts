import { getItem, setItem } from "@/core/storage/db";
import { STORAGE_KEYS } from "@/core/storage/keys";
import {
  type ChatMessage,
  type Conversations,
  type DocumentType,
  type ExtractionMethod,
  type ExtractionStatus,
  type Pet,
  type PetHealthState,
  type PetRecord,
} from "@/tools/pet-health/types/state";

// ---------------------------------------------------------------------------
// Schema version
// ---------------------------------------------------------------------------

export const CURRENT_PET_HEALTH_SCHEMA_VERSION = 1;

// ---------------------------------------------------------------------------
// Default state
// ---------------------------------------------------------------------------

const DEFAULT_PET_HEALTH_STATE: PetHealthState = {
  schemaVersion: CURRENT_PET_HEALTH_SCHEMA_VERSION,
  pets: [],
  records: [],
  conversations: {},
};

// ---------------------------------------------------------------------------
// Parsers
// ---------------------------------------------------------------------------

function parsePet(value: unknown): Pet | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<Pet>;
  if (
    typeof item.id !== "string" ||
    typeof item.name !== "string" ||
    typeof item.species !== "string" ||
    typeof item.createdAt !== "string" ||
    typeof item.updatedAt !== "string"
  ) {
    return null;
  }
  const validSex = ["male", "female", "unknown"] as const;
  return {
    id: item.id,
    name: item.name,
    species: item.species,
    breed: typeof item.breed === "string" ? item.breed : undefined,
    dateOfBirth:
      typeof item.dateOfBirth === "string" ? item.dateOfBirth : undefined,
    sex: validSex.includes(item.sex as (typeof validSex)[number])
      ? (item.sex as Pet["sex"])
      : undefined,
    weight: typeof item.weight === "string" ? item.weight : undefined,
    microchipId:
      typeof item.microchipId === "string" ? item.microchipId : undefined,
    vetName: typeof item.vetName === "string" ? item.vetName : undefined,
    clinic: typeof item.clinic === "string" ? item.clinic : undefined,
    notes: typeof item.notes === "string" ? item.notes : undefined,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

const VALID_DOCUMENT_TYPES: DocumentType[] = [
  "medical-record",
  "discharge",
  "lab",
  "imaging",
  "invoice",
  "other",
];

const VALID_EXTRACTION_STATUSES: ExtractionStatus[] = [
  "pending",
  "extracting",
  "done",
  "empty",
  "failed",
];

const VALID_EXTRACTION_METHODS: ExtractionMethod[] = [
  "pdf-text",
  "ocr",
  "vision",
  "none",
];

function parseRecord(value: unknown): PetRecord | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<PetRecord>;
  if (
    typeof item.id !== "string" ||
    typeof item.petId !== "string" ||
    typeof item.title !== "string" ||
    typeof item.fileName !== "string" ||
    typeof item.mimeType !== "string" ||
    typeof item.fileSize !== "number" ||
    typeof item.uploadedAt !== "string" ||
    typeof item.updatedAt !== "string" ||
    typeof item.fileRef !== "string"
  ) {
    return null;
  }
  const documentType: DocumentType = VALID_DOCUMENT_TYPES.includes(
    item.documentType as DocumentType,
  )
    ? (item.documentType as DocumentType)
    : "other";

  const extractionStatus: ExtractionStatus = VALID_EXTRACTION_STATUSES.includes(
    item.extractionStatus as ExtractionStatus,
  )
    ? (item.extractionStatus as ExtractionStatus)
    : "pending";

  const extractionMethod: ExtractionMethod = VALID_EXTRACTION_METHODS.includes(
    item.extractionMethod as ExtractionMethod,
  )
    ? (item.extractionMethod as ExtractionMethod)
    : "none";

  return {
    id: item.id,
    petId: item.petId,
    title: item.title,
    documentType,
    documentDate:
      typeof item.documentDate === "string" ? item.documentDate : undefined,
    source: typeof item.source === "string" ? item.source : undefined,
    fileName: item.fileName,
    mimeType: item.mimeType,
    fileSize: item.fileSize,
    uploadedAt: item.uploadedAt,
    updatedAt: item.updatedAt,
    fileRef: item.fileRef,
    extractedText:
      typeof item.extractedText === "string" ? item.extractedText : undefined,
    extractionStatus,
    extractionMethod,
  };
}

function parseChatMessage(value: unknown): ChatMessage | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<ChatMessage>;
  if (
    (item.role !== "user" && item.role !== "assistant") ||
    typeof item.content !== "string" ||
    typeof item.createdAt !== "string"
  ) {
    return null;
  }
  return {
    role: item.role,
    content: item.content,
    createdAt: item.createdAt,
  };
}

function parseConversations(value: unknown): Conversations {
  if (!value || typeof value !== "object") return {};
  const result: Conversations = {};
  for (const [petId, messages] of Object.entries(
    value as Record<string, unknown>,
  )) {
    if (!Array.isArray(messages)) continue;
    const parsed = messages
      .map(parseChatMessage)
      .filter((m): m is ChatMessage => m !== null);
    result[petId] = parsed;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Normalize / migrate
// ---------------------------------------------------------------------------

function normalizeState(raw: unknown): PetHealthState {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_PET_HEALTH_STATE };
  }

  const item = raw as Partial<PetHealthState>;

  const pets = Array.isArray(item.pets)
    ? item.pets.map(parsePet).filter((p): p is Pet => p !== null)
    : [];

  const records = Array.isArray(item.records)
    ? item.records.map(parseRecord).filter((r): r is PetRecord => r !== null)
    : [];

  const conversations = parseConversations(item.conversations);

  // Migration hook: increment CURRENT_PET_HEALTH_SCHEMA_VERSION and add cases
  // here as the schema evolves.
  const schemaVersion =
    typeof item.schemaVersion === "number"
      ? item.schemaVersion
      : CURRENT_PET_HEALTH_SCHEMA_VERSION;

  // Future migrations would go here:
  // if (schemaVersion < 2) { ... }

  return {
    schemaVersion,
    pets,
    records,
    conversations,
    lastFolderName:
      typeof item.lastFolderName === "string" ? item.lastFolderName : undefined,
    persistRequestedAt:
      typeof item.persistRequestedAt === "string"
        ? item.persistRequestedAt
        : undefined,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function loadPetHealth(): Promise<PetHealthState> {
  const raw = await getItem<unknown>(STORAGE_KEYS.petHealth);
  if (!raw) {
    const fresh: PetHealthState = { ...DEFAULT_PET_HEALTH_STATE };
    await savePetHealth(fresh);
    return fresh;
  }
  const loaded = normalizeState(raw);
  await savePetHealth(loaded);
  return loaded;
}

export async function savePetHealth(state: PetHealthState): Promise<void> {
  await setItem(STORAGE_KEYS.petHealth, {
    ...state,
    schemaVersion: CURRENT_PET_HEALTH_SCHEMA_VERSION,
  });
}

export function importPetHealthSlice(data: unknown): PetHealthState {
  if (!data || typeof data !== "object") {
    return { ...DEFAULT_PET_HEALTH_STATE };
  }
  return normalizeState(data);
}
