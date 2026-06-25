// ---------------------------------------------------------------------------
// Pet Health — state slice types
// All date/timestamp fields are ISO 8601 strings, consistent with other tools.
// ---------------------------------------------------------------------------

export interface Pet {
  id: string;
  /** Required. Display name of the pet. */
  name: string;
  /** Required. e.g. "dog", "cat", "bird", "rabbit". */
  species: string;
  breed?: string;
  /** ISO date string, e.g. "2020-03-15". */
  dateOfBirth?: string;
  sex?: "male" | "female" | "unknown";
  /** Free-text weight, e.g. "12.5 lbs" or "5.7 kg". */
  weight?: string;
  microchipId?: string;
  vetName?: string;
  clinic?: string;
  notes?: string;
  /** ISO timestamp. */
  createdAt: string;
  /** ISO timestamp. */
  updatedAt: string;
}

export type DocumentType =
  | "medical-record"
  | "discharge"
  | "lab"
  | "imaging"
  | "invoice"
  | "other";

export type ExtractionStatus = "pending" | "extracting" | "done" | "empty" | "failed";

export type ExtractionMethod = "pdf-text" | "ocr" | "vision" | "none";

export interface PetRecord {
  id: string;
  petId: string;
  title: string;
  documentType: DocumentType;
  /** ISO date string for the document date (user-editable). */
  documentDate?: string;
  /** Vet or clinic the document came from. */
  source?: string;
  fileName: string;
  mimeType: string;
  /** File size in bytes. */
  fileSize: number;
  /** ISO timestamp of upload. */
  uploadedAt: string;
  /** ISO timestamp of last metadata edit. */
  updatedAt: string;
  /**
   * ID used as the per-file Blob key in IndexedDB.
   * The file is stored under `tool:pet-health:file:{fileRef}`.
   */
  fileRef: string;
  /** Plain text extracted from the document; absent until extraction completes. */
  extractedText?: string;
  extractionStatus: ExtractionStatus;
  extractionMethod: ExtractionMethod;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  /** ISO timestamp. */
  createdAt: string;
}

/**
 * Per-pet conversation history keyed by petId.
 * Each entry is an ordered list of messages (oldest first).
 */
export type Conversations = Record<string, ChatMessage[]>;

export interface PetHealthState {
  schemaVersion: number;
  pets: Pet[];
  records: PetRecord[];
  /** Per-pet conversation history. Key is Pet.id. */
  conversations: Conversations;
  /** Name of the last folder the user connected for durable storage. */
  lastFolderName?: string;
  /** ISO timestamp of when durable persistence was last requested. */
  persistRequestedAt?: string;
}
