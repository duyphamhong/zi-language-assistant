export class FrameReader {
  #buffer = Buffer.alloc(0);
  constructor(private readonly maxBytes = 64 * 1024) {}
  push(chunk: Buffer): unknown[] {
    this.#buffer = Buffer.concat([this.#buffer, chunk]);
    const frames: unknown[] = [];
    while (this.#buffer.length >= 4) {
      const size = this.#buffer.readUInt32LE(0);
      if (size > this.maxBytes) throw new Error('FRAME_TOO_LARGE');
      if (this.#buffer.length < size + 4) break;
      const raw = this.#buffer.subarray(4, size + 4).toString('utf8');
      this.#buffer = this.#buffer.subarray(size + 4);
      frames.push(JSON.parse(raw) as unknown);
    }
    return frames;
  }
}
