import type { Operation } from '@zi-language-assistant/contracts';

const shared =
  'Preserve meaning. Do not invent facts. Preserve names, URLs, IDs, code, commands, paths, numbers, technical terms, and line breaks. Return only the revised message.';
export function buildPrompt(
  operation: Operation,
  sourceLanguage: string,
  targetLanguage: string,
  tone: string,
): string {
  const instruction: Record<Operation, string> = {
    grammar:
      'Correct grammar and spelling while keeping the original language.',
    translate: `Translate from ${sourceLanguage} to ${targetLanguage} using natural workplace language and the same formality.`,
    professional: `Rewrite in a ${tone} professional tone.`,
    concise: 'Make the message concise without losing important information.',
  };
  return `${instruction[operation]} ${shared}`;
}
