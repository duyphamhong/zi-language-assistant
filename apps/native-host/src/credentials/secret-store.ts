export interface SecretStore {
  setOpenAiApiKey(apiKey: string): Promise<void>;
  getOpenAiApiKey(): Promise<string | null>;
  deleteOpenAiApiKey(): Promise<void>;
  hasOpenAiApiKey(): Promise<boolean>;
}
