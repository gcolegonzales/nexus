"use client";

import { useEffect, useId, useRef, useState } from "react";
import { usePetHealth } from "@/tools/pet-health/PetHealthProvider";
import { PetForm } from "@/tools/pet-health/components/PetForm";
import { AccordionCaret } from "@nexus/ui";
import { Modal } from "@nexus/ui";
import { PopoverPanel } from "@nexus/ui";

export function PetSelector() {
  const { state, activePetId, setActivePet } = usePetHealth();
  const [open, setOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addDirty, setAddDirty] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const activePet = state.pets.find((p) => p.id === activePetId) ?? state.pets[0] ?? null;

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  if (state.pets.length === 0) {
    return (
      <>
        <button
          type="button"
          onClick={() => setAddModalOpen(true)}
          className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm font-medium text-primary transition-all duration-200 ease-out hover:border-primary/30 hover:bg-accent-sky/10"
        >
          + Add Pet
        </button>

        <Modal
          open={addModalOpen}
          onClose={() => {
            setAddModalOpen(false);
            setAddDirty(false);
          }}
          title="Add a pet"
          dirty={addDirty}
        >
          <PetForm
            onDone={() => {
              setAddModalOpen(false);
              setAddDirty(false);
            }}
            onDirtyChange={setAddDirty}
          />
        </Modal>
      </>
    );
  }

  return (
    <>
      <div ref={rootRef} className="inline-flex items-stretch">
        <div className={`relative ${open ? "z-50" : ""}`}>
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
            <span className="truncate">{activePet?.name ?? "Select pet"}</span>
            <AccordionCaret open={open} />
          </button>

          <PopoverPanel
            open={open}
            id={listboxId}
            className="left-0 w-full min-w-full overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-lg"
          >
            <ul role="listbox" aria-label="Select pet">
              {state.pets.map((pet) => {
                const active = pet.id === activePetId;
                return (
                  <li key={pet.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => {
                        setActivePet(pet.id);
                        setOpen(false);
                      }}
                      className={`flex w-full cursor-pointer items-center justify-between px-3 py-2.5 text-left text-sm transition-colors duration-150 ${
                        active
                          ? "bg-accent-sky/15 font-medium text-text"
                          : "text-text hover:bg-border/40"
                      }`}
                    >
                      <span className="truncate">{pet.name}</span>
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
                  setAddModalOpen(true);
                }}
                className="cursor-pointer text-sm font-medium text-primary transition-colors hover:underline"
              >
                Add Pet
              </button>
            </div>
          </PopoverPanel>
        </div>

        <button
          type="button"
          aria-label="Add pet"
          onClick={() => {
            setOpen(false);
            setAddModalOpen(true);
          }}
          className="btn-interactive cursor-pointer rounded-r-xl border border-l-0 border-border bg-surface px-3 py-2.5 text-lg leading-none text-primary transition-all duration-200 ease-out hover:border-primary/30 hover:bg-accent-sky/10"
        >
          +
        </button>
      </div>

      <Modal
        open={addModalOpen}
        onClose={() => {
          setAddModalOpen(false);
          setAddDirty(false);
        }}
        title="Add a pet"
        dirty={addDirty}
      >
        <PetForm
          onDone={() => {
            setAddModalOpen(false);
            setAddDirty(false);
          }}
          onDirtyChange={setAddDirty}
        />
      </Modal>
    </>
  );
}
