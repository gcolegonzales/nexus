"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AccordionCaret,
  Badge,
  Card,
  Checkbox,
  Collapsible,
  FilterTransitionPanel,
  IconActionButton,
  Input,
  Modal,
  MultiSelect,
  PageHeader,
  PopoverPanel,
  StaggerGroup,
  StaggerItem,
  Textarea,
  ThemeSelector,
  ThemeToggle,
  EditIcon,
} from "@nexus/ui";
import {
  Button,
  FormActions,
  PrimaryButton,
} from "@nexus/next";
import { DocSection, NavLink } from "./showcase";

const navSections = [
  { id: "overview", label: "Overview" },
  { id: "tokens", label: "Design tokens" },
  { id: "theme", label: "Theme" },
  { id: "button", label: "Button" },
  { id: "primary-button", label: "PrimaryButton" },
  { id: "badge", label: "Badge" },
  { id: "card", label: "Card" },
  { id: "input", label: "Input & Textarea" },
  { id: "checkbox", label: "Checkbox" },
  { id: "form-actions", label: "FormActions" },
  { id: "modal", label: "Modal" },
  { id: "multiselect", label: "MultiSelect" },
  { id: "collapsible", label: "Collapsible" },
  { id: "popover", label: "PopoverPanel" },
  { id: "stagger", label: "Stagger" },
  { id: "page-header", label: "PageHeader" },
  { id: "icon-action", label: "IconActionButton" },
  { id: "filter-panel", label: "FilterTransitionPanel" },
];

const filterOptions = [
  { value: "hvac", label: "HVAC" },
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
];

export default function ComponentLibraryPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [collapsibleOpen, setCollapsibleOpen] = useState(true);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [filterValues, setFilterValues] = useState<string[]>(["hvac"]);
  const [filterPending, setFilterPending] = useState(false);
  const [filterKey, setFilterKey] = useState("initial");
  const [checked, setChecked] = useState(true);

  function simulateFilterChange(values: string[]) {
    setFilterValues(values);
    setFilterPending(true);
    window.setTimeout(() => {
      setFilterKey(values.join("-") || "empty");
      setFilterPending(false);
    }, 600);
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-10 sm:flex-row sm:px-6 sm:py-14">
      <aside className="sm:sticky sm:top-24 sm:h-fit sm:w-56 sm:shrink-0">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
          @nexus/ui
        </p>
        <nav className="space-y-0.5" aria-label="Component library sections">
          {navSections.map((section) => (
            <NavLink key={section.id} href={`#${section.id}`} label={section.label} />
          ))}
        </nav>
        <div className="mt-8 rounded-xl border border-dashed border-border p-3 text-xs text-muted">
          Hidden route — not linked from the hub nav. Share the URL with collaborators
          building on the design system.
        </div>
      </aside>

      <div className="min-w-0 flex-1 space-y-12">
        <header id="overview" className="scroll-mt-24 space-y-4">
          <PageHeader
            title="Component Library"
            description="Living documentation for @nexus/ui and @nexus/next — the shared design system used across Nexus apps."
            action={
              <Link
                href="/"
                className="text-sm font-medium text-primary hover:text-primary-hover"
              >
                ← Back to Nexus
              </Link>
            }
          />
          <Card className="bg-accent-sky/5">
            <p className="text-sm text-text">
              Import primitives from{" "}
              <code className="rounded bg-border/60 px-1.5 py-0.5 text-xs">@nexus/ui</code>{" "}
              and Next.js-aware components from{" "}
              <code className="rounded bg-border/60 px-1.5 py-0.5 text-xs">@nexus/next</code>.
              Styles come from{" "}
              <code className="rounded bg-border/60 px-1.5 py-0.5 text-xs">
                @nexus/ui/styles/tokens.css
              </code>
              .
            </p>
          </Card>
        </header>

        <DocSection
          id="tokens"
          title="Design tokens"
          description="CSS custom properties in tokens.css map to Tailwind utilities like bg-surface, text-muted, and border-border. Override :root and html.dark to retheme consumers."
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { name: "Primary", className: "bg-primary" },
              { name: "Surface", className: "bg-surface border border-border" },
              { name: "Mint accent", className: "bg-accent-mint" },
              { name: "Amber accent", className: "bg-accent-amber" },
              { name: "Sky accent", className: "bg-accent-sky" },
              { name: "Danger", className: "bg-danger" },
            ].map((swatch) => (
              <div key={swatch.name} className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-xl ${swatch.className}`} />
                <span className="text-sm font-medium text-text">{swatch.name}</span>
              </div>
            ))}
          </div>
        </DocSection>

        <DocSection
          id="theme"
          title="Theme"
          description="ThemeProvider, ThemeToggle, and ThemeSelector support light, dark, and system modes with localStorage persistence."
        >
          <div className="flex flex-wrap items-center gap-8">
            <ThemeToggle />
            <ThemeSelector />
          </div>
        </DocSection>

        <DocSection
          id="button"
          title="Button"
          description="Interactive button with primary, secondary, ghost, and danger variants. Supports href via Next.js Link in @nexus/next."
          code={`<Button variant="primary">Save</Button>
<Button variant="secondary">Cancel</Button>
<Button variant="ghost">Learn more</Button>
<Button variant="danger">Delete</Button>
<Button href="/settings">Go to settings</Button>`}
        >
          <div className="flex flex-wrap gap-3">
            <Button variant="primary">Save</Button>
            <Button variant="secondary">Cancel</Button>
            <Button variant="ghost">Learn more</Button>
            <Button variant="danger">Delete</Button>
            <Button href="/settings">Go to settings</Button>
          </div>
        </DocSection>

        <DocSection
          id="primary-button"
          title="PrimaryButton"
          description="Opinionated primary action styling built on Button. Supports compact size for dense toolbars."
          code={`<PrimaryButton onClick={handleSave}>Save</PrimaryButton>
<PrimaryButton compact>Add</PrimaryButton>`}
        >
          <div className="flex flex-wrap gap-3">
            <PrimaryButton>Save changes</PrimaryButton>
            <PrimaryButton compact>Add</PrimaryButton>
          </div>
        </DocSection>

        <DocSection
          id="badge"
          title="Badge"
          description="Small status labels with default, mint, amber, and sky variants."
          code={`<Badge>Default</Badge>
<Badge variant="mint">On track</Badge>
<Badge variant="amber">Due soon</Badge>
<Badge variant="sky">Synced</Badge>`}
        >
          <div className="flex flex-wrap gap-2">
            <Badge>Default</Badge>
            <Badge variant="mint">On track</Badge>
            <Badge variant="amber">Due soon</Badge>
            <Badge variant="sky">Synced</Badge>
          </div>
        </DocSection>

        <DocSection
          id="card"
          title="Card"
          description="Surface container with optional padding and interactive lift hover."
          code={`<Card>Static card content</Card>
<Card interactive>Hover lifts this card</Card>`}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <p className="text-sm text-text">Static card with default padding.</p>
            </Card>
            <Card interactive>
              <p className="text-sm text-text">Interactive card — hover to lift.</p>
            </Card>
          </div>
        </DocSection>

        <DocSection
          id="input"
          title="Input & Textarea"
          description="Labeled form fields with focus rings and optional hint text."
          code={`<Input label="Display name" placeholder="Alex" hint="Shown on exports" />
<Textarea label="Notes" placeholder="Optional details…" />`}
        >
          <div className="grid max-w-md gap-4">
            <Input
              label="Display name"
              placeholder="Alex"
              hint="Shown on exports"
              defaultValue="Alex"
            />
            <Textarea
              label="Notes"
              placeholder="Optional details…"
              defaultValue="Filter size: 16x25x1"
            />
          </div>
        </DocSection>

        <DocSection
          id="checkbox"
          title="Checkbox"
          description="Accessible checkbox with label, hint, and selected border styling."
          code={`<Checkbox
  label="Email reminders"
  hint="We'll only use your local profile email."
  checked={checked}
  onChange={(e) => setChecked(e.target.checked)}
/>`}
        >
          <Checkbox
            label="Email reminders"
            hint="We'll only use your local profile email."
            checked={checked}
            onChange={(event) => setChecked(event.target.checked)}
          />
        </DocSection>

        <DocSection
          id="form-actions"
          title="FormActions"
          description="Standard save/cancel footer for forms with optional left slot."
          code={`<FormActions
  onSave={handleSave}
  onCancel={handleCancel}
  saveLabel="Save home"
/>`}
        >
          <FormActions
            onSave={() => undefined}
            onCancel={() => undefined}
            saveLabel="Save home"
          />
        </DocSection>

        <DocSection
          id="modal"
          title="Modal"
          description="Portal dialog with overlay, escape to close, and scroll lock."
          code={`<Modal open={open} onClose={() => setOpen(false)} title="Add home">
  <Input label="Home name" />
  <FormActions onSave={save} onCancel={() => setOpen(false)} />
</Modal>`}
        >
          <Button variant="secondary" onClick={() => setModalOpen(true)}>
            Open modal
          </Button>
          <Modal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title="Add home"
          >
            <Input label="Home name" placeholder="Lake house" />
            <FormActions
              onSave={() => setModalOpen(false)}
              onCancel={() => setModalOpen(false)}
            />
          </Modal>
        </DocSection>

        <DocSection
          id="multiselect"
          title="MultiSelect"
          description="Filter dropdown with checkbox options and clear action."
          code={`<MultiSelect
  label="Category"
  options={options}
  values={values}
  onChange={setValues}
  placeholder="All categories"
/>`}
        >
          <MultiSelect
            label="Category"
            options={filterOptions}
            values={filterValues}
            onChange={setFilterValues}
            placeholder="All categories"
          />
        </DocSection>

        <DocSection
          id="collapsible"
          title="Collapsible & AccordionCaret"
          description="Height-animated reveal used in tool accordions. AccordionCaret rotates with open state."
          code={`<button onClick={() => setOpen(!open)}>
  Section title <AccordionCaret open={open} />
</button>
<Collapsible open={open}>…</Collapsible>`}
        >
          <button
            type="button"
            onClick={() => setCollapsibleOpen((current) => !current)}
            className="flex w-full items-center justify-between rounded-xl border border-border px-4 py-3 text-left text-sm font-medium text-text"
          >
            Furnace filter
            <AccordionCaret open={collapsibleOpen} />
          </button>
          <Collapsible open={collapsibleOpen} innerClassName="px-4 py-3">
            <p className="text-sm text-muted">
              Replace every 90 days or when visibly dirty.
            </p>
          </Collapsible>
        </DocSection>

        <DocSection
          id="popover"
          title="PopoverPanel"
          description="Animated absolutely-positioned panel for menus and dropdowns."
          code={`<PopoverPanel open={open} align="end" className="…">
  Menu content
</PopoverPanel>`}
        >
          <div className="relative inline-block">
            <Button variant="secondary" onClick={() => setPopoverOpen((v) => !v)}>
              Toggle popover
            </Button>
            <PopoverPanel
              open={popoverOpen}
              align="start"
              className="w-48 rounded-xl border border-border bg-surface p-3 shadow-lg"
            >
              <p className="text-sm text-text">Popover content</p>
            </PopoverPanel>
          </div>
        </DocSection>

        <DocSection
          id="stagger"
          title="Stagger"
          description="StaggerGroup assigns animation delays to StaggerItem children. Reset with a key when content changes."
          code={`<StaggerGroup resetKey={pathname}>
  <StaggerItem>First</StaggerItem>
  <StaggerItem>Second</StaggerItem>
</StaggerGroup>`}
        >
          <StaggerGroup resetKey="demo">
            {["Overview", "Assets", "Schedule"].map((item) => (
              <StaggerItem key={item}>
                <Card className="mb-3 py-4">{item}</Card>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </DocSection>

        <DocSection
          id="page-header"
          title="PageHeader"
          description="Page title block with optional description and right-aligned action slot."
          code={`<PageHeader
  title="Settings"
  description="Theme, export, and preferences."
  action={<Button href="/">Home</Button>}
/>`}
        >
          <PageHeader
            title="Settings"
            description="Theme, export, and preferences."
            action={<Button variant="secondary">Action</Button>}
          />
        </DocSection>

        <DocSection
          id="icon-action"
          title="IconActionButton"
          description="Ghost icon button with required aria-label for accessibility."
          code={`<IconActionButton label="Edit task">
  <EditIcon />
</IconActionButton>`}
        >
          <IconActionButton label="Edit task">
            <EditIcon />
          </IconActionButton>
        </DocSection>

        <DocSection
          id="filter-panel"
          title="FilterTransitionPanel"
          description="Wraps filtered lists with a loading overlay and stagger re-animation when results change."
          code={`<FilterTransitionPanel
  isPending={pending}
  animateKey={key}
  listClassName="space-y-3"
>
  {items.map(...)}
</FilterTransitionPanel>`}
        >
          <MultiSelect
            options={filterOptions}
            values={filterValues}
            onChange={simulateFilterChange}
            placeholder="All"
            className="mb-4"
          />
          <FilterTransitionPanel
            isPending={filterPending}
            animateKey={filterKey}
            listClassName="space-y-3"
          >
            {filterValues.length === 0 ? (
              <Card className="py-4 text-sm text-muted">All categories shown</Card>
            ) : (
              filterValues.map((value) => (
                <StaggerItem key={value}>
                  <Card className="py-4 text-sm text-text">
                    {filterOptions.find((option) => option.value === value)?.label}
                  </Card>
                </StaggerItem>
              ))
            )}
          </FilterTransitionPanel>
        </DocSection>
      </div>
    </div>
  );
}
