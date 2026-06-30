"use client";

import { useCallback, useEffect, useState } from "react";
import { Input, Select, Card } from "@nexus/ui";
import type { SelectOption } from "@nexus/ui";
import { Button } from "@nexus/next";
import {
  loadAiConfig,
  saveAiConfig,
  clearAiConfig,
  fetchModels,
  DEFAULT_MODELS,
} from "@/tools/pet-health/storage/ai-config";
import type { AiProvider, AiProviderConfig } from "@/tools/pet-health/types/ai";

// ---------------------------------------------------------------------------
// Provider options
// ---------------------------------------------------------------------------

const providerOptions: SelectOption[] = [
  { value: "anthropic", label: "Anthropic (Claude)" },
  { value: "openai", label: "OpenAI (GPT)" },
  { value: "xai", label: "xAI (Grok)" },
];

const KNOWN_PROVIDERS: AiProvider[] = ["openai", "anthropic", "xai"];

/** Display name per provider (used in the configured-state summary). */
const PROVIDER_LABEL: Record<AiProvider, string> = {
  anthropic: "Anthropic (Claude)",
  openai: "OpenAI (GPT)",
  xai: "xAI (Grok)",
};

/** Key-format hint shown as the API-key input placeholder. */
const KEY_PLACEHOLDER: Record<AiProvider, string> = {
  anthropic: "sk-ant-…",
  openai: "sk-…",
  xai: "xai-…",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Show only last 4 chars, rest as dots. Never renders the full key. */
function maskKey(apiKey: string): string {
  if (apiKey.length <= 4) return "••••";
  return `${"•".repeat(Math.min(apiKey.length - 4, 12))}${apiKey.slice(-4)}`;
}

/** Build dropdown options from a list of model ids, ensuring `selected` is present. */
function toModelOptions(models: string[], selected: string): SelectOption[] {
  const ids = models.includes(selected) ? models : [selected, ...models];
  return ids.map((id) => ({ value: id, label: id }));
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

  // Available models for the dropdown — empty until a key is provided and the
  // list is fetched from the provider. We never show a generic list pre-key.
  const [models, setModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  // Refresh the model list from the provider using a key (falls back internally).
  const refreshModels = useCallback(
    async (p: AiProvider, key: string) => {
      setLoadingModels(true);
      try {
        const list = await fetchModels(p, key);
        setModels(list);
      } finally {
        setLoadingModels(false);
      }
    },
    [],
  );

  // Load on mount
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const config = await loadAiConfig();
      setSavedConfig(config);
      if (config) {
        setProvider(config.provider);
        setModel(config.model);
        // Don't pre-fill apiKey — user must re-enter to update.
      }
      // No key in the form yet → no model list until the user enters a key.
      setApiKey("");
      setModels([]);
    } finally {
      setLoading(false);
    }
  }, [refreshModels]);

  useEffect(() => {
    void load();
  }, [load]);

  // When provider changes in the form, pre-fill the default model + fallback list
  function handleProviderChange(value: string | null) {
    const p = (value ?? "anthropic") as AiProvider;
    setProvider(p);
    setModel(DEFAULT_MODELS[p] ?? "");
    setModels([]);
    setErrors((prev) => ({ ...prev, provider: undefined }));
    // If the user already typed a key, fetch this provider's models live.
    if (apiKey.trim()) void refreshModels(p, apiKey);
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
      await saveAiConfig({
        provider,
        apiKey: apiKey.trim(),
        model: model.trim() || DEFAULT_MODELS[provider],
      });
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
    setModels([]);
    setErrors({});
    onConfigChange?.();
  }

  if (loading) {
    return <p className="text-sm text-muted">Loading AI configuration…</p>;
  }

  // Configured state — show masked summary + Clear button
  if (savedConfig) {
    return (
      <Card className="space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-text">AI provider configured</p>
          <p className="text-sm text-muted">
            {PROVIDER_LABEL[savedConfig.provider] ?? savedConfig.provider}
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
          <Button variant="danger" onClick={() => void handleClear()}>
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
  const modelOptions = toModelOptions(models, model);

  return (
    <Card className="space-y-5">
      <div className="space-y-1">
        <p className="text-sm font-medium text-text">Configure your AI provider</p>
        <p className="text-sm text-muted">
          Bring your own API key to enable AI features. Your key stays on this
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
          placeholder={KEY_PLACEHOLDER[provider] ?? "sk-…"}
          value={apiKey}
          onChange={(e) => {
            setApiKey(e.target.value);
            setErrors((prev) => ({ ...prev, apiKey: undefined }));
          }}
          onBlur={() => {
            // Load the available models for this key once it's entered.
            if (apiKey.trim() && models.length === 0 && !loadingModels) {
              void refreshModels(provider, apiKey);
            }
          }}
          autoComplete="off"
        />
        {errors.apiKey && <p className="text-sm text-danger">{errors.apiKey}</p>}
      </div>

      <div className="space-y-1.5">
        {apiKey.trim() ? (
          <>
            <Select
              label="Model"
              value={model}
              options={modelOptions}
              onChange={(value) => setModel(value ?? DEFAULT_MODELS[provider])}
              fullWidth
            />
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                onClick={() => void refreshModels(provider, apiKey)}
                disabled={loadingModels}
                className={loadingModels ? "opacity-60 pointer-events-none" : ""}
              >
                {loadingModels ? "Loading…" : "Refresh Models"}
              </Button>
              <p className="text-xs text-muted">
                {loadingModels
                  ? "Loading your provider's models…"
                  : "Models available to your key. Refresh to re-fetch."}
              </p>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-text">Model</p>
            <div className="rounded-xl border border-dashed border-border bg-surface px-3 py-2.5 text-sm text-muted">
              Enter your API key above to load the models available to you.
            </div>
          </>
        )}
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
