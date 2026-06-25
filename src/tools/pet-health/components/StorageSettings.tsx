"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@nexus/ui";
import { Button } from "@nexus/next";
import { usePetHealth } from "@/tools/pet-health/PetHealthProvider";
import {
  isPersisted,
  requestPersistentStorage,
  type PersistResult,
} from "@/tools/pet-health/lib/persistent-storage";
import {
  isFolderSupported,
  connectFolder,
  writeAll,
} from "@/tools/pet-health/lib/fs-folder";
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

  // Persistence state
  const [persistResult, setPersistResult] = useState<PersistResult | null>(null);
  const [requestingPersist, setRequestingPersist] = useState(false);

  // Folder state
  const folderSupported = isFolderSupported();
  const [folderHandle, setFolderHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [folderName, setFolderName] = useState<string | null>(null);
  const [connectingFolder, setConnectingFolder] = useState(false);
  const [syncingFolder, setSyncingFolder] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  // Archive state
  const [exportingArchive, setExportingArchive] = useState(false);

  // Load current persistence state on mount
  const loadPersistState = useCallback(async () => {
    const result = await isPersisted();
    setPersistResult(result);
  }, []);

  useEffect(() => {
    void loadPersistState();
  }, [loadPersistState]);

  // -------------------------------------------------------------------------
  // Persistence
  // -------------------------------------------------------------------------

  async function handleRequestPersist() {
    setRequestingPersist(true);
    try {
      const result = await requestPersistentStorage();
      setPersistResult(result);
    } finally {
      setRequestingPersist(false);
    }
  }

  // -------------------------------------------------------------------------
  // Folder
  // -------------------------------------------------------------------------

  async function handleConnectFolder() {
    setConnectingFolder(true);
    try {
      const handle = await connectFolder();
      if (!handle) return; // user cancelled or unsupported
      setFolderHandle(handle);
      setFolderName(handle.name);
      // Write-through immediately after connecting
      await writeAll(handle, state, getRecordFile);
      setLastSyncedAt(new Date());
    } finally {
      setConnectingFolder(false);
    }
  }

  async function handleSyncNow() {
    if (!folderHandle) return;
    setSyncingFolder(true);
    try {
      await writeAll(folderHandle, state, getRecordFile);
      setLastSyncedAt(new Date());
    } finally {
      setSyncingFolder(false);
    }
  }

  // -------------------------------------------------------------------------
  // Archive export
  // -------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // Durability posture summary
  // -------------------------------------------------------------------------

  function postureSummary(): string {
    const parts: string[] = [];
    if (persistResult?.persisted) parts.push("Persistent storage granted");
    if (folderName) parts.push(`Folder connected: ${folderName}`);
    if (parts.length === 0) {
      if (!persistResult?.persisted && persistResult?.supported) {
        return "Standard browser storage (not persisted — may be evicted under storage pressure).";
      }
      return "Standard browser storage.";
    }
    return parts.join(" · ") + ".";
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* Durability posture                                                   */}
      {/* ------------------------------------------------------------------ */}
      <Card className="space-y-2">
        <p className="text-sm font-medium text-text">Current posture</p>
        <p className="text-sm text-muted">{postureSummary()}</p>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Persistent storage                                                   */}
      {/* ------------------------------------------------------------------ */}
      <Card className="space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-text">Persistent storage</p>
          <p className="text-sm text-muted">
            Ask the browser not to evict your pet data under storage pressure.
          </p>
        </div>

        {persistResult === null ? (
          <p className="text-xs text-muted">Checking…</p>
        ) : !persistResult.supported ? (
          <p className="text-xs text-muted">
            Persistent storage is not available in this browser.
          </p>
        ) : persistResult.persisted ? (
          <p className="text-sm font-medium text-green-600 dark:text-green-400">
            ✓ Storage is persistent — your data is protected from eviction.
          </p>
        ) : (
          <div className="flex items-center gap-3">
            <Button
              onClick={() => void handleRequestPersist()}
              disabled={requestingPersist}
              className={requestingPersist ? "opacity-60 pointer-events-none" : ""}
            >
              {requestingPersist ? "Requesting…" : "Make storage persistent"}
            </Button>
          </div>
        )}
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Document folder (File System Access)                                 */}
      {/* ------------------------------------------------------------------ */}
      {folderSupported ? (
        <Card className="space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-text">Document folder</p>
            <p className="text-sm text-muted">
              Connect a folder on your disk. Records are written as real files
              alongside a JSON index — portable, human-navigable, and yours.
            </p>
          </div>

          {folderHandle && folderName ? (
            <div className="space-y-3">
              <p className="text-sm text-muted">
                Connected:{" "}
                <span className="font-medium text-text">{folderName}</span>
                {lastSyncedAt && (
                  <>
                    {" · "}Last synced at {lastSyncedAt.toLocaleTimeString()}
                  </>
                )}
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="secondary"
                  onClick={() => void handleSyncNow()}
                  disabled={syncingFolder}
                  className={syncingFolder ? "opacity-60 pointer-events-none" : ""}
                >
                  {syncingFolder ? "Saving…" : "Save to folder now"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setFolderHandle(null);
                    setFolderName(null);
                    setLastSyncedAt(null);
                  }}
                >
                  Disconnect
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="secondary"
              onClick={() => void handleConnectFolder()}
              disabled={connectingFolder}
              className={connectingFolder ? "opacity-60 pointer-events-none" : ""}
            >
              {connectingFolder ? "Connecting…" : "Connect document folder"}
            </Button>
          )}
        </Card>
      ) : (
        <Card className="space-y-2">
          <p className="text-sm font-medium text-text">Document folder</p>
          <p className="text-sm text-muted">
            Folder access is not supported in this browser. Use the archive
            export below to save a portable copy of your data.
          </p>
        </Card>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Archive export (always available)                                    */}
      {/* ------------------------------------------------------------------ */}
      <Card className="space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-text">Export archive</p>
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
          {exportingArchive ? "Exporting…" : "Export archive"}
        </Button>
      </Card>
    </div>
  );
}
