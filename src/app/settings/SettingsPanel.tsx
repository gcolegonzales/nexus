"use client";

import { useRef, useState } from "react";
import {
  buildExportBundle,
  downloadJsonBundle,
  importExportBundle,
  isNexusExportBundle,
} from "@/core/export/bundle";
import { useHubProfile } from "@/core/profile/ProfileProvider";
import { Badge } from "@nexus/ui";
import { Button } from "@nexus/next";
import { Card } from "@nexus/ui";
import { PageHeader } from "@nexus/ui";
import { PageTransition } from "@nexus/next";
import { ThemeSelector } from "@nexus/ui";
import { StaggerItem } from "@nexus/ui";

export function SettingsPanel() {
  const { refreshProfile } = useHubProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  async function handleExport() {
    setError(null);
    setMessage(null);
    setIsBusy(true);

    try {
      const bundle = await buildExportBundle();
      downloadJsonBundle(bundle);
      setMessage("Export downloaded. Keep this file as your backup.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleImportFile(file: File) {
    setError(null);
    setMessage(null);
    setIsBusy(true);

    try {
      const text = await file.text();
      const parsed: unknown = JSON.parse(text);

      if (!isNexusExportBundle(parsed)) {
        throw new Error("Invalid Nexus export file.");
      }

      const confirmed = window.confirm(
        "Import will replace your local Nexus data on this device. Continue?",
      );
      if (!confirmed) return;

      await importExportBundle(parsed);
      await refreshProfile();
      setMessage("Import complete. Reloading…");
      window.setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setIsBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <PageTransition>
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
        <StaggerItem>
          <PageHeader
            title="Settings"
            description="Export and import your Nexus data. Everything stays on your device unless you choose to back it up."
          />
        </StaggerItem>

        <div className="mt-10 space-y-5">
          <StaggerItem>
            <Card className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-text">Appearance</h2>
                <p className="text-sm text-muted">
                  Choose light, dark, or match your system setting.
                </p>
              </div>
              <ThemeSelector />
            </Card>
          </StaggerItem>

          <StaggerItem>
            <Card className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-text">Backup & restore</h2>
            <p className="text-sm text-muted">
              Download a JSON file to move your data to another device or keep a
              backup. Import replaces local data on this browser.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => void handleExport()} disabled={isBusy}>
              Export JSON
            </Button>
            <Button
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={isBusy}
            >
              Import JSON
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleImportFile(file);
              }}
            />
          </div>
          {message && <Badge variant="mint">{message}</Badge>}
          {error && <Badge variant="amber">{error}</Badge>}
            </Card>
          </StaggerItem>

          <StaggerItem>
            <Card className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-text">Calendar sync</h2>
          </div>
          <p className="text-sm text-muted">
            Export .ics files or connect Google Calendar from the Home Maintenance
            tool.
          </p>
          <Button variant="secondary" href="/tools/home-maintenance/sync">
            Open calendar sync
          </Button>
            </Card>
          </StaggerItem>
        </div>
      </div>
    </PageTransition>
  );
}
