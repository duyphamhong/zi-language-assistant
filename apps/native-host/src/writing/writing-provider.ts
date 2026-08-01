import type { Operation } from '@zi-language-assistant/contracts';
export interface ImproveWritingRequest {
  text: string;
  operation: Operation;
  sourceLanguage: string;
  targetLanguage: string;
  tone: string;
}
export interface ImproveWritingResult {
  originalText: string;
  suggestedText: string;
  provider: 'mock' | 'openai';
  model: string;
  usage: { inputTokens: number; outputTokens: number };
  durationMs: number;
}
export interface WritingProvider {
  improve(request: ImproveWritingRequest): Promise<ImproveWritingResult>;
}
