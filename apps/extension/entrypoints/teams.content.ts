import { defineContentScript } from 'wxt/utils/define-content-script';
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';
import { TeamsEditorAdapter } from '../src/editor/teams/teams-editor-adapter';
import {
  requestEditorReplacement,
  requestEditorTransformation,
} from '../src/messaging/editor-message-client';

const css = `
  .assistant { font: 13px system-ui,sans-serif; color:#172033; display:flex; gap:6px; align-items:center; }
  button { font:inherit; border:1px solid #475569; border-radius:5px; padding:6px 9px; background:#fff; color:#172033; cursor:pointer; }
  select { font:inherit; border:1px solid #475569; border-radius:5px; padding:6px; background:#fff; color:#172033; }
  button.primary { background:#2563eb; color:#fff; border-color:#2563eb; } button:disabled { opacity:.6; cursor:wait; }
  .panel { width:360px; max-height:420px; overflow:auto; background:#fff; border:1px solid #94a3b8; border-radius:8px; box-shadow:0 8px 24px #0003; padding:12px; }
  .panel p { margin:7px 0; } .preview { white-space:pre-wrap; border:1px solid #cbd5e1; border-radius:5px; padding:8px; max-height:120px; overflow:auto; }
  .error { color:#b91c1c; } .privacy { color:#475569; font-size:12px; }
`;
const adapter = new TeamsEditorAdapter();
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
    'not-editable': 'The current Teams composer is not editable.',
    'rich-content':
      'This draft contains Teams content that cannot be replaced safely yet.',
    'multiple-composers': 'Use the assistant with one active Teams composer.',
    oversized: 'This draft is too large to process safely.',
  };
  return messages[reason] ?? 'This Teams editor state is not supported yet.';
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
      // The selector still works with the safe professional default.
    }
    const ui = await createShadowRootUi(ctx, {
      name: 'ai-message-assistant-teams',
      position: 'inline',
      anchor: () => mountedComposer,
      append: 'after',
      css,
      isolateEvents: true,
      onMount(container) {
        const root = document.createElement('div');
        root.className = 'assistant';
        const polish = document.createElement('button');
        polish.type = 'button';
        polish.className = 'primary';
        polish.setAttribute(
          'aria-label',
          'Polish draft with AI Message Assistant',
        );
        polish.textContent = 'Polish with AI';
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
        root.append(tone, polish);
        container.append(root);

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
          close.addEventListener('click', () =>
            root.replaceChildren(tone, polish),
          );
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
            activeRequestId = null;
            polish.disabled = false;
            polish.textContent = 'Polish with AI';
            showError(response.error.message);
            return;
          }
          const preview = document.createElement('section');
          preview.className = 'panel';
          const original = document.createElement('div');
          original.className = 'preview';
          original.textContent = inspection.text;
          const suggestion = document.createElement('div');
          suggestion.className = 'preview';
          suggestion.textContent = response.payload.suggestion;
          const replace = document.createElement('button');
          replace.type = 'button';
          replace.className = 'primary';
          replace.textContent = 'Replace draft';
          const close = document.createElement('button');
          close.type = 'button';
          close.textContent = 'Cancel';
          const status = document.createElement('p');
          status.className = 'error';
          preview.append(
            'Original draft',
            original,
            'Suggested draft',
            suggestion,
            document.createElement('p'),
            'Only the current draft was submitted.',
            document.createElement('p'),
            'Replacing uses Chrome input only after you click Replace draft. It never sends your Teams message.',
            document.createElement('p'),
            replace,
            close,
            status,
          );
          root.replaceChildren(tone, polish, preview);
          close.addEventListener('click', () => {
            activeRequestId = null;
            polish.disabled = false;
            polish.textContent = 'Polish with AI';
            root.replaceChildren(tone, polish);
          });
          replace.addEventListener('click', async () => {
            replace.disabled = true;
            const result = await requestEditorReplacement({
              protocolVersion: 1,
              requestId: crypto.randomUUID(),
              type: 'editor.replace',
              payload: {
                expectedOriginalText: inspection.text,
                replacementText: response.payload.suggestion,
              },
            });
            if (!result.ok) {
              replace.disabled = false;
              status.textContent = result.error.message;
              return;
            }
            activeRequestId = null;
            polish.disabled = false;
            polish.textContent = 'Polish with AI';
            root.replaceChildren(tone, polish);
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
