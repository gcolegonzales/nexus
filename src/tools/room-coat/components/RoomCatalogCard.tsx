"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { useRoomCoat } from "@/tools/room-coat/RoomCoatProvider";
import { DimensionInput } from "@/tools/room-coat/components/DimensionInput";
import { RoomFootprintPreview } from "@/tools/room-coat/components/RoomFootprintPreview";
import {
  accordionCardClassName,
  accordionCardTransitionClassName,
  accordionHeaderClassName,
  accordionPanelClassName,
} from "@/tools/room-coat/components/accordion-styles";
import { formatMm } from "@/tools/room-coat/lib/units";
import type { Room, UnitPreference } from "@/tools/room-coat/types/state";
import { AccordionCaret, Badge, Card, Collapsible, Input } from "@nexus/ui";
import { Button, FormActions } from "@nexus/next";

interface RoomCatalogCardProps {
  room: Room;
  unitPreference: UnitPreference;
  attachedUnits: string[];
  inActiveUnit: boolean;
}

type RoomDraft = Pick<Room, "name" | "widthMm" | "lengthMm" | "heightMm">;

function draftFromRoom(room: Room): RoomDraft {
  return {
    name: room.name,
    widthMm: room.widthMm,
    lengthMm: room.lengthMm,
    heightMm: room.heightMm,
  };
}

export function RoomCatalogCard({
  room,
  unitPreference,
  attachedUnits,
  inActiveUnit,
}: RoomCatalogCardProps) {
  const { updateRoom, deleteRoom } = useRoomCoat();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<RoomDraft>(() => draftFromRoom(room));
  const panelId = `room-catalog-${room.id}`;

  useEffect(() => {
    if (!editing) {
      setDraft(draftFromRoom(room));
    }
  }, [room, editing]);

  const dimensionLabel = `${formatMm(room.widthMm, unitPreference)} × ${formatMm(room.lengthMm, unitPreference)} × ${formatMm(room.heightMm, unitPreference)}`;
  const previewLabel = `${formatMm(room.widthMm, unitPreference)} × ${formatMm(room.lengthMm, unitPreference)}`;

  function handleHeaderClick() {
    if (open && editing) {
      setDraft(draftFromRoom(room));
      setEditing(false);
      setOpen(false);
      return;
    }

    setOpen((current) => !current);
    if (!open) {
      setEditing(false);
      setDraft(draftFromRoom(room));
    }
  }

  function startEditing(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    setDraft(draftFromRoom(room));
    setEditing(true);
    setOpen(true);
  }

  async function handleSave(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    const trimmed = draft.name.trim();
    if (!trimmed) return;

    await updateRoom(room.id, {
      name: trimmed,
      widthMm: draft.widthMm,
      lengthMm: draft.lengthMm,
      heightMm: draft.heightMm,
    });
    setEditing(false);
  }

  function handleCancel(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    setDraft(draftFromRoom(room));
    setEditing(false);
  }

  const summaryDraft = editing ? draft : draftFromRoom(room);

  return (
    <Card
      padding={false}
      className={`${accordionCardTransitionClassName} ${accordionCardClassName(open)}`}
    >
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={handleHeaderClick}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleHeaderClick();
          }
        }}
        className={accordionHeaderClassName(open)}
      >
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <RoomFootprintPreview
            widthMm={room.widthMm}
            lengthMm={room.lengthMm}
            label={previewLabel}
          />
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-lg font-semibold text-text">
                {room.name}
              </h3>
              {inActiveUnit && <Badge variant="sky">Active unit</Badge>}
            </div>
            <p className="text-sm text-muted">{dimensionLabel}</p>
            <div className="flex flex-wrap gap-1.5">
              {attachedUnits.length === 0 ? (
                <Badge>Not placed</Badge>
              ) : (
                attachedUnits.map((unitName) => (
                  <Badge key={unitName} variant="mint">
                    {unitName}
                  </Badge>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {!editing && (
            <Button variant="ghost" onClick={startEditing}>
              Edit
            </Button>
          )}
          <AccordionCaret open={open} />
        </div>
      </div>

      <Collapsible open={open} id={panelId} innerClassName={accordionPanelClassName}>
        <div onClick={(event) => event.stopPropagation()}>
          {editing ? (
              <div className="space-y-5">
                <Input
                  label="Room name"
                  value={draft.name}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
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
                  widthMm={summaryDraft.widthMm}
                  lengthMm={summaryDraft.lengthMm}
                  label={`${formatMm(summaryDraft.widthMm, unitPreference)} × ${formatMm(summaryDraft.lengthMm, unitPreference)}`}
                />

                <FormActions
                  onSave={(event) => void handleSave(event)}
                  onCancel={handleCancel}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <dl className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                      Width
                    </dt>
                    <dd className="mt-1 text-sm text-text">
                      {formatMm(room.widthMm, unitPreference)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                      Length
                    </dt>
                    <dd className="mt-1 text-sm text-text">
                      {formatMm(room.lengthMm, unitPreference)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                      Height
                    </dt>
                    <dd className="mt-1 text-sm text-text">
                      {formatMm(room.heightMm, unitPreference)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                      Doors
                    </dt>
                    <dd className="mt-1 text-sm text-text">
                      {room.doors.length}
                    </dd>
                  </div>
                </dl>

                <div className="flex flex-wrap gap-2">
                  <Button onClick={startEditing}>Edit room</Button>
                  <Button
                    variant="danger"
                    onClick={() => {
                      if (
                        confirm(
                          `Delete "${room.name}" from the catalog? It will be removed from all units.`,
                        )
                      ) {
                        void deleteRoom(room.id);
                      }
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            )}
        </div>
      </Collapsible>
    </Card>
  );
}
