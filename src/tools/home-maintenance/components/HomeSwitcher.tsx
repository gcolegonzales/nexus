"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useHomeMaintenance } from "@/tools/home-maintenance/HomeMaintenanceProvider";
import { HomeManageForm } from "@/tools/home-maintenance/components/HomeManageForm";
import { AccordionCaret } from "@nexus/ui";
import { FormActions } from "@nexus/next";
import { Input } from "@nexus/ui";
import { Modal } from "@nexus/ui";
import { PopoverPanel } from "@nexus/ui";

export function HomeSwitcher() {
  const { state, activeHome, setActiveHomeId, addHome } = useHomeMaintenance();
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

  async function handleCreateHome() {
    const name = draftName.trim() || "New Home";
    await addHome(name);
    setDraftName("");
    setAddModalOpen(false);
  }

  function openAddModal() {
    setOpen(false);
    setAddModalOpen(true);
  }

  function closeAddModal() {
    setDraftName("");
    setAddModalOpen(false);
  }

  function openManageModal() {
    setOpen(false);
    setManageModalOpen(true);
  }

  function closeManageModal() {
    setManageModalOpen(false);
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
            <span className="truncate">{activeHome.name}</span>
            <AccordionCaret open={open} />
          </button>

          <PopoverPanel
            open={open}
            id={listboxId}
            className="left-0 w-full min-w-full overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-lg"
          >
            <ul role="listbox" aria-label="Select home">
              {state.homes.map((home) => {
                const active = home.id === activeHome.id;
                return (
                  <li key={home.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => {
                        void setActiveHomeId(home.id);
                        setOpen(false);
                      }}
                      className={`flex w-full cursor-pointer items-center justify-between px-3 py-2.5 text-left text-sm transition-colors duration-150 ${
                        active
                          ? "bg-accent-sky/15 font-medium text-text"
                          : "text-text hover:bg-border/40"
                      }`}
                    >
                      <span className="truncate">{home.name}</span>
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
                onClick={openManageModal}
                className="cursor-pointer text-sm font-medium text-primary transition-colors hover:underline"
              >
                Manage Home
              </button>
            </div>
          </PopoverPanel>
        </div>

        <button
          type="button"
          aria-label="Add home"
          onClick={openAddModal}
          className="btn-interactive cursor-pointer rounded-r-xl border border-l-0 border-border bg-surface px-3 py-2.5 text-lg leading-none text-primary transition-all duration-200 ease-out hover:border-primary/30 hover:bg-accent-sky/10"
        >
          +
        </button>
      </div>

      <Modal open={addModalOpen} onClose={closeAddModal} title="Add Home">
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            void handleCreateHome();
          }}
        >
          <Input
            label="Home name"
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            placeholder="Lake house"
            autoFocus
          />
          <FormActions
            saveLabel="Create"
            onSave={() => void handleCreateHome()}
            onCancel={closeAddModal}
          />
        </form>
      </Modal>

      <Modal
        open={manageModalOpen}
        onClose={closeManageModal}
        title="Manage Home"
        panelClassName="max-w-lg"
      >
        <HomeManageForm home={activeHome} onClose={closeManageModal} />
      </Modal>
    </>
  );
}
