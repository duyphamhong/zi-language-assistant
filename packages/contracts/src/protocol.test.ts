import { describe, expect, it } from 'vitest';
import { nativeRequestSchema } from './protocol.js';
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
