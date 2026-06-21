"use client";

import { useEffect, useState } from "react";
import { useRoomCoat, type AddRoomInput } from "@/tools/room-coat/RoomCoatProvider";
import { DimensionInput } from "@/tools/room-coat/components/DimensionInput";
import { RoomFootprintPreview } from "@/tools/room-coat/components/RoomFootprintPreview";
import { PaintPicker } from "@/tools/room-coat/components/PaintPicker";
import { defaultCoatFieldLabel } from "@/tools/room-coat/lib/build-surfaces";
import { defaultRoomDimensionsMm, formatMm } from "@/tools/room-coat/lib/units";
import { Input, Modal } from "@nexus/ui";
import { FormActions } from "@nexus/next";

interface AddRoomModalProps {
  open: boolean;
  onClose: () => void;
}

type AddRoomDraft = {
  name: string;
  widthMm: number;
  lengthMm: number;
  heightMm: number;
  wallPaintId: string | null;
};

function createDefaultDraft(): AddRoomDraft {
  return {
    name: "",
    ...defaultRoomDimensionsMm(),
    wallPaintId: null,
  };
}

export function AddRoomModal({ open, onClose }: AddRoomModalProps) {
  const { state, activeUnit, activePaints, addRoom } = useRoomCoat();
  const [draft, setDraft] = useState<AddRoomDraft>(() => createDefaultDraft());

  useEffect(() => {
    if (open) {
      setDraft(createDefaultDraft());
    }
  }, [open]);

  async function handleCreate() {
    const trimmed = draft.name.trim();
    if (!trimmed) return;

    const input: AddRoomInput = {
      name: trimmed,
      widthMm: draft.widthMm,
      lengthMm: draft.lengthMm,
      heightMm: draft.heightMm,
      wallPaintId: draft.wallPaintId,
    };

    await addRoom(input);
    onClose();
  }

  const previewLabel = `${formatMm(draft.widthMm, state.unitPreference)} × ${formatMm(draft.lengthMm, state.unitPreference)}`;

  return (
    <Modal open={open} onClose={onClose} title="Add room" panelClassName="max-w-lg">
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          void handleCreate();
        }}
      >
        <Input
          label="Room name"
          value={draft.name}
          onChange={(event) =>
            setDraft((current) => ({ ...current, name: event.target.value }))
          }
          placeholder="Living room"
          autoFocus
        />

        <div className="space-y-3">
          <p className="text-sm font-semibold text-text">Dimensions</p>
          <div className="grid gap-4 lg:grid-cols-3">
            <DimensionInput
              label="Width"
              valueMm={draft.widthMm}
              onChangeMm={(widthMm) =>
                setDraft((current) => ({ ...current, widthMm }))
              }
            />
            <DimensionInput
              label="Length"
              valueMm={draft.lengthMm}
              onChangeMm={(lengthMm) =>
                setDraft((current) => ({ ...current, lengthMm }))
              }
            />
            <DimensionInput
              label="Height"
              valueMm={draft.heightMm}
              onChangeMm={(heightMm) =>
                setDraft((current) => ({ ...current, heightMm }))
              }
            />
          </div>
        </div>

        <RoomFootprintPreview
          widthMm={draft.widthMm}
          lengthMm={draft.lengthMm}
          label={previewLabel}
        />

        <div className="space-y-1.5">
          <PaintPicker
            label={defaultCoatFieldLabel("wall")}
            paints={activePaints}
            value={draft.wallPaintId}
            onChange={(wallPaintId) =>
              setDraft((current) => ({ ...current, wallPaintId }))
            }
          />
          <p className="text-xs text-muted">
            Optional override for {activeUnit.name}. Leave unset to inherit unit
            defaults.
          </p>
        </div>

        <FormActions
          saveLabel="Create room"
          onSave={() => void handleCreate()}
          onCancel={onClose}
        />
      </form>
    </Modal>
  );
}
