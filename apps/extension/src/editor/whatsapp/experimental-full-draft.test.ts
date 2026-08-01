import { describe, expect, it } from 'vitest';
import {
  classifyWhatsAppDraftMutation,
  normalizeWhatsAppDraft,
} from './experimental-full-draft';

describe('experimental WhatsApp full-draft helpers', () => {
  it('normalizes only known editor representation differences', () => {
    expect(normalizeWhatsAppDraft('a\r\nb\u00a0\u200B')).toBe('a\nb ');
  });

  it('classifies expected, unchanged, appended, prepended, empty, partial, and unknown drafts', () => {
    expect(classifyWhatsAppDraftMutation('before', 'after', 'after')).toBe(
      'EXPECTED',
    );
    expect(classifyWhatsAppDraftMutation('before', 'after', 'before')).toBe(
      'UNCHANGED',
    );
    expect(
      classifyWhatsAppDraftMutation('before', 'after', 'beforeafter'),
    ).toBe('APPENDED');
    expect(
      classifyWhatsAppDraftMutation('before', 'after', 'afterbefore'),
    ).toBe('PREPENDED');
    expect(classifyWhatsAppDraftMutation('before', 'after', '')).toBe('EMPTY');
    expect(classifyWhatsAppDraftMutation('before', 'after', 'bef')).toBe(
      'PARTIAL',
    );
    expect(classifyWhatsAppDraftMutation('before', 'after', 'other')).toBe(
      'UNKNOWN',
    );
  });
});
