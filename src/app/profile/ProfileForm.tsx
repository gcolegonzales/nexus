"use client";

import { useHubProfile } from "@/core/profile/ProfileProvider";
import { useSavedHint } from "@/shared/hooks/useSavedHint";
import { Badge } from "@nexus/ui";
import { Card } from "@nexus/ui";
import { Input, Textarea } from "@nexus/ui";
import { PageHeader } from "@nexus/ui";
import { PageTransition } from "@nexus/next";
import { StaggerItem } from "@nexus/ui";

export function ProfileForm() {
  const { profile, isReady, updateProfile } = useHubProfile();
  const { saved, showSaved } = useSavedHint();

  if (!isReady) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <p className="text-muted">Loading profile…</p>
      </div>
    );
  }

  async function handleChange(field: keyof typeof profile, value: string) {
    await updateProfile({ [field]: value || undefined });
    showSaved();
  }

  return (
    <PageTransition>
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
        <StaggerItem>
          <PageHeader
            title="Profile"
            description="Household info and shared settings that flow into your Nexus tools."
            action={saved ? <Badge variant="mint">Saved Locally</Badge> : null}
          />
        </StaggerItem>

        <StaggerItem className="mt-10">
          <Card className="space-y-5">
        <Input
          label="Display name"
          placeholder="Alex"
          value={profile.displayName ?? ""}
          onChange={(e) => void handleChange("displayName", e.target.value)}
        />
        <Input
          label="Household name"
          placeholder="The Smith home"
          value={profile.householdName ?? ""}
          onChange={(e) => void handleChange("householdName", e.target.value)}
        />
        <Input
          label="Home setup date"
          type="date"
          hint="Used as a default starting point for maintenance schedules."
          value={profile.homeSetupDate ?? ""}
          onChange={(e) => void handleChange("homeSetupDate", e.target.value)}
        />
        <Input
          label="Timezone"
          placeholder="America/Chicago"
          value={profile.timezone ?? ""}
          onChange={(e) => void handleChange("timezone", e.target.value)}
        />
        <Textarea
          label="Notes"
          placeholder="Anything your tools should know about your household."
          value={profile.notes ?? ""}
          onChange={(e) => void handleChange("notes", e.target.value)}
        />
          </Card>
        </StaggerItem>
      </div>
    </PageTransition>
  );
}
