---
id: FEAT-hub-shell-1
title: Landing page & tool registry
epic: hub-shell
status: ready
depends_on: []
---

## Summary
The landing page at `/` introduces Nexus and presents a grid of available tools sourced from a
central registry. The registry (`src/core/registry`) is the single place tools are declared; the
landing grid, tool icons, and the tool-context label in the header all derive from it. Adding a
tool is a registry change plus the tool's own subtree — no edit to the landing page itself.

## User stories
- As a first-time visitor, I want a clear hero and a grid of tools so I can understand what Nexus
  is and jump into a tool.
- As a developer, I want tools declared in one registry so adding/removing a tool is localized.

## Acceptance criteria
- [ ] `/` renders a hero with the "Local-first personal tools" badge, the title "Nexus", a
      subtitle describing the hub, a primary CTA "Open Home Maintenance" → `/tools/home-maintenance`,
      and a secondary CTA "Settings" → `/settings`.
- [ ] A "Tools" section renders one card per entry in `TOOLS` (the registry array), responsive:
      1 column (base), 2 (sm), 3 (lg).
- [ ] `ToolManifest` has exactly: `id`, `name`, `description`, `href`, `status`
      (`"available" | "coming-soon"`), `accent` (`"coral" | "mint" | "sky" | "amber"`).
- [ ] The registry exports `TOOLS` and helpers `getAvailableTools()` (status `available`) and
      `getComingSoonTools()` (status `coming-soon`).
- [ ] An **available** card is a clickable `Link` to its `href`, shows its accent-colored icon, an
      "available" badge, name, description, and an "Open tool →" affordance.
- [ ] A **coming-soon** card is non-interactive (reduced opacity, default cursor), shows a
      "coming-soon" badge, and no "Open tool" affordance.
- [ ] Each card resolves an icon by tool `id` (`home-maintenance`, `room-coat`); an unknown id
      falls back to a placeholder "?" icon rather than erroring.
- [ ] Today the registry contains exactly two tools: Home Maintenance (`id` `home-maintenance`,
      accent `coral`, href `/tools/home-maintenance`, status `available`) and Room Coat
      (`id` `room-coat`, accent `sky`, href `/tools/room-coat`, status `available`).

## Constraints / non-goals
- The landing page must not hardcode tool-specific data beyond icon mapping; everything else comes
  from the registry.
- No auth gate — the landing page and all tools are reachable without sign-in.

## Affected areas
- `src/app/page.tsx`, `src/core/registry/{tools.ts,types.ts}`, `src/shared/ui/ToolCard.tsx`,
  `src/shared/ui/illustrations/*` (icons, hero), each tool's `manifest.ts`.

## Dependencies
- Navigation shell (`FEAT-hub-shell-2`) for the surrounding header/footer.

## Open questions
- [ ] None.
