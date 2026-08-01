import { defineContentScript } from 'wxt/utils/define-content-script';
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';
import { WhatsAppEditorAdapter } from '../src/editor/whatsapp/whatsapp-editor-adapter';
import { requestEditorTransformation } from '../src/messaging/editor-message-client';

const css = `
  .assistant { font: 13px system-ui,sans-serif; color:#172033; display:flex; gap:6px; align-items:center; }
  button, select { font:inherit; border:1px solid #475569; border-radius:5px; padding:6px 9px; background:#fff; color:#172033; }
  button { cursor:pointer; } button.primary { background:#2563eb; color:#fff; border-color:#2563eb; } button:disabled { opacity:.6; cursor:wait; }
  .panel { width:360px; max-height:420px; overflow:auto; background:#fff; border:1px solid #94a3b8; border-radius:8px; box-shadow:0 8px 24px #0003; padding:12px; }
  .panel p { margin:7px 0; } .preview { white-space:pre-wrap; border:1px solid #cbd5e1; border-radius:5px; padding:8px; max-height:120px; overflow:auto; }
  .error { color:#b91c1c; } .status { color:#166534; }
`;
const adapter = new WhatsAppEditorAdapter();
const TONE_STORAGE_KEY = 'teams-polish-tone';
const toneOptions = [
  ['auto', 'Auto'],
  ['neutral', 'Neutral'],
  ['professional', 'Professional'],
  ['friendly', 'Friendly'],
  ['casual', 'Casual'],
  ['formal', 'Formal'],
  ['polite', 'Polite'],
  ['concise', 'Concise'],
  ['confident', 'Confident'],
  ['diplomatic', 'Diplomatic'],
] as const;
type Tone = (typeof toneOptions)[number][0];

function isTone(value: unknown): value is Tone {
  return toneOptions.some(([tone]) => tone === value);
}

function failureMessage(reason: string): string {
  const messages: Record<string, string> = {
    empty: 'Write a draft before using the assistant.',
    'not-editable': 'The current WhatsApp composer is not editable.',
    'rich-content':
      'This draft contains WhatsApp content that cannot be replaced safely yet.',
    'multiple-composers':
      'Use the assistant with one active WhatsApp composer.',
    oversized: 'This draft is too large to process safely.',
  };
  return messages[reason] ?? 'This WhatsApp editor state is not supported yet.';
}

export default defineContentScript({
  matches: ['https://web.whatsapp.com/*'],
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
      // The selector still works with the safe professional default.
    }
    const ui = await createShadowRootUi(ctx, {
      name: 'ai-message-assistant-whatsapp',
      position: 'inline',
      anchor: () => mountedComposer,
      append: 'after',
      css,
      isolateEvents: true,
      onMount(container) {
        const root = document.createElement('div');
        root.className = 'assistant';
        const tone = document.createElement('select');
        tone.setAttribute('aria-label', 'Writing tone');
        for (const [value, label] of toneOptions) {
          const option = document.createElement('option');
          option.value = value;
          option.textContent = label;
          option.selected = value === selectedTone;
          tone.append(option);
        }
        tone.addEventListener('change', () => {
          if (!isTone(tone.value)) return;
          selectedTone = tone.value;
          void chrome.storage.local.set({ [TONE_STORAGE_KEY]: selectedTone });
        });
        const polish = document.createElement('button');
        polish.type = 'button';
        polish.className = 'primary';
        polish.setAttribute(
          'aria-label',
          'Polish WhatsApp draft with AI Message Assistant',
        );
        polish.textContent = 'Polish with AI';
        root.append(tone, polish);
        container.append(root);

        const reset = () => {
          activeRequestId = null;
          polish.disabled = false;
          polish.textContent = 'Polish with AI';
          root.replaceChildren(tone, polish);
        };
        const showError = (message: string) => {
          const panel = document.createElement('section');
          panel.className = 'panel';
          const error = document.createElement('p');
          error.className = 'error';
          error.textContent = message;
          const close = document.createElement('button');
          close.type = 'button';
          close.textContent = 'Close';
          panel.append(error, close);
          root.replaceChildren(tone, polish, panel);
          close.addEventListener('click', reset);
        };

        polish.addEventListener('click', async () => {
          const composer = mountedComposer;
          if (!composer || activeRequestId) return;
          const inspection = adapter.inspectDraft(composer);
          if (!inspection.supported) {
            showError(failureMessage(inspection.reason));
            return;
          }
          polish.disabled = true;
          polish.textContent = 'Polishing…';
          activeRequestId = crypto.randomUUID();
          const requestId = activeRequestId;
          const response = await requestEditorTransformation({
            protocolVersion: 1,
            requestId,
            type: 'editor.transform',
            payload: { text: inspection.text, tone: selectedTone },
          });
          if (activeRequestId !== requestId || !mountedComposer) return;
          if (!response.ok) {
            polish.disabled = false;
            polish.textContent = 'Polish with AI';
            activeRequestId = null;
            showError(response.error.message);
            return;
          }
          const panel = document.createElement('section');
          panel.className = 'panel';
          const original = document.createElement('div');
          original.className = 'preview';
          original.textContent = inspection.text;
          const suggestion = document.createElement('div');
          suggestion.className = 'preview';
          suggestion.textContent = response.payload.suggestion;
          const copy = document.createElement('button');
          copy.type = 'button';
          copy.className = 'primary';
          copy.textContent = 'Copy suggested draft';
          const cancel = document.createElement('button');
          cancel.type = 'button';
          cancel.textContent = 'Cancel';
          const status = document.createElement('p');
          status.className = 'error';
          panel.append(
            'Original draft',
            original,
            'Suggested draft',
            suggestion,
            document.createElement('p'),
            'Only the current draft was submitted.',
            document.createElement('p'),
            'Copy the suggestion, then paste it into WhatsApp when ready. The extension never sends your message.',
            document.createElement('p'),
            copy,
            cancel,
            status,
          );
          root.replaceChildren(tone, polish, panel);
          cancel.addEventListener('click', reset);
          copy.addEventListener('click', async () => {
            copy.disabled = true;
            try {
              await navigator.clipboard.writeText(response.payload.suggestion);
              status.className = 'status';
              status.textContent =
                'Suggested draft copied. Paste it into WhatsApp when ready.';
            } catch {
              status.className = 'error';
              status.textContent =
                'The suggested draft could not be copied to your clipboard.';
              copy.disabled = false;
            }
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
