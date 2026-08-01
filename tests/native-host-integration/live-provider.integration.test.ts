import { describe, expect, it } from 'vitest';
import {
  defaultConfig,
  ConfigRepository,
} from '../../apps/native-host/src/configuration/config-repository.js';
import { InMemorySecretStore } from '../../apps/native-host/src/credentials/in-memory-secret-store.js';
import { RequestRouter } from '../../apps/native-host/src/native-messaging/request-router.js';

describe('native host live provider', () => {
  it('uses the configured OpenAI provider rather than a mock provider', async () => {
    const config = {
      get: async () => defaultConfig,
    } as ConfigRepository;
    const response = await new RequestRouter(
      config,
      new InMemorySecretStore(),
    ).route({
      protocolVersion: 1,
      requestId: 'live-provider',
      type: 'improve-message',
      payload: {
        text: 'I have check this issue.',
        operation: 'grammar',
        sourceLanguage: 'auto',
        targetLanguage: 'English',
        tone: 'professional',
      },
    });

    expect(response).toMatchObject({
      success: false,
      error: { code: 'API_KEY_NOT_CONFIGURED' },
    });
  });
});
