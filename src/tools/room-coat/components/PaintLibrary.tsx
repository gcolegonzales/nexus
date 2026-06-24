"use client";

import { useState } from "react";
import { createId } from "@/shared/ids/createId";
import { useRoomCoat } from "@/tools/room-coat/RoomCoatProvider";
import { PaintForm } from "@/tools/room-coat/components/PaintForm";
import { formatPaintLabel } from "@/tools/room-coat/lib/resolve-paint";
import { createSeedPaints } from "@/tools/room-coat/lib/seed-paints";
import {
  SortableTable,
  type SortableColumn,
} from "@/tools/room-coat/components/SortableTable";
import type { Paint } from "@/tools/room-coat/types/state";
import { Badge, Card, Modal, useConfirm, useToast } from "@nexus/ui";
import { Button, PrimaryButton } from "@nexus/next";

const STARTER_SWATCHES = [
  "#F8F8F2",
  "#F2EDE4",
  "#D1CBC0",
  "#DCD4C6",
  "#434C56",
  "#CDD4CA",
  "#C2D4D8",
  "#2A2A2A",
];

function createEmptyPaint(): Paint {
  return {
    id: createId(),
    code: "",
    hex: "#e2e8f0",
  };
}

interface PaintLibraryProps {
  unitName: string;
}

export function PaintLibrary({ unitName }: PaintLibraryProps) {
  const { activePaints, upsertPaint, deletePaint } = useRoomCoat();
  const toast = useToast();
  const confirm = useConfirm();
  const [editing, setEditing] = useState<Paint | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingStarter, setLoadingStarter] = useState(false);

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
    toast.success("Paint saved");
    setModalOpen(false);
    setEditing(null);
  }

  async function handleDelete(paint: Paint) {
    const confirmed = await confirm({
      title: "Delete paint?",
      message: `Delete ${formatPaintLabel(paint)}?`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!confirmed) return;
    await deletePaint(paint.id);
    toast.success("Paint deleted");
  }

  async function loadStarterPalette() {
    setLoadingStarter(true);
    try {
      for (const paint of createSeedPaints()) {
        await upsertPaint(paint);
      }
      toast.success("Starter palette loaded");
    } finally {
      setLoadingStarter(false);
    }
  }

  const columns: SortableColumn<Paint>[] = [
      {
        id: "swatch",
        label: "Color",
        sortValue: (paint) => paint.hex,
        headerClassName: "w-16",
        cellClassName: "w-16",
        render: (paint) => (
          <span
            className="inline-block h-9 w-9 rounded-lg border border-border shadow-sm"
            style={{ backgroundColor: paint.hex }}
            aria-hidden
          />
        ),
      },
      {
        id: "brand",
        label: "Brand",
        sortValue: (paint) => paint.brand ?? "",
        render: (paint) => (
          <span className="text-text">{paint.brand ?? "—"}</span>
        ),
      },
      {
        id: "code",
        label: "Code",
        sortValue: (paint) => paint.code,
        render: (paint) => (
          <span className="font-medium text-text">{paint.code}</span>
        ),
      },
      {
        id: "name",
        label: "Name",
        sortValue: (paint) => paint.name ?? "",
        render: (paint) => (
          <span className="text-muted">{paint.name ?? "—"}</span>
        ),
      },
      {
        id: "hex",
        label: "Hex",
        sortValue: (paint) => paint.hex,
        render: (paint) => (
          <span className="font-mono text-xs uppercase text-muted">
            {paint.hex}
          </span>
        ),
      },
      {
        id: "actions",
        label: "",
        sortValue: () => "",
        headerClassName: "w-40",
        cellClassName: "w-40",
        render: (paint) => (
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => openEdit(paint)}>
              Edit
            </Button>
            <Button variant="danger" onClick={() => void handleDelete(paint)}>
              Delete
            </Button>
          </div>
        ),
      },
    ];

  if (activePaints.length === 0) {
    return (
      <>
        <Card className="overflow-hidden border-dashed">
          <div className="grid gap-8 p-6 sm:grid-cols-[1fr_auto] sm:items-center sm:p-8">
            <div className="space-y-4">
              <Badge variant="sky">Paint library</Badge>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-text">
                  Build a palette for {unitName}
                </h3>
                <p className="max-w-lg text-sm leading-relaxed text-muted">
                  Save brand codes and swatches here, then assign them as unit
                  defaults, room coats, or per-surface overrides in the overview
                  editor.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <PrimaryButton onClick={openCreate}>Add paint</PrimaryButton>
                <Button
                  variant="secondary"
                  disabled={loadingStarter}
                  onClick={() => void loadStarterPalette()}
                >
                  {loadingStarter ? "Loading…" : "Load starter palette"}
                </Button>
              </div>
            </div>
            <div
              className="grid grid-cols-4 gap-2 sm:gap-2.5"
              aria-hidden
            >
              {STARTER_SWATCHES.map((hex, index) => (
                <div
                  key={hex}
                  className="aspect-square rounded-xl border border-border/80 shadow-sm"
                  style={{
                    backgroundColor: hex,
                    opacity: 0.35 + (index % 4) * 0.08,
                  }}
                />
              ))}
            </div>
          </div>
        </Card>

        <PaintEditorModal
          open={modalOpen}
          editing={editing}
          existingPaints={activePaints}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onChange={setEditing}
          onSave={() => void handleSave()}
        />
      </>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">
            {activePaints.length} paint{activePaints.length === 1 ? "" : "s"}{" "}
            · click column headers to sort
          </p>
          <PrimaryButton onClick={openCreate}>Add paint</PrimaryButton>
        </div>
        <SortableTable
          rows={activePaints}
          columns={columns}
          getRowKey={(paint) => paint.id}
          defaultSort={{ id: "brand", direction: "asc" }}
        />
      </div>

      <PaintEditorModal
        open={modalOpen}
        editing={editing}
        existingPaints={activePaints}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onChange={setEditing}
        onSave={() => void handleSave()}
      />
    </>
  );
}

function PaintEditorModal({
  open,
  editing,
  existingPaints,
  onClose,
  onChange,
  onSave,
}: {
  open: boolean;
  editing: Paint | null;
  existingPaints: Paint[];
  onClose: () => void;
  onChange: (paint: Paint) => void;
  onSave: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        editing && existingPaints.some((p) => p.id === editing.id)
          ? "Edit paint"
          : "Add paint"
      }
    >
      {editing && (
        <PaintForm
          paint={editing}
          onChange={onChange}
          onSave={onSave}
          onCancel={onClose}
        />
      )}
    </Modal>
  );
}
