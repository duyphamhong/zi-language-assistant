import { FrameReader } from './frame-reader.js';
import { encodeFrame } from './frame-writer.js';
import type { RequestRouter } from './request-router.js';
export async function runMessageLoop(
  router: RequestRouter,
  input: NodeJS.ReadableStream = process.stdin,
  output: NodeJS.WritableStream = process.stdout,
): Promise<void> {
  const reader = new FrameReader();
  for await (const chunk of input) {
    let messages: unknown[];
    try {
      messages = reader.push(Buffer.from(chunk));
    } catch {
      output.write(
        encodeFrame({
          protocolVersion: 1,
          requestId: 'unknown',
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Invalid native message frame.',
            retryable: false,
          },
        }),
      );
      continue;
    }
    for (const message of messages)
      output.write(encodeFrame(await router.route(message)));
  }
}
