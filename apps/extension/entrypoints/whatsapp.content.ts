import { defineContentScript } from 'wxt/utils/define-content-script';
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';
import { WhatsAppEditorAdapter } from '../src/editor/whatsapp/whatsapp-editor-adapter';
import { requestEditorTransformation } from '../src/messaging/editor-message-client';
import {
  showPolishedDraftPreview,
  toneOptions,
  type Tone,
} from '../src/ui/polished-draft-preview';

const adapter = new WhatsAppEditorAdapter();
const css = `.assistant{font:14px system-ui,sans-serif}.primary{min-height:32px;padding:6px 10px;border:1px solid Highlight;border-radius:6px;background:Highlight;color:HighlightText;cursor:pointer}.primary:disabled{opacity:.68;cursor:wait}`;
const TONE_STORAGE_KEY = 'teams-polish-tone';
const isTone = (value: unknown): value is Tone =>
  toneOptions.some(([tone]) => tone === value);
export default defineContentScript({
  matches: ['https://web.whatsapp.com/*'],
  runAt: 'document_idle',
  async main(ctx) {
    let mountedComposer: HTMLElement | null = null;
    let activeRequestId: string | null = null;
    let tone: Tone = 'professional';
    try {
      const stored = await chrome.storage.local.get(TONE_STORAGE_KEY);
      if (isTone(stored[TONE_STORAGE_KEY])) tone = stored[TONE_STORAGE_KEY];
    } catch {
      /* Keep default. */
    }
    const ui = await createShadowRootUi(ctx, {
      name: 'ai-message-assistant-whatsapp',
      position: 'inline',
      anchor: () => mountedComposer,
      append: 'after',
      css,
      isolateEvents: true,
      onMount(container) {
        const polish = document.createElement('button');
        polish.className = 'primary';
        polish.textContent = 'Polish with AI';
        polish.setAttribute(
          'aria-label',
          'Polish WhatsApp draft with AI Message Assistant',
        );
        container.append(polish);
        const reset = () => {
          activeRequestId = null;
          polish.disabled = false;
          polish.textContent = 'Polish with AI';
        };
        polish.addEventListener('click', async () => {
          const composer = mountedComposer;
          if (!composer || activeRequestId) return;
          const draft = adapter.inspectDraft(composer);
          if (!draft.supported) return;
          activeRequestId = crypto.randomUUID();
          const requestId = activeRequestId;
          polish.disabled = true;
          polish.textContent = 'Polishing';
          const transform = (selectedTone: Tone) =>
            requestEditorTransformation({
              protocolVersion: 1,
              requestId: crypto.randomUUID(),
              type: 'editor.transform',
              payload: { text: draft.text, tone: selectedTone },
            });
          const response = await transform(tone);
          if (activeRequestId !== requestId || !response.ok) {
            reset();
            return;
          }
          showPolishedDraftPreview({
            anchor: polish,
            originalText: draft.text,
            suggestion: response.payload.suggestion,
            tone,
            primaryLabel: 'Copy suggested draft',
            onToneChange: (selectedTone) => {
              tone = selectedTone;
              void chrome.storage.local.set({ [TONE_STORAGE_KEY]: tone });
            },
            onPolishAgain: async (selectedTone) => {
              const next = await transform(selectedTone);
              return next.ok
                ? { ok: true, suggestion: next.payload.suggestion }
                : { ok: false, message: next.error.message };
            },
            onPrimary: async (text) => {
              try {
                await navigator.clipboard.writeText(text);
                return {
                  ok: true,
                  close: false,
                  status:
                    'Suggested draft copied. Paste it into WhatsApp when ready.',
                };
              } catch {
                return {
                  ok: false,
                  message:
                    'The suggested draft could not be copied to your clipboard.',
                };
              }
            },
            onClose: reset,
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
