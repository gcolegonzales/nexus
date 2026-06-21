"use client";

import { useMemo, useState } from "react";
import { createId } from "@/shared/ids/createId";
import { useRoomCoat } from "@/tools/room-coat/RoomCoatProvider";
import { PaintForm } from "@/tools/room-coat/components/PaintForm";
import { PaintListItem } from "@/tools/room-coat/components/PaintPicker";
import { ToolSection } from "@/tools/room-coat/components/ToolSection";
import type { Paint } from "@/tools/room-coat/types/state";
import { Modal } from "@nexus/ui";
import { PrimaryButton } from "@nexus/next";

function createEmptyPaint(): Paint {
  return {
    id: createId(),
    code: "",
    hex: "#e2e8f0",
  };
}

export default function RoomCoatPaintsPage() {
  const { activeUnit, activePaints, upsertPaint, deletePaint } = useRoomCoat();
  const [editing, setEditing] = useState<Paint | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const sortedPaints = useMemo(
    () =>
      [...activePaints].sort((a, b) =>
        `${a.brand ?? ""}${a.code}`.localeCompare(`${b.brand ?? ""}${b.code}`),
      ),
    [activePaints],
  );

  function openCreate() {
    setEditing(createEmptyPaint());
    setModalOpen(true);
  }

  function openEdit(paint: Paint) {
    setEditing({ ...paint });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!editing || !editing.code.trim()) return;
    await upsertPaint({ ...editing, code: editing.code.trim() });
    setModalOpen(false);
    setEditing(null);
  }

  return (
    <ToolSection
      title="Paint library"
      description={`Brand codes and swatches for ${activeUnit.name}. Assign them to coats and surface overrides on the overview.`}
      action={<PrimaryButton onClick={openCreate}>Add paint</PrimaryButton>}
    >
      {sortedPaints.length === 0 ? (
        <p className="text-sm text-muted">
          No paints saved for this unit yet. Add wall, trim, ceiling, and door
          colors here.
        </p>
      ) : (
        <div className="space-y-3">
          {sortedPaints.map((paint) => (
            <PaintListItem
              key={paint.id}
              paint={paint}
              onEdit={() => openEdit(paint)}
              onDelete={() => {
                if (confirm(`Delete paint ${paint.code}?`)) {
                  void deletePaint(paint.id);
                }
              }}
            />
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        title={
          editing && activePaints.some((p) => p.id === editing.id)
            ? "Edit paint"
            : "Add paint"
        }
      >
        {editing && (
          <PaintForm
            paint={editing}
            onChange={setEditing}
            onSave={() => void handleSave()}
            onCancel={() => {
              setModalOpen(false);
              setEditing(null);
            }}
          />
        )}
      </Modal>
    </ToolSection>
  );
}
