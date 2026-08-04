import { describe, expect, it } from 'vitest';
import { appendClipboardSecret, sanitizeSecretInput } from './secret-input.js';

describe('sanitizeSecretInput', () => {
  it('removes terminal control characters from a pasted API key', () => {
    expect(sanitizeSecretInput('\u0016sk-test\r\n')).toBe('sk-test');
  });

  it('preserves printable API-key characters', () => {
    expect(sanitizeSecretInput('sk-proj_ABC-123')).toBe('sk-proj_ABC-123');
  });

  it('appends a sanitized Windows clipboard paste', () => {
    expect(appendClipboardSecret('sk-', '\u0016proj_ABC-123\r\n')).toBe(
      'sk-proj_ABC-123',
    );
  });
});
