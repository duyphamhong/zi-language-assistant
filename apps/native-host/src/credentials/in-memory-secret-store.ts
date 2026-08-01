import type { SecretStore } from './secret-store.js';
export class InMemorySecretStore implements SecretStore {
  #key: string | null = null;
  async setOpenAiApiKey(apiKey: string) {
    this.#key = apiKey;
  }
  async getOpenAiApiKey() {
    return this.#key;
  }
  async deleteOpenAiApiKey() {
    this.#key = null;
  }
  async hasOpenAiApiKey() {
    return this.#key !== null;
  }
}
