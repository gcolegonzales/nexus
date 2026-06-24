---
id: FEAT-hub-shell-2
title: Hub navigation shell
epic: hub-shell
status: ready
depends_on: []
---

## Summary
The persistent app frame that wraps every route: a sticky header with the Nexus logo, an optional
tool-context label, and an Account menu (Profile, Settings, theme toggle); a footer reinforcing the
local-first promise; and a shared **tool shell** (nav bar + sections) that each tool composes for
its sub-navigation. Page transitions are applied to non-tool routes only.

## User stories
- As a user, I want consistent global navigation so I can always reach the home, my profile, and
  settings, and toggle theme.
- As a user inside a tool, I want a sub-nav of that tool's sections and a label telling me which
  tool I'm in.

## Acceptance criteria
- [ ] `HubShell` renders `Header`, a `main` containing the routed content, and `Footer` on every page.
- [ ] The header is sticky to the top, shows the Nexus logo + "Nexus" wordmark linking to `/`, and
      on the right shows the `ToolContextLabel` (when on a tool route) and the Account menu (`HubMenu`).
- [ ] `HubMenu` is a button (labeled "Account", text hidden below `sm`) that toggles a dropdown
      containing links to `/profile` and `/settings`, a divider, and a "Dark Mode" theme toggle.
- [ ] The active menu link is visually distinguished; clicking any link closes the menu; clicking
      outside the menu closes it.
- [ ] `ToolContextLabel` shows the current tool's name (resolved by matching the pathname to a
      registry `href` or `href/`) with an info tooltip; it renders nothing on non-tool routes and is
      hidden below `sm`.
- [ ] `Footer` shows "Your data stays on this device. No account required." and the Nexus tagline.
- [ ] `ToolShell` provides each tool a centered max-width container, renders a passed-in `nav`
      element, optional `headerActions`, and the page content; non-tool routes get a page transition
      while tool routes / `/profile` / `/settings` / `/component-library` do not.
- [ ] `ToolNavBar` renders a list of `{href,label,isActive(pathname)}` links as a pill bar, marks
      the active one (`aria-current="page"`), and is horizontally scrollable on mobile.
- [ ] `ToolSection` renders an optional title/description/action header plus content at a chosen
      max width (`2xl|3xl|full`, default `full`), and surfaces any tool `headerActions`.

## Constraints / non-goals
- The shell must not assume a specific tool; tool sub-navigation is provided by each tool.
- Theme persistence itself is owned by `@nexus/ui` (see `FEAT-hub-shell-4`); the shell only hosts
  the toggle.

## Affected areas
- `src/shared/ui/hub/{HubShell,Header,HubMenu,Footer,ToolContextLabel,HubMainTransition}.tsx`,
  `src/shared/ui/tool/{ToolShell,ToolNavBar,ToolSection,ToolShellContext}.tsx`,
  `src/app/layout.tsx`, `src/app/providers.tsx`.

## Dependencies
- Tool registry (`FEAT-hub-shell-1`) for tool-context resolution.
- Profile & Theme providers (`FEAT-hub-shell-3`, `FEAT-hub-shell-4`) mounted in `providers.tsx`.

## Open questions
- [ ] None.
