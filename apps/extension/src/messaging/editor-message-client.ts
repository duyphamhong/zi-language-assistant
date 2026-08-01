import {
  editorTransformResponseSchema,
  editorReplaceResponseSchema,
  type EditorReplaceRequest,
  type EditorReplaceResponse,
  type EditorTransformRequest,
  type EditorTransformResponse,
} from '@zi-language-assistant/contracts';

export async function requestEditorTransformation(
  request: EditorTransformRequest,
): Promise<EditorTransformResponse> {
  try {
    return editorTransformResponseSchema.parse(
      await chrome.runtime.sendMessage(request),
    );
  } catch {
    return {
      protocolVersion: 1,
      requestId: request.requestId,
      type: 'editor.transform.result',
      ok: false,
      error: {
        code: 'NATIVE_HOST_UNAVAILABLE',
        message:
          'The local native host did not respond. Your Teams draft was not changed.',
        retryable: true,
      },
    };
  }
}

export async function requestEditorReplacement(
  request: EditorReplaceRequest,
): Promise<EditorReplaceResponse> {
  try {
    return editorReplaceResponseSchema.parse(
      await chrome.runtime.sendMessage(request),
    );
  } catch {
    return {
      protocolVersion: 1,
      requestId: request.requestId,
      type: 'editor.replace.result',
      ok: false,
      error: {
        code: 'APPLY_FAILED',
        message: 'The Teams draft could not be updated safely.',
      },
    };
  }
}
