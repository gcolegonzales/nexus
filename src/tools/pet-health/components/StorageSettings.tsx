"use client";

import { useState } from "react";
import { Card } from "@nexus/ui";
import { Button } from "@nexus/next";
import { usePetHealth } from "@/tools/pet-health/PetHealthProvider";
import { exportArchive } from "@/tools/pet-health/lib/archive";
import { getRecordFile } from "@/tools/pet-health/storage/files";

// ---------------------------------------------------------------------------
// Helper: download a Blob as a file
// ---------------------------------------------------------------------------

function downloadBlobAs(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StorageSettings() {
  const { state } = usePetHealth();
  const [exportingArchive, setExportingArchive] = useState(false);

  async function handleExportArchive() {
    setExportingArchive(true);
    try {
      const blob = await exportArchive(state, getRecordFile);
      const now = new Date();
      const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      downloadBlobAs(blob, `pet-health-${stamp}.zip`);
    } finally {
      setExportingArchive(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-text">Export Archive</p>
          <p className="text-sm text-muted">
            Download a single zip file containing all your pet records and a
            JSON index. A portable backup you can keep anywhere.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => void handleExportArchive()}
          disabled={exportingArchive}
          className={exportingArchive ? "opacity-60 pointer-events-none" : ""}
        >
          {exportingArchive ? "Exporting…" : "Export Archive"}
        </Button>
      </Card>
    </div>
  );
}
