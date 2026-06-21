"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRoomCoat } from "@/tools/room-coat/RoomCoatProvider";
import { UnitManageForm } from "@/tools/room-coat/components/UnitManageForm";
import { AccordionCaret } from "@nexus/ui";
import { FormActions } from "@nexus/next";
import { Input } from "@nexus/ui";
import { Modal } from "@nexus/ui";
import { PopoverPanel } from "@nexus/ui";

export function UnitSwitcher() {
  const { state, activeUnit, setActiveUnitId, addUnit } = useRoomCoat();
  const [open, setOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [draftName, setDraftName] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  async function handleCreateUnit() {
    const name = draftName.trim() || "New unit";
    await addUnit(name);
    setDraftName("");
    setAddModalOpen(false);
  }

  return (
    <>
      <div ref={rootRef} className="inline-flex items-stretch">
        <div className="relative">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-haspopup="listbox"
            onClick={() => setOpen((current) => !current)}
            className={`flex min-w-[10rem] cursor-pointer items-center justify-between gap-3 rounded-l-xl border border-r-0 bg-surface px-3 py-2.5 text-left text-sm font-medium text-text transition-all duration-200 ease-out hover:border-primary/30 sm:min-w-[12rem] ${
              open ? "border-primary/40 shadow-sm" : "border-border"
            }`}
          >
            <span className="truncate">{activeUnit.name}</span>
            <AccordionCaret open={open} />
          </button>

          <PopoverPanel
            open={open}
            id={listboxId}
            className="left-0 w-full min-w-full overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-lg"
          >
            <ul role="listbox" aria-label="Select unit">
              {state.units.map((unit) => {
                const active = unit.id === activeUnit.id;
                return (
                  <li key={unit.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => {
                        void setActiveUnitId(unit.id);
                        setOpen(false);
                      }}
                      className={`flex w-full cursor-pointer items-center justify-between px-3 py-2.5 text-left text-sm transition-colors duration-150 ${
                        active
                          ? "bg-accent-sky/15 font-medium text-text"
                          : "text-text hover:bg-border/40"
                      }`}
                    >
                      <span className="truncate">{unit.name}</span>
                      {active && (
                        <span className="ml-2 text-xs text-primary">Active</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="border-t border-border px-3 py-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setManageModalOpen(true);
                }}
                className="cursor-pointer text-sm font-medium text-primary transition-colors hover:underline"
              >
                Manage unit
              </button>
            </div>
          </PopoverPanel>
        </div>

        <button
          type="button"
          aria-label="Add unit"
          onClick={() => {
            setOpen(false);
            setAddModalOpen(true);
          }}
          className="btn-interactive cursor-pointer rounded-r-xl border border-l-0 border-border bg-surface px-3 py-2.5 text-lg leading-none text-primary transition-all duration-200 ease-out hover:border-primary/30 hover:bg-accent-sky/10"
        >
          +
        </button>
      </div>

      <Modal open={addModalOpen} onClose={() => setAddModalOpen(false)} title="Add unit">
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            void handleCreateUnit();
          }}
        >
          <Input
            label="Unit name"
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            placeholder="Main floor"
            autoFocus
          />
          <FormActions
            saveLabel="Create"
            onSave={() => void handleCreateUnit()}
            onCancel={() => setAddModalOpen(false)}
          />
        </form>
      </Modal>

      <Modal
        open={manageModalOpen}
        onClose={() => setManageModalOpen(false)}
        title="Manage unit"
        panelClassName="max-w-lg"
      >
        <UnitManageForm unit={activeUnit} onClose={() => setManageModalOpen(false)} />
      </Modal>
    </>
  );
}
