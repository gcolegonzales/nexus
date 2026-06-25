"use client";

import Link from "next/link";
import { usePetHealth } from "@/tools/pet-health/PetHealthProvider";
import { useAiAvailable } from "@/tools/pet-health/lib/ai-availability";
import { ChatPanel } from "@/tools/pet-health/components/ChatPanel";
import { ToolSection } from "@/tools/pet-health/components/ToolSection";
import { Card } from "@nexus/ui";
import { Button } from "@nexus/next";

export default function ChatPage() {
  const { isReady, state, activePetId } = usePetHealth();
  const { ready: aiReady } = useAiAvailable();

  // -------------------------------------------------------------------
  // Loading
  // -------------------------------------------------------------------
  if (!isReady) {
    return (
      <ToolSection title="AI Chat">
        <div className="py-16 text-center">
          <p className="text-sm text-muted">Loading…</p>
        </div>
      </ToolSection>
    );
  }

  const activePet = state.pets.find((p) => p.id === activePetId) ?? null;

  // -------------------------------------------------------------------
  // No pet selected / no pets added
  // -------------------------------------------------------------------
  if (!activePet) {
    return (
      <ToolSection title="AI Chat">
        <Card className="space-y-5 py-12 text-center">
          <div className="space-y-2">
            <p className="text-lg font-semibold text-text">No pet selected</p>
            <p className="mx-auto max-w-md text-sm text-muted">
              Pick or add a pet first, then come back here to start chatting.
            </p>
          </div>
          <div className="pt-1">
            <Button href="/tools/pet-health">Go to Overview</Button>
          </div>
        </Card>
      </ToolSection>
    );
  }

  // -------------------------------------------------------------------
  // AI not configured — gate: show message + link to settings
  // -------------------------------------------------------------------
  if (!aiReady) {
    return (
      <ToolSection title="AI Chat">
        <Card className="space-y-5 py-12 text-center">
          <div className="space-y-2">
            <p className="text-lg font-semibold text-text">
              AI provider not configured
            </p>
            <p className="mx-auto max-w-md text-sm text-muted">
              To chat with an AI about {activePet.name}&apos;s health records,
              you need to add an API key first. Your key stays on this device
              only.
            </p>
          </div>
          <div className="pt-1 flex justify-center gap-3 flex-wrap">
            <Button href="/tools/pet-health/settings">
              Configure AI in Settings
            </Button>
          </div>
          <p className="text-xs text-muted mx-auto max-w-xs">
            Supports Anthropic (Claude) and OpenAI (GPT). Bring your own key —
            no Nexus account required.
          </p>
        </Card>
      </ToolSection>
    );
  }

  // -------------------------------------------------------------------
  // Ready — render the chat panel
  // -------------------------------------------------------------------
  return (
    <ToolSection
      title={`Chat about ${activePet.name}`}
      description="Ask questions grounded in your pet's profile and uploaded records."
    >
      <div className="flex flex-col" style={{ minHeight: "60vh" }}>
        <ChatPanel pet={activePet} />
      </div>
    </ToolSection>
  );
}
