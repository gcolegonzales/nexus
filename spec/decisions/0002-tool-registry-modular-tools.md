# 0002. Modular tools behind a central registry

- Status: accepted
- Date: 2026-06-23

## Context
Nexus is meant to grow into many small utilities over time without each addition destabilizing the
others or the shell. The shell must host tools generically.

## Decision
Each tool is self-contained: one `ToolManifest` in `src/core/registry`, one route subtree under
`/tools/<tool>`, one IndexedDB key, one React context provider, and its own `types/lib/components/
storage`. The shell (landing grid, tool-context label) is driven entirely by the registry and knows
nothing tool-specific beyond manifests and an icon mapping. Tools never import each other's state.

## Consequences
- Adding/removing a tool is a localized change (registry entry + the tool's own subtree).
- Shared concerns (profile, theme, storage, OAuth) live in `src/core` and are reused by tools.
- The landing page and navigation must avoid hardcoding tool details; the icon mapping by tool id is
  the one allowed exception and falls back to a placeholder for unknown ids.
- "Home" (Home Maintenance) and "Unit" (Room Coat) remain independent domain concepts because tools
  are isolated, even though both model "a property."
