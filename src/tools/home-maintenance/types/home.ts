import type { OrphanedCalendarEvents } from "./state";

export interface Home {
  id: string;
  name: string;
  hvacFilterSize?: string;
  setupDate?: string;
  notes?: string;
  googleCalendarId?: string;
  microsoftCalendarId?: string;
  orphanedCalendarEvents?: OrphanedCalendarEvents;
}
