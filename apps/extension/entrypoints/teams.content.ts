import { defineContentScript } from 'wxt/utils/define-content-script';
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';
import { TeamsEditorAdapter } from '../src/editor/teams/teams-editor-adapter';
import {
  requestEditorReplacement,
  requestEditorTransformation,
} from '../src/messaging/editor-message-client';
import {
  showPolishedDraftPreview,
  toneOptions,
  type Tone,
} from '../src/ui/polished-draft-preview';

const css = `.assistant{font:14px system-ui,sans-serif;display:flex}.primary{min-height:32px;padding:6px 10px;border:1px solid Highlight;border-radius:6px;background:Highlight;color:HighlightText;cursor:pointer}.primary:focus-visible{outline:2px solid Highlight;outline-offset:2px}.primary:disabled{opacity:.68;cursor:wait}.spinner{display:inline-block;width:13px;height:13px;border:2px solid color-mix(in srgb,currentColor 32%,transparent);border-top-color:currentColor;border-radius:50%;animation:spin .75s linear infinite;vertical-align:-2px}@keyframes spin{to{transform:rotate(360deg)}}`;
const adapter = new TeamsEditorAdapter();
const TONE_STORAGE_KEY = 'teams-polish-tone';
function isTone(value: unknown): value is Tone {
  return toneOptions.some(([tone]) => tone === value);
}
function failureMessage(reason: string): string {
  return (
    (
      {
        empty: 'Write a draft before using the assistant.',
        'not-editable': 'The current Teams composer is not editable.',
        'rich-content':
          'This draft contains Teams content that cannot be replaced safely yet.',
        'multiple-composers':
          'Use the assistant with one active Teams composer.',
        oversized: 'This draft is too large to process safely.',
      } as Record<string, string>
    )[reason] ?? 'This Teams editor state is not supported yet.'
  );
}

export default defineContentScript({
  matches: [
    'https://teams.microsoft.com/*',
    'https://teams.cloud.microsoft/*',
    'https://teams.live.com/*',
  ],
  runAt: 'document_idle',
  async main(ctx) {
    let mountedComposer: HTMLElement | null = null;
    let activeRequestId: string | null = null;
    let selectedTone: Tone = 'professional';
    try {
      const stored = await chrome.storage.local.get(TONE_STORAGE_KEY);
      if (isTone(stored[TONE_STORAGE_KEY]))
        selectedTone = stored[TONE_STORAGE_KEY];
    } catch {
      /* Keep default. */
    }
    const ui = await createShadowRootUi(ctx, {
      name: 'ai-message-assistant-teams',
      position: 'inline',
      anchor: () => mountedComposer,
      append: 'after',
      css,
      isolateEvents: true,
      onMount(container) {
        const polish = document.createElement('button');
        polish.type = 'button';
        polish.className = 'primary';
        polish.setAttribute(
          'aria-label',
          'Polish draft with AI Message Assistant',
        );
        polish.textContent = 'Polish with AI';
        container.append(polish);
        const reset = () => {
          activeRequestId = null;
          polish.disabled = false;
          polish.replaceChildren('Polish with AI');
        };
        const showError = (message: string) => {
          const error = document.createElement('span');
          error.textContent = message;
          container.append(error);
          window.setTimeout(() => error.remove(), 5000);
        };
        polish.addEventListener('click', async () => {
          const composer = mountedComposer;
          if (!composer || activeRequestId) return;
          const inspection = adapter.inspectDraft(composer);
          if (!inspection.supported)
            return showError(failureMessage(inspection.reason));
          polish.disabled = true;
          polish.replaceChildren(
            Object.assign(document.createElement('span'), {
              className: 'spinner',
              ariaHidden: 'true',
            }),
            ' Polishing',
          );
          activeRequestId = crypto.randomUUID();
          const requestId = activeRequestId;
          const transform = (tone: Tone) =>
            requestEditorTransformation({
              protocolVersion: 1,
              requestId: crypto.randomUUID(),
              type: 'editor.transform',
              payload: { text: inspection.text, tone },
            });
          const response = await transform(selectedTone);
          if (activeRequestId !== requestId || !mountedComposer) return;
          if (!response.ok) {
            reset();
            return showError(response.error.message);
          }
          showPolishedDraftPreview({
            anchor: polish,
            originalText: inspection.text,
            suggestion: response.payload.suggestion,
            tone: selectedTone,
            primaryLabel: 'Replace draft',
            onToneChange: (tone) => {
              selectedTone = tone;
              void chrome.storage.local.set({ [TONE_STORAGE_KEY]: tone });
            },
            onPolishAgain: async (tone) => {
              const regenerated = await transform(tone);
              return regenerated.ok
                ? { ok: true, suggestion: regenerated.payload.suggestion }
                : { ok: false, message: regenerated.error.message };
            },
            onPrimary: async (replacementText) => {
              const replacement = await requestEditorReplacement({
                protocolVersion: 1,
                requestId: crypto.randomUUID(),
                type: 'editor.replace',
                payload: {
                  expectedOriginalText: inspection.text,
                  replacementText,
                },
              });
              return replacement.ok
                ? { ok: true }
                : { ok: false, message: replacement.error.message };
            },
            onClose: (reason) => {
              reset();
              if (reason === 'primary') composer.focus();
            },
          });
        });
      },
    });
    const reconcile = () => {
      const composer = adapter.locateActiveComposer();
      if (composer === mountedComposer) return;
      activeRequestId = null;
      ui.remove();
      mountedComposer = composer;
      if (mountedComposer) ui.mount();
    };
    const observer = new MutationObserver(reconcile);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
    ctx.addEventListener(window, 'wxt:locationchange', reconcile);
    ctx.onInvalidated(() => {
      observer.disconnect();
      ui.remove();
    });
    reconcile();
  },
});
