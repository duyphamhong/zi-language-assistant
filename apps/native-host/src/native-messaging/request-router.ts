import {
  failure,
  nativeRequestSchema,
  PROTOCOL_VERSION,
  type NativeResponse,
} from '@zi-language-assistant/contracts';
import { ConfigRepository } from '../configuration/config-repository.js';
import type { SecretStore } from '../credentials/secret-store.js';
import {
  OpenAiWritingProvider,
  ProviderError,
} from '../writing/openai-writing-provider.js';
export class RequestRouter {
  constructor(
    private readonly config = new ConfigRepository(),
    private readonly secrets: SecretStore,
  ) {}
  async route(input: unknown): Promise<NativeResponse> {
    const parsed = nativeRequestSchema.safeParse(input);
    const requestId =
      typeof input === 'object' &&
      input !== null &&
      'requestId' in input &&
      typeof input.requestId === 'string'
        ? input.requestId
        : 'unknown';
    if (!parsed.success) {
      const protocol =
        typeof input === 'object' &&
        input !== null &&
        'protocolVersion' in input
          ? (input as { protocolVersion?: unknown }).protocolVersion
          : undefined;
      return failure(
        requestId,
        protocol !== undefined && protocol !== PROTOCOL_VERSION
          ? 'UNSUPPORTED_PROTOCOL_VERSION'
          : 'INVALID_REQUEST',
        'The native request is invalid.',
      );
    }
    const request = parsed.data;
    try {
      if (request.type === 'health-check')
        return {
          protocolVersion: PROTOCOL_VERSION,
          requestId,
          success: true,
          data: {
            status: 'ok',
            hostVersion: '0.1.0',
            protocolVersion: PROTOCOL_VERSION,
            platform: process.platform,
          },
        };
      const config = await this.config.get();
      if (request.type === 'get-configuration-status')
        return {
          protocolVersion: PROTOCOL_VERSION,
          requestId,
          success: true,
          data: {
            apiKeyConfigured: await this.secrets.hasOpenAiApiKey(),
            provider: config.provider,
            model: config.model,
          },
        };
      const provider = new OpenAiWritingProvider(this.secrets, config);
      return {
        protocolVersion: PROTOCOL_VERSION,
        requestId,
        success: true,
        data: await provider.improve(request.payload),
      };
    } catch (error) {
      if (error instanceof ProviderError)
        return failure(requestId, error.code, error.message, error.retryable);
      return failure(
        requestId,
        'CONFIGURATION_INVALID',
        'Local configuration is invalid.',
      );
    }
  }
}
