import type { SecretStore } from './secret-store.js';
const SERVICE = 'com.appzihub.ai-message-assistant';
const ACCOUNT = 'openai-api-key';
type Keytar = typeof import('keytar');

async function loadKeytar(): Promise<Keytar> {
  try {
    return (await import('keytar')).default as unknown as Keytar;
  } catch {
    throw new Error(
      'Windows Credential Manager is unavailable. Rebuild the keytar dependency before configuring an API key.',
    );
  }
}

export class OsSecretStore implements SecretStore {
  async setOpenAiApiKey(apiKey: string) {
    const keytar = await loadKeytar();
    await keytar.setPassword(SERVICE, ACCOUNT, apiKey);
  }
  async getOpenAiApiKey() {
    const keytar = await loadKeytar();
    return keytar.getPassword(SERVICE, ACCOUNT);
  }
  async deleteOpenAiApiKey() {
    const keytar = await loadKeytar();
    await keytar.deletePassword(SERVICE, ACCOUNT);
  }
  async hasOpenAiApiKey() {
    return (await this.getOpenAiApiKey()) !== null;
  }
}
