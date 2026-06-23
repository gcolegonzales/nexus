/** Shared overlay styling for in-viewport editor chrome (zinc, not navy). */

/** Context menus — above all in-scene Html overlays (measurements, labels). */
export const EDITOR_Z_CONTEXT_MENU = 1000;

/** Screen-space measure HUD (labels, distance readout). */
export const EDITOR_Z_MEASURE_OVERLAY = 900;

/** In-scene Html measurement tags and draft hints. */
export const EDITOR_Z_SCENE_HTML = 400;

/** Floor island name badges. */
export const EDITOR_Z_FLOOR_LABEL = 40;

/** Toolbar, tabs, inventory, and other viewport chrome — above in-scene Html. */
export const EDITOR_Z_CHROME = 500;

/** Toolbars, tabs, compact controls */
export const EDITOR_CHROME =
  "border border-zinc-500/35 bg-zinc-800/95 text-zinc-100 shadow-lg shadow-black/50 backdrop-blur-md";

/** Info panels and readouts */
export const EDITOR_CHROME_PANEL =
  "border border-zinc-500/40 bg-zinc-800/95 text-zinc-100 shadow-xl shadow-black/50 ring-1 ring-white/5 backdrop-blur-md";

/** Context menus and action popovers — lightest lift */
export const EDITOR_CHROME_POPOVER =
  "border border-zinc-400/30 bg-zinc-700/95 text-zinc-50 shadow-2xl shadow-black/60 ring-1 ring-white/10 backdrop-blur-md";

export const EDITOR_CHROME_MUTED = "text-zinc-400";

export const EDITOR_CLICKABLE = "cursor-pointer";

export const EDITOR_CHROME_BUTTON =
  "rounded transition-colors duration-200 text-zinc-300 hover:bg-zinc-600/45 hover:text-zinc-50";

export const EDITOR_CHROME_BUTTON_ACTIVE =
  "rounded bg-sky-500 text-white shadow-sm shadow-sky-950/50";

export const EDITOR_CHROME_BUTTON_DANGER =
  "rounded transition-colors duration-200 text-zinc-400 hover:bg-red-500/15 hover:text-red-300";

export const EDITOR_INPUT =
  "cursor-pointer rounded-md border border-zinc-500/35 bg-zinc-900/80 px-2 py-0.5 text-xs text-zinc-100 outline-none focus:border-sky-400/60 focus:ring-1 focus:ring-sky-400/25";

/** Number fields for dimensions — no browser spinners, room for values. */
export const EDITOR_DIMENSION_INPUT =
  "rounded-md border border-zinc-500/35 bg-zinc-900/80 px-2 py-1 tabular-nums text-zinc-100 outline-none focus:border-sky-400/60 focus:ring-1 focus:ring-sky-400/25 [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

/** Crisp HTML measurement tag anchored to a 3D surface (selected). */
export const EDITOR_CHROME_MEASUREMENT =
  "whitespace-nowrap rounded-md border border-sky-400/55 bg-zinc-900/95 px-2.5 py-1 text-[13px] font-semibold leading-none tabular-nums text-sky-100 shadow-lg shadow-black/45 backdrop-blur-sm";

/** Hover preview tag — slightly subdued. */
export const EDITOR_CHROME_MEASUREMENT_HOVER =
  "whitespace-nowrap rounded-md border border-zinc-500/45 bg-zinc-900/90 px-2 py-0.5 text-xs font-medium leading-none tabular-nums text-zinc-200 shadow-md shadow-black/35 backdrop-blur-sm";

/** Crisp screen-space measure tag — no blur (stays sharp at any zoom). */
export const EDITOR_MEASURE_HUD_TAG =
  "whitespace-nowrap rounded border border-sky-400/70 bg-zinc-950 px-2 py-0.5 text-xs font-semibold leading-tight tabular-nums text-sky-100 shadow-md shadow-black/50";

/** Snap/feature name under a measure point. */
export const EDITOR_MEASURE_HUD_SNAP =
  "mt-1 max-w-[160px] truncate whitespace-nowrap rounded border border-zinc-600/60 bg-zinc-950 px-1.5 py-0.5 text-[10px] font-medium leading-tight text-zinc-300 shadow-sm";

/** Placed snap pin badge in the 3D scene. */
export const EDITOR_SCENE_SNAP_LABEL =
  "max-w-[140px] truncate whitespace-nowrap rounded-md border border-sky-400/45 bg-zinc-950/95 px-2.5 py-1 text-[13px] font-semibold leading-tight text-sky-50 shadow-lg shadow-black/50";

/** Wall / entrance snap badge in the 3D scene. */
export const EDITOR_SCENE_WALL_SNAP_LABEL =
  "max-w-[160px] truncate whitespace-nowrap rounded-md border border-orange-400/45 bg-zinc-950/95 px-2.5 py-1 text-[13px] font-semibold leading-tight text-orange-50 shadow-lg shadow-black/50";

/** Measure handle / preview hint in the 3D scene. */
export const EDITOR_SCENE_MEASURE_HINT =
  "whitespace-nowrap rounded-md border border-zinc-500/45 bg-zinc-950/92 px-2.5 py-1 text-[13px] font-medium leading-tight text-zinc-200 shadow-md shadow-black/45";
