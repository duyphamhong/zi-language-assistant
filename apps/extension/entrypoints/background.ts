import { defineBackground } from 'wxt/utils/define-background';
import {
  editorTransformRequestSchema,
  editorReplaceRequestSchema,
  type EditorReplaceResponse,
  nativeResponseSchema,
  nativeRequestSchema,
  PROTOCOL_VERSION,
  type EditorTransformResponse,
} from '@zi-language-assistant/contracts';

const editorSelectors = {
  teams: [
    '[data-tid="ckeditor"][contenteditable="true"]',
    '[data-tid="ckeditor"] [contenteditable="true"][role="textbox"]',
    '[data-tid="message-compose-box"] [contenteditable="true"][role="textbox"]',
  ],
  whatsapp: [
    'div[role="textbox"][contenteditable="true"][data-lexical-editor="true"][data-tab="10"]',
  ],
} as const;

type EditorPlatform = keyof typeof editorSelectors;

function editorPlatformFromSender(
  sender: chrome.runtime.MessageSender,
): EditorPlatform | undefined {
  try {
    const origin = new URL(sender.url ?? '').origin;
    if (
      origin === 'https://teams.microsoft.com' ||
      origin === 'https://teams.cloud.microsoft' ||
      origin === 'https://teams.live.com'
    )
      return 'teams';
    if (origin === 'https://web.whatsapp.com') return 'whatsapp';
  } catch {
    return undefined;
  }
  return undefined;
}

async function selectEditorDraftInMainWorld(
  expectedOriginalText: string,
  selectors: string[],
  selectDomContents: boolean,
): Promise<{ selected: boolean; stale: boolean }> {
  const selector = selectors.join(', ');
  const visible = (element: HTMLElement) => {
    const style = getComputedStyle(element);
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      element.getClientRects().length > 0
    );
  };
  const composers = [
    ...document.querySelectorAll<HTMLElement>(selector),
  ].filter(visible);
  const composer = composers.length === 1 ? composers[0] : undefined;
  if (
    !composer ||
    composer.innerText.replace(/\r\n/g, '\n') !== expectedOriginalText
  )
    return { selected: false, stale: true };
  composer.focus();
  if (!selectDomContents) return { selected: true, stale: false };
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(composer);
  selection?.removeAllRanges();
  selection?.addRange(range);
  return { selected: true, stale: false };
}

async function verifyEditorDraftInMainWorld(
  expectedReplacementText: string,
  selectors: string[],
): Promise<boolean> {
  const normalize = (text: string) =>
    text.replace(/\r\n/g, '\n').replaceAll('\u00a0', ' ').trimEnd();
  const selector = selectors.join(', ');
  const visible = (element: HTMLElement) => {
    const style = getComputedStyle(element);
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      element.getClientRects().length > 0
    );
  };
  const composers = [
    ...document.querySelectorAll<HTMLElement>(selector),
  ].filter(visible);
  const composer = composers.length === 1 ? composers[0] : undefined;
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  await new Promise<void>((resolve) => window.setTimeout(resolve, 100));
  if (
    !composer ||
    normalize(composer.innerText) !== normalize(expectedReplacementText)
  )
    return false;
  const endRange = document.createRange();
  endRange.selectNodeContents(composer);
  endRange.collapse(false);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(endRange);
  return true;
}

function buildWhatsAppReplacementExpression(
  expectedOriginalText: string,
  replacementText: string,
  selectors: readonly string[],
): string {
  const selector = JSON.stringify(selectors.join(', '));
  const expected = JSON.stringify(expectedOriginalText);
  const replacement = JSON.stringify(replacementText);
  return `(() => {
    const visible = (element) => {
      const style = getComputedStyle(element);
      return style.display !== 'none' && style.visibility !== 'hidden' && element.getClientRects().length > 0;
    };
    const composers = [...document.querySelectorAll(${selector})].filter(visible);
    const composer = composers.length === 1 ? composers[0] : undefined;
    if (!composer || composer.innerText.replace(/\\r\\n/g, '\\n') !== ${expected}) return false;
    composer.focus();
    return document.execCommand('selectAll', false) && document.execCommand('insertText', false, ${replacement});
  })()`;
}

const unavailable = (requestId: string) => ({
  protocolVersion: PROTOCOL_VERSION,
  requestId,
  success: false as const,
  error: {
    code: 'NATIVE_HOST_UNAVAILABLE' as const,
    message:
      'The local native host is unavailable. Run the installer and reload this extension.',
    retryable: true,
  },
});

export async function routeExtensionMessage(
  message: unknown,
  sender: chrome.runtime.MessageSender,
): Promise<unknown> {
  if (sender.id !== chrome.runtime.id) return unavailable('unknown');

  const replaceRequest = editorReplaceRequestSchema.safeParse(message);
  if (replaceRequest.success) {
    const request = replaceRequest.data;
    const tabId = sender.tab?.id;
    const editorPlatform = editorPlatformFromSender(sender);
    if (tabId === undefined || !editorPlatform)
      return {
        protocolVersion: PROTOCOL_VERSION,
        requestId: request.requestId,
        type: 'editor.replace.result',
        ok: false,
        error: {
          code: 'APPLY_FAILED',
          message: 'The Teams draft could not be updated safely.',
        },
      } satisfies EditorReplaceResponse;
    try {
      const selectionResult = await chrome.scripting.executeScript({
        target: { tabId },
        world: 'MAIN',
        func: selectEditorDraftInMainWorld,
        args: [
          request.payload.expectedOriginalText,
          [...editorSelectors[editorPlatform]],
          editorPlatform === 'teams',
        ],
      });
      const selection = selectionResult[0]?.result;
      if (!selection?.selected)
        return {
          protocolVersion: PROTOCOL_VERSION,
          requestId: request.requestId,
          type: 'editor.replace.result',
          ok: false,
          error: selection?.stale
            ? {
                code: 'STALE_DRAFT',
                message:
                  'Your Teams draft changed after this suggestion was created. Run the assistant again to avoid overwriting your edits.',
              }
            : {
                code: 'APPLY_FAILED',
                message: 'The Teams draft could not be updated safely.',
              },
        } satisfies EditorReplaceResponse;

      const debuggee = { tabId };
      let attached = false;
      try {
        await chrome.debugger.attach(debuggee, '1.3');
        attached = true;
        if (editorPlatform === 'whatsapp') {
          const evaluation = await chrome.debugger.sendCommand(
            debuggee,
            'Runtime.evaluate',
            {
              expression: buildWhatsAppReplacementExpression(
                request.payload.expectedOriginalText,
                request.payload.replacementText,
                editorSelectors.whatsapp,
              ),
              userGesture: true,
              returnByValue: true,
            },
          );
          if (
            typeof evaluation !== 'object' ||
            evaluation === null ||
            !('result' in evaluation) ||
            typeof evaluation.result !== 'object' ||
            evaluation.result === null ||
            !('value' in evaluation.result) ||
            evaluation.result.value !== true
          )
            throw new Error('WhatsApp draft replacement failed.');
        } else {
          const segments = request.payload.replacementText.split(/\r?\n/);
          for (const [index, segment] of segments.entries()) {
            if (segment)
              await chrome.debugger.sendCommand(debuggee, 'Input.insertText', {
                text: segment,
              });
            if (index === segments.length - 1) continue;

            // Teams' editor ignores newline characters in Input.insertText. Its
            // documented Shift+Enter action creates a new line, unlike Ctrl+Enter
            // (Send). No Enter-only or message-send shortcut is dispatched.
            await chrome.debugger.sendCommand(
              debuggee,
              'Input.dispatchKeyEvent',
              {
                type: 'keyDown',
                key: 'Enter',
                code: 'Enter',
                windowsVirtualKeyCode: 13,
                nativeVirtualKeyCode: 13,
                modifiers: 8,
              },
            );
            await chrome.debugger.sendCommand(
              debuggee,
              'Input.dispatchKeyEvent',
              {
                type: 'keyUp',
                key: 'Enter',
                code: 'Enter',
                windowsVirtualKeyCode: 13,
                nativeVirtualKeyCode: 13,
                modifiers: 8,
              },
            );
          }
        }
      } finally {
        if (attached) await chrome.debugger.detach(debuggee).catch(() => {});
      }

      const applied = await chrome.scripting
        .executeScript({
          target: { tabId },
          world: 'MAIN',
          func: verifyEditorDraftInMainWorld,
          args: [
            request.payload.replacementText,
            [...editorSelectors[editorPlatform]],
          ],
        })
        .then((result) => result[0]?.result === true)
        .catch(() => false);
      if (!applied)
        return {
          protocolVersion: PROTOCOL_VERSION,
          requestId: request.requestId,
          type: 'editor.replace.result',
          ok: false,
          error: {
            code: 'APPLY_FAILED',
            message: 'The chat draft could not be updated safely.',
          },
        } satisfies EditorReplaceResponse;
      return {
        protocolVersion: PROTOCOL_VERSION,
        requestId: request.requestId,
        type: 'editor.replace.result',
        ok: true,
      } satisfies EditorReplaceResponse;
    } catch {
      return {
        protocolVersion: PROTOCOL_VERSION,
        requestId: request.requestId,
        type: 'editor.replace.result',
        ok: false,
        error: {
          code: 'APPLY_FAILED',
          message: 'The Teams draft could not be updated safely.',
        },
      } satisfies EditorReplaceResponse;
    }
  }

  const editorRequest = editorTransformRequestSchema.safeParse(message);
  if (editorRequest.success) {
    const request = editorRequest.data;
    const nativeResponse = await chrome.runtime
      .sendNativeMessage('com.appzihub.ai_message_assistant', {
        protocolVersion: PROTOCOL_VERSION,
        requestId: request.requestId,
        type: 'improve-message',
        payload: {
          text: request.payload.text,
          operation: 'grammar',
          sourceLanguage: 'auto',
          targetLanguage: 'English',
          tone: request.payload.tone,
        },
      })
      .then((response: unknown) => nativeResponseSchema.safeParse(response))
      .catch(() => undefined);
    if (!nativeResponse?.success) return unavailable(request.requestId);
    if (!nativeResponse.data.success)
      return {
        protocolVersion: PROTOCOL_VERSION,
        requestId: request.requestId,
        type: 'editor.transform.result',
        ok: false,
        error: nativeResponse.data.error,
      } satisfies EditorTransformResponse;
    const data = nativeResponse.data.data;
    if (
      typeof data !== 'object' ||
      data === null ||
      !('suggestedText' in data) ||
      typeof data.suggestedText !== 'string' ||
      !data.suggestedText
    )
      return {
        protocolVersion: PROTOCOL_VERSION,
        requestId: request.requestId,
        type: 'editor.transform.result',
        ok: false,
        error: {
          code: 'OUTPUT_EMPTY',
          message: 'The local provider returned an invalid suggestion.',
          retryable: true,
        },
      } satisfies EditorTransformResponse;
    return {
      protocolVersion: PROTOCOL_VERSION,
      requestId: request.requestId,
      type: 'editor.transform.result',
      ok: true,
      payload: {
        suggestion: data.suggestedText,
      },
    } satisfies EditorTransformResponse;
  }

  const nativeRequest = nativeRequestSchema.safeParse(message);
  if (!nativeRequest.success)
    return {
      protocolVersion: PROTOCOL_VERSION,
      requestId: 'unknown',
      success: false,
      error: {
        code: 'INVALID_REQUEST',
        message: 'Invalid extension request.',
        retryable: false,
      },
    };
  return chrome.runtime
    .sendNativeMessage('com.appzihub.ai_message_assistant', nativeRequest.data)
    .then((response: unknown) => nativeResponseSchema.safeParse(response))
    .then((response) =>
      response.success
        ? response.data
        : unavailable(nativeRequest.data.requestId),
    )
    .catch(() => unavailable(nativeRequest.data.requestId));
}
export default defineBackground(() => {
  chrome.runtime.onMessage.addListener(routeExtensionMessage);
});
