"use client";

import { useEffect, useState } from "react";
import { useHomeMaintenance } from "@/tools/home-maintenance/HomeMaintenanceProvider";
import { useSavedHint } from "@/shared/hooks/useSavedHint";
import type { Home } from "@/tools/home-maintenance/types/home";
import { Button } from "@nexus/next";
import { FormActions } from "@nexus/next";
import { Input, Textarea } from "@nexus/ui";
import { Badge } from "@nexus/ui";

interface HomeManageFormProps {
  home: Home;
  onClose: () => void;
}

export function HomeManageForm({ home, onClose }: HomeManageFormProps) {
  const { state, updateHome, deleteHome } = useHomeMaintenance();
  const [draft, setDraft] = useState<Home>(home);
  const { saved, showSaved } = useSavedHint();

  useEffect(() => {
    setDraft(home);
  }, [home]);

  async function handleSave() {
    await updateHome(draft.id, {
      name: draft.name.trim() || "Home",
      setupDate: draft.setupDate,
      notes: draft.notes,
      hvacFilterSize: draft.hvacFilterSize,
    });
    showSaved();
  }

  async function handleDelete() {
    if (state.homes.length <= 1) return;

    const confirmed = window.confirm(
      `Delete ${draft.name} and all of its assets, tasks, and calendar links?`,
    );
    if (!confirmed) return;

    await deleteHome(draft.id);
    onClose();
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        void handleSave();
      }}
    >
      {saved && <Badge variant="mint">Saved</Badge>}

      <Input
        label="Home name"
        value={draft.name}
        onChange={(event) => setDraft({ ...draft, name: event.target.value })}
        autoFocus
      />
      <Input
        label="Setup date"
        type="date"
        value={draft.setupDate ?? ""}
        onChange={(event) =>
          setDraft({
            ...draft,
            setupDate: event.target.value || undefined,
          })
        }
        hint="Optional anchor for when maintenance tracking started at this home."
      />
      <Input
        label="HVAC filter size"
        placeholder="e.g. 20x25x1"
        value={draft.hvacFilterSize ?? ""}
        onChange={(event) =>
          setDraft({
            ...draft,
            hvacFilterSize: event.target.value || undefined,
          })
        }
      />
      <Textarea
        label="Notes"
        value={draft.notes ?? ""}
        onChange={(event) =>
          setDraft({ ...draft, notes: event.target.value || undefined })
        }
      />

      <FormActions
        saveLabel="Save Home"
        onSave={() => void handleSave()}
        onCancel={onClose}
        left={
          state.homes.length > 1 ? (
            <Button variant="danger" onClick={() => void handleDelete()}>
              Delete Home
            </Button>
          ) : undefined
        }
      />
    </form>
  );
}
