import type {
  ImproveWritingRequest,
  ImproveWritingResult,
  WritingProvider,
} from './writing-provider.js';
export class MockWritingProvider implements WritingProvider {
  async improve(request: ImproveWritingRequest): Promise<ImproveWritingResult> {
    const transforms: Record<ImproveWritingRequest['operation'], string> = {
      grammar: request.text.replace(/I have check/g, 'I have checked'),
      translate: `[${request.targetLanguage}] ${request.text}`,
      professional: `Please ${request.text.charAt(0).toLowerCase()}${request.text.slice(1)}`,
      concise: request.text.replace(/\bvery\s+/gi, ''),
    };
    return {
      originalText: request.text,
      suggestedText: transforms[request.operation],
      provider: 'mock',
      model: 'mock-v1',
      usage: { inputTokens: 0, outputTokens: 0 },
      durationMs: 0,
    };
  }
}
