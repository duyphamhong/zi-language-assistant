import { defineBackground } from 'wxt/utils/define-background';
import { nativeRequestSchema } from '@zi-language-assistant/contracts';
export default defineBackground(() => {
  chrome.runtime.onMessage.addListener((message: unknown, sender) => {
    if (sender.id !== chrome.runtime.id)
      return Promise.resolve({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Untrusted sender.',
          retryable: false,
        },
      });
    const request = nativeRequestSchema.safeParse(message);
    if (!request.success)
      return Promise.resolve({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Invalid extension request.',
          retryable: false,
        },
      });
    return chrome.runtime
      .sendNativeMessage('com.appzihub.ai_message_assistant', request.data)
      .catch(() => ({
        protocolVersion: 1,
        requestId: request.data.requestId,
        success: false,
        error: {
          code: 'NATIVE_HOST_UNAVAILABLE',
          message:
            'The local native host is unavailable. Run the installer and reload this extension.',
          retryable: true,
        },
      }));
  });
});
