"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useToast } from "@nexus/ui";
import { createId } from "@/shared/ids/createId";
import { PAGE_CONTAINER } from "@/shared/ui/page-container";
import { ensureSchemaVersion } from "@/core/storage/db";
import { extractRecordText } from "@/tools/pet-health/lib/extract";
import {
  deleteRecordFile,
  getRecordFile,
  putRecordFile,
} from "@/tools/pet-health/storage/files";
import {
  loadPetHealth,
  savePetHealth,
} from "@/tools/pet-health/storage";
import type {
  ChatMessage,
  Pet,
  PetHealthState,
  PetRecord,
} from "@/tools/pet-health/types/state";

// ---------------------------------------------------------------------------
// Input shapes
// ---------------------------------------------------------------------------

/** Fields a caller supplies when creating a pet; only name + species required. */
export type CreatePetInput = Pick<Pet, "name" | "species"> &
  Partial<
    Omit<Pet, "id" | "name" | "species" | "createdAt" | "updatedAt">
  >;

/** Editable pet fields (identity + timestamps managed by the provider). */
export type UpdatePetPatch = Partial<
  Omit<Pet, "id" | "createdAt" | "updatedAt">
>;

/** Editable record metadata (file identity + extraction managed elsewhere). */
export type UpdateRecordPatch = Partial<
  Pick<
    PetRecord,
    "title" | "documentType" | "documentDate" | "source"
  >
>;

// ---------------------------------------------------------------------------
// Context value
// ---------------------------------------------------------------------------

interface PetHealthContextValue {
  state: PetHealthState;
  isReady: boolean;
  activePetId: string | null;
  refresh: () => Promise<void>;

  // Pets
  setActivePet: (petId: string | null) => void;
  createPet: (input: CreatePetInput) => Promise<Pet>;
  updatePet: (id: string, patch: UpdatePetPatch) => Promise<void>;
  deletePet: (id: string) => Promise<void>;

  // Records
  addRecord: (petId: string, file: File) => Promise<PetRecord>;
  updateRecord: (id: string, patch: UpdateRecordPatch) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
  reExtract: (recordId: string) => Promise<void>;
  getRecordFile: (recordId: string) => Promise<Blob | undefined>;

  // Conversations
  getMessages: (petId: string) => ChatMessage[];
  appendMessage: (petId: string, msg: ChatMessage) => Promise<void>;
  clearConversation: (petId: string) => Promise<void>;
}

const PetHealthContext = createContext<PetHealthContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function PetHealthProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [state, setState] = useState<PetHealthState | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [activePetId, setActivePetId] = useState<string | null>(null);

  // Always-current snapshot so async work (e.g. extraction completing) mutates
  // the latest state rather than a stale closure capture.
  const stateRef = useRef<PetHealthState | null>(null);

  const refresh = useCallback(async () => {
    try {
      await ensureSchemaVersion();
      const loaded = await loadPetHealth();
      stateRef.current = loaded;
      setState(loaded);
      setActivePetId((current) => {
        if (current && loaded.pets.some((pet) => pet.id === current)) {
          return current;
        }
        return loaded.pets[0]?.id ?? null;
      });
    } catch (error) {
      console.error("Failed to load Pet Health state", error);
      toast.error(
        "Could not load saved data",
        "Some saved pets or records may be unavailable.",
      );
    } finally {
      setIsReady(true);
    }
  }, [toast]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const persist = useCallback(
    async (next: PetHealthState) => {
      stateRef.current = next;
      setState(next);
      try {
        await savePetHealth(next);
      } catch (error) {
        console.error("Failed to save Pet Health state", error);
        toast.error(
          "Could not save changes",
          "Your edits are shown but may not persist after refreshing.",
        );
      }
    },
    [toast],
  );

  const mutate = useCallback(
    async (updater: (current: PetHealthState) => PetHealthState) => {
      const current = stateRef.current;
      if (!current) return;
      await persist(updater(current));
    },
    [persist],
  );

  // -------------------------------------------------------------------------
  // Pets
  // -------------------------------------------------------------------------

  const setActivePet = useCallback((petId: string | null) => {
    setActivePetId(petId);
  }, []);

  const createPet = useCallback(
    async (input: CreatePetInput): Promise<Pet> => {
      const now = new Date().toISOString();
      const pet: Pet = {
        id: createId(),
        name: input.name,
        species: input.species,
        breed: input.breed,
        dateOfBirth: input.dateOfBirth,
        sex: input.sex,
        weight: input.weight,
        microchipId: input.microchipId,
        vetName: input.vetName,
        clinic: input.clinic,
        notes: input.notes,
        createdAt: now,
        updatedAt: now,
      };
      await mutate((current) => ({
        ...current,
        pets: [...current.pets, pet],
      }));
      setActivePetId(pet.id);
      return pet;
    },
    [mutate],
  );

  const updatePet = useCallback(
    async (id: string, patch: UpdatePetPatch) => {
      await mutate((current) => ({
        ...current,
        pets: current.pets.map((pet) =>
          pet.id === id
            ? { ...pet, ...patch, updatedAt: new Date().toISOString() }
            : pet,
        ),
      }));
    },
    [mutate],
  );

  const deletePet = useCallback(
    async (id: string) => {
      // Collect file Blobs to remove before pruning the slice.
      const current = stateRef.current;
      const fileRefs =
        current?.records
          .filter((record) => record.petId === id)
          .map((record) => record.fileRef) ?? [];

      await mutate((draft) => {
        const pets = draft.pets.filter((pet) => pet.id !== id);
        const records = draft.records.filter((record) => record.petId !== id);
        const conversations = { ...draft.conversations };
        delete conversations[id];
        return { ...draft, pets, records, conversations };
      });

      // Remove the orphaned Blobs (best-effort).
      await Promise.all(
        fileRefs.map((fileRef) =>
          deleteRecordFile(fileRef).catch((error) => {
            console.error("Failed to delete record file", error);
          }),
        ),
      );

      // Reselect the active pet if the deleted one was active.
      setActivePetId((activeId) => {
        if (activeId !== id) return activeId;
        return stateRef.current?.pets[0]?.id ?? null;
      });
    },
    [mutate],
  );

  // -------------------------------------------------------------------------
  // Records
  // -------------------------------------------------------------------------

  /**
   * Run extraction for a record and persist the result. Sets status
   * 'extracting' while running, then 'done' | 'empty' | 'failed' on completion.
   * Idempotent: replaces any previously stored text/status/method.
   */
  const runExtraction = useCallback(
    async (recordId: string) => {
      const current = stateRef.current;
      const record = current?.records.find((item) => item.id === recordId);
      if (!record) return;

      const blob = await getRecordFile(record.fileRef);
      if (!blob) {
        await mutate((draft) => ({
          ...draft,
          records: draft.records.map((item) =>
            item.id === recordId
              ? {
                  ...item,
                  extractedText: undefined,
                  extractionStatus: "failed",
                  extractionMethod: "none",
                }
              : item,
          ),
        }));
        return;
      }

      // Mark as extracting.
      await mutate((draft) => ({
        ...draft,
        records: draft.records.map((item) =>
          item.id === recordId
            ? { ...item, extractionStatus: "extracting" }
            : item,
        ),
      }));

      const result = await extractRecordText(blob, record.mimeType);

      await mutate((draft) => ({
        ...draft,
        records: draft.records.map((item) =>
          item.id === recordId
            ? {
                ...item,
                extractedText: result.text || undefined,
                extractionStatus: result.status,
                extractionMethod: result.method,
              }
            : item,
        ),
      }));
    },
    [mutate],
  );

  const addRecord = useCallback(
    async (petId: string, file: File): Promise<PetRecord> => {
      const now = new Date().toISOString();
      const fileRef = createId();

      // Store the raw bytes first so the metadata always references a real Blob.
      await putRecordFile(fileRef, file);

      const record: PetRecord = {
        id: createId(),
        petId,
        title: file.name || "Untitled document",
        documentType: "other",
        documentDate: undefined,
        source: undefined,
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        uploadedAt: now,
        updatedAt: now,
        fileRef,
        extractedText: undefined,
        extractionStatus: "pending",
        extractionMethod: "none",
      };

      await mutate((current) => ({
        ...current,
        records: [...current.records, record],
      }));

      // Kick off extraction without blocking the caller / UI.
      void runExtraction(record.id);

      return record;
    },
    [mutate, runExtraction],
  );

  const updateRecord = useCallback(
    async (id: string, patch: UpdateRecordPatch) => {
      await mutate((current) => ({
        ...current,
        records: current.records.map((record) =>
          record.id === id
            ? { ...record, ...patch, updatedAt: new Date().toISOString() }
            : record,
        ),
      }));
    },
    [mutate],
  );

  const deleteRecord = useCallback(
    async (id: string) => {
      const current = stateRef.current;
      const record = current?.records.find((item) => item.id === id);

      await mutate((draft) => ({
        ...draft,
        records: draft.records.filter((item) => item.id !== id),
      }));

      if (record) {
        await deleteRecordFile(record.fileRef).catch((error) => {
          console.error("Failed to delete record file", error);
        });
      }
    },
    [mutate],
  );

  const reExtract = useCallback(
    async (recordId: string) => {
      await runExtraction(recordId);
    },
    [runExtraction],
  );

  const getRecordFileForRecord = useCallback(
    async (recordId: string): Promise<Blob | undefined> => {
      const current = stateRef.current;
      const record = current?.records.find((item) => item.id === recordId);
      if (!record) return undefined;
      return getRecordFile(record.fileRef);
    },
    [],
  );

  // -------------------------------------------------------------------------
  // Conversations
  // -------------------------------------------------------------------------

  const getMessages = useCallback(
    (petId: string): ChatMessage[] => {
      return state?.conversations[petId] ?? [];
    },
    [state],
  );

  const appendMessage = useCallback(
    async (petId: string, msg: ChatMessage) => {
      await mutate((current) => {
        const existing = current.conversations[petId] ?? [];
        return {
          ...current,
          conversations: {
            ...current.conversations,
            [petId]: [...existing, msg],
          },
        };
      });
    },
    [mutate],
  );

  const clearConversation = useCallback(
    async (petId: string) => {
      await mutate((current) => {
        const conversations = { ...current.conversations };
        delete conversations[petId];
        return { ...current, conversations };
      });
    },
    [mutate],
  );

  // -------------------------------------------------------------------------
  // Context value
  // -------------------------------------------------------------------------

  const value = useMemo(() => {
    if (!state) return null;
    return {
      state,
      isReady,
      activePetId,
      refresh,
      setActivePet,
      createPet,
      updatePet,
      deletePet,
      addRecord,
      updateRecord,
      deleteRecord,
      reExtract,
      getRecordFile: getRecordFileForRecord,
      getMessages,
      appendMessage,
      clearConversation,
    };
  }, [
    state,
    isReady,
    activePetId,
    refresh,
    setActivePet,
    createPet,
    updatePet,
    deletePet,
    addRecord,
    updateRecord,
    deleteRecord,
    reExtract,
    getRecordFileForRecord,
    getMessages,
    appendMessage,
    clearConversation,
  ]);

  if (!value) {
    return (
      <div className={`${PAGE_CONTAINER} py-16 text-muted`}>
        Loading pet health…
      </div>
    );
  }

  return (
    <PetHealthContext.Provider value={value}>
      {children}
    </PetHealthContext.Provider>
  );
}

export function usePetHealth(): PetHealthContextValue {
  const context = useContext(PetHealthContext);
  if (!context) {
    throw new Error("usePetHealth must be used within PetHealthProvider");
  }
  return context;
}
