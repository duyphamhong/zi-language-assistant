import { PassThrough } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { encodeFrame } from '../../apps/native-host/src/native-messaging/frame-writer.js';
import { runMessageLoop } from '../../apps/native-host/src/native-messaging/message-loop.js';
import { RequestRouter } from '../../apps/native-host/src/native-messaging/request-router.js';
import { InMemorySecretStore } from '../../apps/native-host/src/credentials/in-memory-secret-store.js';
describe('native host integration', () => {
  it('serves a framed health check', async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    const chunks: Buffer[] = [];
    output.on('data', (chunk: Buffer) => chunks.push(chunk));
    const run = runMessageLoop(
      new RequestRouter(undefined, new InMemorySecretStore()),
      input,
      output,
    );
    input.end(
      encodeFrame({
        protocolVersion: 1,
        requestId: 'health',
        type: 'health-check',
        payload: {},
      }),
    );
    await run;
    const length = chunks[0]!.readUInt32LE(0);
    const response = JSON.parse(chunks[0]!.subarray(4, 4 + length).toString());
    expect(response.success).toBe(true);
    expect(response.data.status).toBe('ok');
  });
});
