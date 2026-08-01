import { defineContentScript } from 'wxt/utils/define-content-script';
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';
import { SlackEditorAdapter } from '../src/editor/slack/slack-editor-adapter';
import { requestEditorTransformation } from '../src/messaging/editor-message-client';

const adapter = new SlackEditorAdapter();
const tones = [
  'auto',
  'neutral',
  'professional',
  'friendly',
  'casual',
  'formal',
  'polite',
  'concise',
  'confident',
  'diplomatic',
] as const;
type Tone = (typeof tones)[number];
const css = `.assistant{font:13px system-ui;color:#172033;display:flex;gap:6px;align-items:center}.assistant button,.assistant select{font:inherit;border:1px solid #475569;border-radius:5px;padding:6px 9px;background:#fff}.assistant button{cursor:pointer}.assistant .primary{background:#2563eb;color:#fff;border-color:#2563eb}.panel{width:360px;max-height:420px;overflow:auto;background:#fff;border:1px solid #94a3b8;border-radius:8px;box-shadow:0 8px 24px #0003;padding:12px}.panel p{margin:7px 0}.preview{white-space:pre-wrap;border:1px solid #cbd5e1;border-radius:5px;padding:8px;max-height:120px;overflow:auto}.error{color:#b91c1c}`;

export default defineContentScript({
  matches: ['https://app.slack.com/*'],
  runAt: 'document_idle',
  async main(ctx) {
    let mounted: HTMLElement | null = null;
    let active: string | null = null;
    let tone: Tone = 'professional';
    const saved: Record<string, unknown> = await chrome.storage.local
      .get('teams-polish-tone')
      .catch(() => ({}));
    if (tones.includes(saved['teams-polish-tone'] as Tone))
      tone = saved['teams-polish-tone'] as Tone;
    const ui = await createShadowRootUi(ctx, {
      name: 'ai-message-assistant-slack',
      position: 'inline',
      anchor: () => mounted,
      append: 'after',
      css,
      onMount(container) {
        const root = document.createElement('div');
        root.className = 'assistant';
        const select = document.createElement('select');
        select.setAttribute('aria-label', 'Writing tone');
        for (const value of tones) {
          const option = document.createElement('option');
          option.value = value;
          option.textContent = value[0]!.toUpperCase() + value.slice(1);
          option.selected = value === tone;
          select.append(option);
        }
        select.addEventListener('change', () => {
          if (tones.includes(select.value as Tone)) {
            tone = select.value as Tone;
            void chrome.storage.local.set({ 'teams-polish-tone': tone });
          }
        });
        const polish = document.createElement('button');
        polish.className = 'primary';
        polish.textContent = 'Polish with AI';
        polish.setAttribute(
          'aria-label',
          'Polish Slack draft with AI Message Assistant',
        );
        const reset = () => {
          active = null;
          polish.disabled = false;
          polish.textContent = 'Polish with AI';
          root.replaceChildren(select, polish);
        };
        const error = (message: string) => {
          const panel = document.createElement('section');
          panel.className = 'panel';
          panel.textContent = message;
          root.replaceChildren(select, polish, panel);
        };
        root.append(select, polish);
        container.append(root);
        polish.addEventListener('click', async () => {
          const composer = mounted;
          if (!composer || active) return;
          const draft = adapter.inspectDraft(composer);
          if (!draft.supported)
            return error('This Slack draft cannot be polished safely yet.');
          active = crypto.randomUUID();
          polish.disabled = true;
          polish.textContent = 'Polishing…';
          const response = await requestEditorTransformation({
            protocolVersion: 1,
            requestId: active,
            type: 'editor.transform',
            payload: { text: draft.text, tone },
          });
          if (!response.ok || !active)
            return error(
              response.ok
                ? 'The request was cancelled.'
                : response.error.message,
            );
          const panel = document.createElement('section');
          panel.className = 'panel';
          const original = document.createElement('div');
          original.className = 'preview';
          original.textContent = draft.text;
          const suggested = document.createElement('div');
          suggested.className = 'preview';
          suggested.textContent = response.payload.suggestion;
          const replace = document.createElement('button');
          replace.className = 'primary';
          replace.textContent = 'Replace draft';
          const cancel = document.createElement('button');
          cancel.textContent = 'Cancel';
          const status = document.createElement('p');
          status.className = 'error';
          panel.append(
            'Original draft',
            original,
            'Suggested draft',
            suggested,
            document.createElement('p'),
            'Only the current draft was submitted.',
            document.createElement('p'),
            replace,
            cancel,
            status,
          );
          root.replaceChildren(select, polish, panel);
          cancel.addEventListener('click', reset);
          replace.addEventListener('click', async () => {
            replace.disabled = true;
            const result = await adapter.replacePlainText(
              composer,
              draft.text,
              response.payload.suggestion,
            );
            if (!result.applied) {
              replace.disabled = false;
              status.textContent =
                result.reason === 'stale-draft'
                  ? 'Your Slack draft changed after this suggestion was created. Run the assistant again to avoid overwriting your edits.'
                  : 'The Slack draft could not be updated safely.';
              return;
            }
            reset();
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
