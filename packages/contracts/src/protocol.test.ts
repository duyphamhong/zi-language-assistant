import { describe, expect, it } from 'vitest';
import {
  editorTransformRequestSchema,
  editorTransformResponseSchema,
  editorReplaceRequestSchema,
  editorReplaceResponseSchema,
  nativeRequestSchema,
} from './protocol.js';
describe('native protocol', () => {
  it('accepts health checks', () =>
    expect(
      nativeRequestSchema.safeParse({
        protocolVersion: 1,
        requestId: '1',
        type: 'health-check',
        payload: {},
      }).success,
    ).toBe(true));
  it('rejects another protocol version', () =>
    expect(
      nativeRequestSchema.safeParse({
        protocolVersion: 2,
        requestId: '1',
        type: 'health-check',
        payload: {},
      }).success,
    ).toBe(false));
});
describe('editor transformation protocol', () => {
  const request = {
    protocolVersion: 1,
    requestId: 'editor-1',
    type: 'editor.transform',
    payload: { text: 'I have check this.', tone: 'professional' },
  };
  it('accepts a narrow editor request', () =>
    expect(editorTransformRequestSchema.safeParse(request).success).toBe(true));
  it('rejects platform metadata and unsupported operation choices', () => {
    expect(
      editorTransformRequestSchema.safeParse({
        ...request,
        payload: {
          ...request.payload,
          operation: 'anything',
          tenant: 'private',
        },
      }).success,
    ).toBe(false);
  });
  it('rejects an unsupported requested tone', () => {
    expect(
      editorTransformRequestSchema.safeParse({
        ...request,
        payload: { ...request.payload, tone: 'informal' },
      }).success,
    ).toBe(false);
  });
  it('correlates a validated result', () =>
    expect(
      editorTransformResponseSchema.safeParse({
        protocolVersion: 1,
        requestId: request.requestId,
        type: 'editor.transform.result',
        ok: true,
        payload: { suggestion: 'I have checked this.' },
      }).success,
    ).toBe(true));
  it('validates a guarded editor replacement', () => {
    expect(
      editorReplaceRequestSchema.safeParse({
        protocolVersion: 1,
        requestId: 'replace-1',
        type: 'editor.replace',
        payload: {
          expectedOriginalText: 'Original',
          replacementText: 'Polished',
        },
      }).success,
    ).toBe(true);
    expect(
      editorReplaceResponseSchema.safeParse({
        protocolVersion: 1,
        requestId: 'replace-1',
        type: 'editor.replace.result',
        ok: false,
        error: { code: 'STALE_DRAFT', message: 'Draft changed.' },
      }).success,
    ).toBe(true);
  });
});
