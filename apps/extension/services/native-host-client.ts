import {
  nativeResponseSchema,
  type NativeRequest,
  type NativeResponse,
} from '@zi-language-assistant/contracts';
export async function sendNativeRequest(
  request: NativeRequest,
): Promise<NativeResponse> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('TIMEOUT')), 35_000),
  );
  try {
    const response = await Promise.race([
      chrome.runtime.sendMessage(request),
      timeout,
    ]);
    return nativeResponseSchema.parse(response);
  } catch {
    return {
      protocolVersion: 1,
      requestId: request.requestId,
      success: false,
      error: {
        code: 'NATIVE_HOST_UNAVAILABLE',
        message:
          'The local native host did not respond. Verify installation and reload the extension.',
        retryable: true,
      },
    };
  }
}
