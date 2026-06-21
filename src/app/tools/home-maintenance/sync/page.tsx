import { Suspense } from "react";
import { CalendarSyncPanel } from "./CalendarSyncPanel";

export default function CalendarSyncPage() {
  return (
    <Suspense fallback={<div className="px-4 py-16 text-muted">Loading…</div>}>
      <CalendarSyncPanel />
    </Suspense>
  );
}
