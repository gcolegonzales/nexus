import type { Asset } from "./asset";
import type { Home } from "./home";
import type { Task } from "./task";

import type { TaskCompletionRecord } from "./completion";

export interface OrphanedCalendarEvents {
  google: string[];
  microsoft: string[];
}

export const EMPTY_ORPHANED_EVENTS: OrphanedCalendarEvents = {
  google: [],
  microsoft: [],
};

export interface HomeMaintenanceState {
  homes: Home[];
  activeHomeId: string;
  assets: Asset[];
  tasks: Task[];
  completions: Record<string, TaskCompletionRecord>;
  initialized: boolean;
  schemaVersion: number;
}

export const CURRENT_HOME_MAINTENANCE_SCHEMA_VERSION = 3;

export const DEFAULT_HOME_MAINTENANCE_STATE: HomeMaintenanceState = {
  homes: [],
  activeHomeId: "",
  assets: [],
  tasks: [],
  completions: {},
  initialized: false,
  schemaVersion: CURRENT_HOME_MAINTENANCE_SCHEMA_VERSION,
};
