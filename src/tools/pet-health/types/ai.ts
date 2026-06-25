// ---------------------------------------------------------------------------
// Pet Health — AI provider configuration types
// ---------------------------------------------------------------------------

export type AiProvider = "openai" | "anthropic";

export interface AiProviderConfig {
  provider: AiProvider;
  apiKey: string;
  model: string;
}
