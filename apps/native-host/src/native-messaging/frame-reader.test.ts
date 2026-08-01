import { describe, expect, it } from 'vitest';
import { FrameReader } from './frame-reader.js';
import { encodeFrame } from './frame-writer.js';
describe('FrameReader', () => {
  it('decodes partial and combined frames', () => {
    const first = encodeFrame({ one: 1 });
    const second = encodeFrame({ two: 2 });
    const reader = new FrameReader();
    expect(reader.push(first.subarray(0, 3))).toEqual([]);
    expect(reader.push(Buffer.concat([first.subarray(3), second]))).toEqual([
      { one: 1 },
      { two: 2 },
    ]);
  });
  it('rejects oversized frames', () => {
    const frame = Buffer.alloc(4);
    frame.writeUInt32LE(64 * 1024 + 1);
    expect(() => new FrameReader().push(frame)).toThrow('FRAME_TOO_LARGE');
  });
});
