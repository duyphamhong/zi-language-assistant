import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { assistantSystemPrompt, buildPrompt } from './index.js';

describe('writing prompts', () => {
  it('uses the documented editor instruction as the system prompt', () => {
    const prompt = buildPrompt('professional');

    expect(prompt).not.toBe(assistantSystemPrompt);
    expect(prompt).toContain('Requested tone: professional');
    expect(prompt).toContain('Return only the final polished text.');
    expect(prompt).toContain('Workstreams A and B can be executed in parallel');
    expect(prompt).not.toContain('{{USER_INPUT}}');
    expect(prompt).not.toContain('{{TONE}}');
  });

  it('stays synchronized with the documented system prompt', () => {
    const documentedPrompt = readFileSync(
      resolve(
        import.meta.dirname,
        '../../../docs/prompts/assistant-system-prompt.md',
      ),
      'utf8',
    )
      .replaceAll('\r\n', '\n')
      .trim();

    expect(assistantSystemPrompt).toBe(documentedPrompt);
  });
});
