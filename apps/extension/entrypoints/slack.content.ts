import { defineContentScript } from 'wxt/utils/define-content-script';
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';
import { SlackEditorAdapter } from '../src/editor/slack/slack-editor-adapter';
import { requestEditorTransformation } from '../src/messaging/editor-message-client';
import {
  showPolishedDraftPreview,
  toneOptions,
  type Tone,
} from '../src/ui/polished-draft-preview';

const adapter = new SlackEditorAdapter();
const css = `.assistant{font:14px system-ui,sans-serif}.primary{min-height:32px;padding:6px 10px;border:1px solid Highlight;border-radius:6px;background:Highlight;color:HighlightText;cursor:pointer}.primary:disabled{opacity:.68;cursor:wait}`;
const TONE_STORAGE_KEY = 'teams-polish-tone';
const isTone = (value: unknown): value is Tone =>
  toneOptions.some(([tone]) => tone === value);

export default defineContentScript({
  matches: ['https://app.slack.com/*'],
  runAt: 'document_idle',
  async main(ctx) {
    let mounted: HTMLElement | null = null;
    let active: string | null = null;
    let tone: Tone = 'professional';
    const saved: Record<string, unknown> = await chrome.storage.local
      .get(TONE_STORAGE_KEY)
      .catch(() => ({}));
    if (isTone(saved[TONE_STORAGE_KEY])) tone = saved[TONE_STORAGE_KEY];
    const ui = await createShadowRootUi(ctx, {
      name: 'ai-message-assistant-slack',
      position: 'inline',
      anchor: () => mounted,
      append: 'after',
      css,
      isolateEvents: true,
      onMount(container) {
        const polish = document.createElement('button');
        polish.className = 'primary';
        polish.textContent = 'Polish with AI';
        polish.setAttribute(
          'aria-label',
          'Polish Slack draft with AI Message Assistant',
        );
        container.append(polish);
        const reset = () => {
          active = null;
          polish.disabled = false;
          polish.textContent = 'Polish with AI';
        };
        polish.addEventListener('click', async () => {
          const composer = mounted;
          if (!composer || active) return;
          const draft = adapter.inspectDraft(composer);
          if (!draft.supported) return;
          active = crypto.randomUUID();
          const requestId = active;
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
          if (active !== requestId || !response.ok) {
            reset();
            return;
          }
          showPolishedDraftPreview({
            anchor: polish,
            originalText: draft.text,
            suggestion: response.payload.suggestion,
            tone,
            primaryLabel: 'Replace draft',
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
              const result = await adapter.replacePlainText(
                composer,
                draft.text,
                text,
              );
              return result.applied
                ? { ok: true }
                : {
                    ok: false,
                    message:
                      result.reason === 'stale-draft'
                        ? 'Your Slack draft changed after this suggestion was created. Run the assistant again to avoid overwriting your edits.'
                        : 'The Slack draft could not be updated safely.',
                  };
            },
            onClose: reset,
          });
        });
      },
    });
    const reconcile = () => {
      const next = adapter.locateActiveComposer();
      if (next === mounted) return;
      active = null;
      ui.remove();
      mounted = next;
      if (mounted) ui.mount();
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
