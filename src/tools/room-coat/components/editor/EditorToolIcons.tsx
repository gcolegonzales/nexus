import type { EditorTool } from "@/tools/room-coat/lib/editor-surfaces";

const iconClass = "h-[15px] w-[15px]";

export function EditorToolIcon({ tool }: { tool: EditorTool }) {
  switch (tool) {
    case "move":
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M12 2v20M2 12h20M7 7l5-5 5 5M7 17l5 5 5-5M7 7H2M17 7h5M7 17H2M17 17h5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "paint":
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L8 19l-4 1 1-4L18.5 2.5z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M15 5l4 4" strokeLinecap="round" />
        </svg>
      );
    case "add-room":
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          <rect x="3" y="3" width="18" height="18" rx="2" />
        </svg>
      );
    case "hallway":
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M4 8h6v8H4zM14 4h6v6h-6zM14 14h6v6h-6z" strokeLinejoin="round" />
          <path d="M10 12h4" strokeLinecap="round" />
        </svg>
      );
    case "open-walls":
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M4 20V4h8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 4h8v16" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 12H8M16 12h-4" strokeLinecap="round" />
        </svg>
      );
  }
}

export function CeilingsIcon() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M4 10l8-6 8 6v10H4V10z" strokeLinejoin="round" />
      <path d="M9 20v-5h6v5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SettingsIcon() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LayersIcon() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M12 2l9 5-9 5-9-5 9-5z" strokeLinejoin="round" />
      <path d="M3 12l9 5 9-5M3 17l9 5 9-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
