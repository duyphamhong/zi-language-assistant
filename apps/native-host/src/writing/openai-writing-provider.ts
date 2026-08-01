import OpenAI from 'openai';
import { buildPrompt } from '@zi-language-assistant/prompts';
import type { AppConfig } from '../configuration/config-repository.js';
import type { SecretStore } from '../credentials/secret-store.js';
import type {
  ImproveWritingRequest,
  ImproveWritingResult,
  WritingProvider,
} from './writing-provider.js';

export class ProviderError extends Error {
  constructor(
    public readonly code:
      | 'API_KEY_NOT_CONFIGURED'
      | 'OPENAI_AUTHENTICATION_FAILED'
      | 'OPENAI_RATE_LIMITED'
      | 'OPENAI_REQUEST_FAILED'
      | 'OPENAI_TIMEOUT'
      | 'OUTPUT_EMPTY',
    message: string,
    public readonly retryable = false,
  ) {
    super(message);
  }
}
export class OpenAiWritingProvider implements WritingProvider {
  constructor(
    private readonly secrets: SecretStore,
    private readonly config: AppConfig,
  ) {}
  async improve(request: ImproveWritingRequest): Promise<ImproveWritingResult> {
    const apiKey = await this.secrets.getOpenAiApiKey();
    if (!apiKey)
      throw new ProviderError(
        'API_KEY_NOT_CONFIGURED',
        'Configure an OpenAI API key with the local CLI.',
      );
    const started = performance.now();
    try {
      const client = new OpenAI({
        apiKey,
        timeout: this.config.requestTimeoutMs,
        maxRetries: 0,
      });
      const response = await client.responses.create({
        model: this.config.model,
        max_output_tokens: this.config.maxOutputTokens,
        instructions: buildPrompt(
          request.operation,
          request.sourceLanguage,
          request.targetLanguage,
          request.tone,
        ),
        input: request.text,
      });
      const suggestedText = response.output_text.trim();
      if (!suggestedText)
        throw new ProviderError(
          'OUTPUT_EMPTY',
          'The provider returned no revised text.',
        );
      return {
        originalText: request.text,
        suggestedText,
        provider: 'openai',
        model: this.config.model,
        usage: {
          inputTokens: response.usage?.input_tokens ?? 0,
          outputTokens: response.usage?.output_tokens ?? 0,
        },
        durationMs: Math.round(performance.now() - started),
      };
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      const status = (error as { status?: number; name?: string }).status;
      if (status === 401)
        throw new ProviderError(
          'OPENAI_AUTHENTICATION_FAILED',
          'OpenAI rejected the configured API key.',
        );
      if (status === 429)
        throw new ProviderError(
          'OPENAI_RATE_LIMITED',
          'OpenAI rate limit reached.',
          true,
        );
      if ((error as { name?: string }).name === 'APIConnectionTimeoutError')
        throw new ProviderError(
          'OPENAI_TIMEOUT',
          'OpenAI request timed out.',
          true,
        );
      throw new ProviderError(
        'OPENAI_REQUEST_FAILED',
        'OpenAI could not process the request.',
        true,
      );
    }
  }
}
