"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useHubProfile } from "@/core/profile/ProfileProvider";
import {
  disconnectGoogle,
  getValidGoogleAccessToken,
  startGoogleConnect,
  stashGoogleTokensFromSession,
} from "@/core/integrations/google/client";
import {
  isGoogleConnected,
  saveGoogleAuth,
} from "@/core/integrations/google/store";
import { isGoogleConfigured } from "@/core/integrations/google/types";
import {
  disconnectMicrosoft,
  getValidMicrosoftAccessToken,
  startMicrosoftConnect,
  stashMicrosoftTokensFromSession,
} from "@/core/integrations/microsoft/client";
import {
  isMicrosoftConnected,
  saveMicrosoftAuth,
} from "@/core/integrations/microsoft/store";
import { isMicrosoftConfigured } from "@/core/integrations/microsoft/types";
import { useHomeMaintenance } from "@/tools/home-maintenance/HomeMaintenanceProvider";
import { ToolSection } from "@/tools/home-maintenance/components/ToolSection";
import { downloadHomeMaintenanceIcs } from "@/tools/home-maintenance/lib/ics-export";
import { syncHomeMaintenanceToGoogle } from "@/tools/home-maintenance/lib/google-sync";
import { syncHomeMaintenanceToMicrosoft } from "@/tools/home-maintenance/lib/microsoft-sync";
import { Badge } from "@nexus/ui";
import { Button } from "@nexus/next";
import { Card } from "@nexus/ui";
import { StaggerItem } from "@nexus/ui";

function formatAuthError(code: string, provider: "Google" | "Microsoft"): string {
  if (code === "not_configured" || code === "google_not_configured") {
    return `${provider} OAuth is not configured on the server.`;
  }
  return `${provider} connection failed: ${code}`;
}

export function CalendarSyncPanel() {
  const searchParams = useSearchParams();
  const { profile } = useHubProfile();
  const { state, activeHome, activeAllAssets, activeTasks, saveState } =
    useHomeMaintenance();
  const [googleConnected, setGoogleConnected] = useState(false);
  const [microsoftConnected, setMicrosoftConnected] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [microsoftBusy, setMicrosoftBusy] = useState(false);
  const googleReady = isGoogleConfigured();
  const microsoftReady = isMicrosoftConfigured();

  useEffect(() => {
    void Promise.all([isGoogleConnected(), isMicrosoftConnected()]).then(
      ([google, microsoft]) => {
        setGoogleConnected(google);
        setMicrosoftConnected(microsoft);
      },
    );
  }, []);

  useEffect(() => {
    const googleConnectedParam = searchParams.get("connected");
    const googleError = searchParams.get("error");
    const microsoftConnectedParam = searchParams.get("microsoft_connected");
    const microsoftError = searchParams.get("microsoft_error");

    if (googleConnectedParam === "1") {
      const pending = stashGoogleTokensFromSession();
      if (pending) {
        void saveGoogleAuth(pending).then(() => {
          setGoogleConnected(true);
          setMessage(
            "Google Calendar connected. Tokens saved on this device only.",
          );
        });
      } else {
        setError("Google connection finished but tokens were not found. Try again.");
      }
    }

    if (microsoftConnectedParam === "1") {
      const pending = stashMicrosoftTokensFromSession();
      if (pending) {
        void saveMicrosoftAuth(pending).then(() => {
          setMicrosoftConnected(true);
          setMessage(
            "Outlook connected. Tokens saved on this device only.",
          );
        });
      } else {
        setError("Outlook connection finished but tokens were not found. Try again.");
      }
    }

    if (googleError) {
      setError(formatAuthError(googleError, "Google"));
    }

    if (microsoftError) {
      setError(formatAuthError(microsoftError, "Microsoft"));
    }

    if (
      googleConnectedParam ||
      googleError ||
      microsoftConnectedParam ||
      microsoftError
    ) {
      window.history.replaceState({}, "", "/tools/home-maintenance/sync");
    }
  }, [searchParams]);

  async function handleExportIcs() {
    setError(null);
    setMessage(null);
    downloadHomeMaintenanceIcs(
      activeTasks,
      activeAllAssets,
      profile,
      activeHome.name,
      state.completions,
    );
    setMessage(
      `Downloaded home-maintenance.ics for ${activeHome.name} — open it on iPhone, Mac, or Outlook to add events.`,
    );
  }

  async function handleSyncGoogle() {
    setError(null);
    setMessage(null);
    setGoogleBusy(true);

    try {
      const accessToken = await getValidGoogleAccessToken();
      if (!accessToken) {
        throw new Error("Connect Google Calendar first.");
      }

      const result = await syncHomeMaintenanceToGoogle(
        accessToken,
        state,
        profile,
        activeHome.id,
      );
      await saveState(result.state);
      setMessage(
        `Google: synced ${result.syncedCount} task${result.syncedCount === 1 ? "" : "s"} for ${activeHome.name}.${result.removedCount > 0 ? ` Removed ${result.removedCount} disabled event(s).` : ""}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sync failed.");
    } finally {
      setGoogleBusy(false);
    }
  }

  async function handleSyncMicrosoft() {
    setError(null);
    setMessage(null);
    setMicrosoftBusy(true);

    try {
      const accessToken = await getValidMicrosoftAccessToken();
      if (!accessToken) {
        throw new Error("Connect Outlook first.");
      }

      const result = await syncHomeMaintenanceToMicrosoft(
        accessToken,
        state,
        profile,
        activeHome.id,
      );
      await saveState(result.state);
      setMessage(
        `Outlook: synced ${result.syncedCount} task${result.syncedCount === 1 ? "" : "s"} for ${activeHome.name}.${result.removedCount > 0 ? ` Removed ${result.removedCount} disabled event(s).` : ""}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Outlook sync failed.");
    } finally {
      setMicrosoftBusy(false);
    }
  }

  const enabledCount = activeTasks.filter((task) => task.enabled).length;

  return (
    <ToolSection
      title="Calendar"
      description={`Export or sync the ${activeHome.name} schedule. Re-sync updates existing events instead of duplicating them.`}
      maxWidth="3xl"
    >
      <div className="space-y-5">
        <StaggerItem>
          <Card className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-text">
              Universal Export (.ics)
            </h2>
            <p className="text-sm text-muted">
              Best for Apple Calendar and manual Outlook import. Re-export after
              you change tasks.
            </p>
          </div>
          <Button onClick={handleExportIcs}>
            Download .ics ({enabledCount} enabled tasks)
          </Button>
          </Card>
        </StaggerItem>

        <StaggerItem>
          <Card className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-text">Google Calendar</h2>
            {googleConnected ? (
              <Badge variant="mint">Connected</Badge>
            ) : (
              <Badge variant="amber">Not Connected</Badge>
            )}
          </div>
          <p className="text-sm text-muted">
            Creates a &quot;Home Maintenance&quot; calendar with recurring
            events, instructions, and one reminder one day before each task.
          </p>

          {!googleReady && (
            <p className="text-sm text-muted">
              Set Google OAuth env vars (see <code className="text-text">.env.example</code>).
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            {googleConnected ? (
              <>
                <Button
                  onClick={() => void handleSyncGoogle()}
                  disabled={googleBusy || microsoftBusy || enabledCount === 0}
                >
                  {googleBusy ? "Syncing…" : "Sync to Google"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => void disconnectGoogle().then(() => {
                    setGoogleConnected(false);
                    setMessage("Google Calendar disconnected.");
                  })}
                  disabled={googleBusy || microsoftBusy}
                >
                  Disconnect
                </Button>
              </>
            ) : (
              <Button
                onClick={startGoogleConnect}
                disabled={!googleReady || googleBusy || microsoftBusy}
              >
                Connect Google Calendar
              </Button>
            )}
          </div>
          </Card>
        </StaggerItem>

        <StaggerItem>
          <Card className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-text">
              Outlook / Microsoft 365
            </h2>
            {microsoftConnected ? (
              <Badge variant="mint">Connected</Badge>
            ) : (
              <Badge variant="amber">Not Connected</Badge>
            )}
          </div>
          <p className="text-sm text-muted">
            Syncs to Outlook.com or Microsoft 365 via Microsoft Graph. Same
            Home Maintenance calendar and idempotent updates as Google.
          </p>

          {!microsoftReady && (
            <p className="text-sm text-muted">
              Set Microsoft OAuth env vars (see <code className="text-text">.env.example</code>).
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            {microsoftConnected ? (
              <>
                <Button
                  onClick={() => void handleSyncMicrosoft()}
                  disabled={googleBusy || microsoftBusy || enabledCount === 0}
                >
                  {microsoftBusy ? "Syncing…" : "Sync to Outlook"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => void disconnectMicrosoft().then(() => {
                    setMicrosoftConnected(false);
                    setMessage("Outlook disconnected.");
                  })}
                  disabled={googleBusy || microsoftBusy}
                >
                  Disconnect
                </Button>
              </>
            ) : (
              <Button
                onClick={startMicrosoftConnect}
                disabled={!microsoftReady || googleBusy || microsoftBusy}
              >
                Connect Outlook
              </Button>
            )}
          </div>

          {activeHome.microsoftCalendarId && (
            <p className="text-xs text-muted">
              Outlook calendar linked for {activeHome.name}. Disabled tasks are
              removed on the next sync.
            </p>
          )}
          </Card>
        </StaggerItem>

        {message && (
          <StaggerItem>
            <Badge variant="mint">{message}</Badge>
          </StaggerItem>
        )}
        {error && (
          <StaggerItem>
            <Badge variant="amber">{error}</Badge>
          </StaggerItem>
        )}
      </div>
    </ToolSection>
  );
}
