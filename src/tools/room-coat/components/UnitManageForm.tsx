"use client";

import { useEffect, useState } from "react";
import { useRoomCoat } from "@/tools/room-coat/RoomCoatProvider";
import type { HomeUnit } from "@/tools/room-coat/types/state";
import { Button } from "@nexus/next";
import { FormActions } from "@nexus/next";
import { Input, useToast } from "@nexus/ui";

interface UnitManageFormProps {
  unit: HomeUnit;
  onClose: () => void;
}

export function UnitManageForm({ unit, onClose }: UnitManageFormProps) {
  const { state, updateUnit, deleteUnit } = useRoomCoat();
  const toast = useToast();
  const [draftName, setDraftName] = useState(unit.name);

  useEffect(() => {
    setDraftName(unit.name);
  }, [unit.name]);

  async function handleSave() {
    await updateUnit(unit.id, { name: draftName.trim() || "Unit" });
    toast.success("Unit saved");
  }

  async function handleDelete() {
    if (state.units.length <= 1) return;

    const confirmed = window.confirm(
      `Delete ${draftName} and remove its room layout and hallways? Room definitions stay in your catalog.`,
    );
    if (!confirmed) return;

    await deleteUnit(unit.id);
    toast.success("Unit deleted");
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
      <Input
        label="Unit name"
        value={draftName}
        onChange={(event) => setDraftName(event.target.value)}
        autoFocus
      />

      <FormActions
        saveLabel="Save unit"
        onSave={() => void handleSave()}
        onCancel={onClose}
        left={
          state.units.length > 1 ? (
            <Button variant="danger" onClick={() => void handleDelete()}>
              Delete unit
            </Button>
          ) : undefined
        }
      />
    </form>
  );
}
