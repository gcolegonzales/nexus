"use client";

import { useCallback, useEffect, useState } from "react";
import { Input, Select, Card } from "@nexus/ui";
import type { SelectOption } from "@nexus/ui";
import { Button } from "@nexus/next";
import {
  loadAiConfig,
  saveAiConfig,
  clearAiConfig,
  DEFAULT_MODELS,
} from "@/tools/pet-health/storage/ai-config";
import type { AiProvider, AiProviderConfig } from "@/tools/pet-health/types/ai";

// ---------------------------------------------------------------------------
// Provider options
// ---------------------------------------------------------------------------

const providerOptions: SelectOption[] = [
  { value: "anthropic", label: "Anthropic (Claude)" },
  { value: "openai", label: "OpenAI (GPT)" },
];

const KNOWN_PROVIDERS: AiProvider[] = ["openai", "anthropic"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Show only last 4 chars, rest as dots. Never renders the full key. */
function maskKey(apiKey: string): string {
  if (apiKey.length <= 4) return "••••";
  return `${"•".repeat(Math.min(apiKey.length - 4, 12))}${apiKey.slice(-4)}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface AiSettingsProps {
  /** Called after save or clear so parent can refresh availability. */
  onConfigChange?: () => void;
}

export function AiSettings({ onConfigChange }: AiSettingsProps) {
  // Current saved config (null = not configured)
  const [savedConfig, setSavedConfig] = useState<AiProviderConfig | null>(null);
  const [loading, setLoading] = useState(true);

  // Draft form fields
  const [provider, setProvider] = useState<AiProvider>("anthropic");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(DEFAULT_MODELS["anthropic"]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ apiKey?: string; provider?: string }>({});

  // Load on mount
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const config = await loadAiConfig();
      setSavedConfig(config);
      if (config) {
        setProvider(config.provider);
        setModel(config.model);
        // Don't pre-fill apiKey — user must re-enter to update
        setApiKey("");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // When provider changes in the form, pre-fill the default model
  function handleProviderChange(value: string | null) {
    const p = (value ?? "anthropic") as AiProvider;
    setProvider(p);
    setModel(DEFAULT_MODELS[p] ?? "");
    setErrors((prev) => ({ ...prev, provider: undefined }));
  }

  function validate(): boolean {
    const next: typeof errors = {};
    if (!apiKey.trim()) next.apiKey = "API key is required.";
    if (!KNOWN_PROVIDERS.includes(provider)) next.provider = "Select a provider.";
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return false;
    }
    return true;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      await saveAiConfig({ provider, apiKey: apiKey.trim(), model: model.trim() || DEFAULT_MODELS[provider] });
      await load();
      onConfigChange?.();
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    await clearAiConfig();
    setSavedConfig(null);
    setApiKey("");
    setErrors({});
    onConfigChange?.();
  }

  if (loading) {
    return (
      <p className="text-sm text-muted">Loading AI configuration…</p>
    );
  }

  // Configured state — show masked summary + Clear button
  if (savedConfig) {
    return (
      <Card className="space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-text">AI provider configured</p>
          <p className="text-sm text-muted">
            {savedConfig.provider === "anthropic" ? "Anthropic (Claude)" : "OpenAI (GPT)"}
            {" · "}
            <span className="font-mono">{maskKey(savedConfig.apiKey)}</span>
            {" · "}
            {savedConfig.model}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => {
              // Switch back to edit mode: pre-fill provider/model but not key
              setSavedConfig(null);
            }}
          >
            Update
          </Button>
          <Button
            variant="danger"
            onClick={() => void handleClear()}
          >
            Clear
          </Button>
        </div>

        <p className="text-xs text-muted">
          Your API key is stored locally on this device and never sent to Nexus
          servers. It is excluded from data exports.
        </p>
      </Card>
    );
  }

  // Not configured — show setup form
  return (
    <Card className="space-y-5">
      <div className="space-y-1">
        <p className="text-sm font-medium text-text">Configure your AI provider</p>
        <p className="text-sm text-muted">
          Bring your own API key to enable AI chat. Your key stays on this
          device only.
        </p>
      </div>

      <div className="space-y-1.5">
        <Select
          label="Provider"
          value={provider}
          options={providerOptions}
          onChange={handleProviderChange}
          fullWidth
        />
        {errors.provider && (
          <p className="text-sm text-danger">{errors.provider}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Input
          label="API key"
          type="password"
          placeholder={
            provider === "anthropic"
              ? "sk-ant-…"
              : "sk-…"
          }
          value={apiKey}
          onChange={(e) => {
            setApiKey(e.target.value);
            setErrors((prev) => ({ ...prev, apiKey: undefined }));
          }}
          autoComplete="off"
        />
        {errors.apiKey && (
          <p className="text-sm text-danger">{errors.apiKey}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Input
          label="Model (optional)"
          placeholder={DEFAULT_MODELS[provider]}
          value={model}
          onChange={(e) => setModel(e.target.value)}
        />
        <p className="text-xs text-muted">
          Leave blank to use the default: {DEFAULT_MODELS[provider]}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button
          onClick={() => void handleSave()}
          disabled={saving}
          className={saving ? "opacity-60 pointer-events-none" : ""}
        >
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>

      <p className="text-xs text-muted">
        Your API key is stored locally in your browser and never sent to Nexus
        servers. It is excluded from data exports.
      </p>
    </Card>
  );
}
