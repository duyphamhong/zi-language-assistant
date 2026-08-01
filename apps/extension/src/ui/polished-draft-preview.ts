export const toneOptions = [
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

export type Tone = (typeof toneOptions)[number][0];

export type PreviewActionResult =
  | { ok: true; close?: boolean; status?: string }
  | { ok: false; message: string };

export interface PolishedDraftPreviewOptions {
  anchor: HTMLElement;
  originalText: string;
  suggestion: string;
  tone: Tone;
  primaryLabel: string;
  onToneChange(tone: Tone): void;
  onPrimary(text: string): Promise<PreviewActionResult>;
  onClose(reason: 'cancel' | 'primary'): void;
  onPolishAgain?(
    tone: Tone,
  ): Promise<{ ok: true; suggestion: string } | { ok: false; message: string }>;
}

const css = `
  :host { all: initial !important; }
  .assistant { --surface: Canvas; --text: CanvasText; --muted: color-mix(in srgb, CanvasText 64%, Canvas); --border: color-mix(in srgb, CanvasText 18%, Canvas); --subtle: color-mix(in srgb, Highlight 9%, Canvas); --accent: Highlight; --accent-text: HighlightText; color: var(--text); font: 14px/1.4 system-ui, -apple-system, "Segoe UI", sans-serif; }
  button, select, textarea { font: inherit; } button, select { min-height: 32px; padding: 6px 10px; border: 1px solid var(--border); border-radius: 6px; background: var(--surface); color: var(--text); cursor: pointer; } button:hover:not(:disabled) { background: var(--subtle); } button:focus-visible, select:focus-visible, textarea:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; } button:disabled { cursor: wait; opacity: .68; }
  .popover { box-sizing: border-box; position: fixed; z-index: 2147483647; width: min(460px, calc(100vw - 24px)); max-height: min(520px, calc(100vh - 24px)); overflow: auto; padding: 14px; border: 1px solid var(--border); border-radius: 12px; background: var(--surface); box-shadow: 0 12px 30px color-mix(in srgb, CanvasText 20%, transparent); }
  .header, .footer, .result-actions { display: flex; align-items: center; gap: 8px; } .header { min-height: 32px; } .sparkle { color: var(--accent); font-size: 22px; line-height: 1; } .title { margin: 0; font-size: 17px; font-weight: 650; } .tone { max-width: 132px; padding: 5px 8px; border-radius: 999px; background: var(--subtle); color: var(--accent); font-weight: 600; } .close { width: 32px; margin-left: auto; padding: 0; border-color: transparent; background: transparent; font-size: 24px; line-height: 1; }
  .result { box-sizing: border-box; width: 100%; min-height: 128px; max-height: 250px; resize: none; overflow: auto; margin-top: 14px; padding: 13px; border: 1px solid var(--border); border-radius: 8px; background: var(--surface); color: var(--text); line-height: 1.5; } .result-actions { justify-content: space-between; margin-top: 8px; } .link-button { min-height: 28px; padding: 3px 4px; border-color: transparent; background: transparent; color: var(--accent); }
  .original, .diff { margin-top: 10px; padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px; background: var(--subtle); white-space: pre-wrap; overflow-wrap: anywhere; } .diff del { text-decoration: line-through; } .diff ins { text-decoration: none; background: var(--subtle); }
  .status { margin: 14px 0; color: var(--muted); } .footer { justify-content: flex-end; } .primary { border-color: var(--accent); background: var(--accent); color: var(--accent-text); } .error { margin: 12px 0; color: var(--text); } .spinner { display: inline-block; width: 13px; height: 13px; border: 2px solid color-mix(in srgb, currentColor 32%, transparent); border-top-color: currentColor; border-radius: 50%; animation: spin .75s linear infinite; vertical-align: -2px; } @keyframes spin { to { transform: rotate(360deg); } } @media (prefers-reduced-motion: reduce) { .spinner { animation: none; } }
`;

function place(popover: HTMLElement, anchor: HTMLElement): void {
  const margin = 12;
  const bounds = anchor.getBoundingClientRect();
  const width = Math.min(460, window.innerWidth - margin * 2);
  popover.style.width = `${width}px`;
  const height = Math.min(
    popover.offsetHeight,
    window.innerHeight - margin * 2,
  );
  popover.style.left = `${Math.max(margin, Math.min(bounds.left, window.innerWidth - width - margin))}px`;
  popover.style.top = `${Math.max(margin, bounds.top - height - 8 >= margin ? bounds.top - height - 8 : Math.min(window.innerHeight - height - margin, bounds.bottom + 8))}px`;
}

function resize(textarea: HTMLTextAreaElement): void {
  textarea.style.height = 'auto';
  textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, 128), 250)}px`;
}

function appendDiff(
  target: HTMLElement,
  original: string,
  suggestion: string,
): void {
  const before = original.split(/(\s+)/);
  const after = suggestion.split(/(\s+)/);
  let start = 0;
  while (
    start < before.length &&
    start < after.length &&
    before[start] === after[start]
  )
    start += 1;
  let endBefore = before.length;
  let endAfter = after.length;
  while (
    endBefore > start &&
    endAfter > start &&
    before[endBefore - 1] === after[endAfter - 1]
  ) {
    endBefore -= 1;
    endAfter -= 1;
  }
  target.append(before.slice(0, start).join(''));
  if (start < endBefore) {
    const removed = document.createElement('del');
    removed.textContent = before.slice(start, endBefore).join('');
    target.append(removed);
  }
  if (start < endAfter) {
    const added = document.createElement('ins');
    added.textContent = after.slice(start, endAfter).join('');
    target.append(added);
  }
  target.append(before.slice(endBefore).join(''));
}

export function showPolishedDraftPreview(
  options: PolishedDraftPreviewOptions,
): void {
  const host = document.createElement('ai-message-assistant-preview');
  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = css;
  const root = document.createElement('div');
  root.className = 'assistant';
  shadow.append(style, root);
  document.body.append(host);
  const popover = document.createElement('section');
  popover.className = 'popover';
  popover.setAttribute('role', 'dialog');
  popover.setAttribute('aria-label', 'Polished draft');
  const header = document.createElement('header');
  header.className = 'header';
  const sparkle = document.createElement('span');
  sparkle.className = 'sparkle';
  sparkle.textContent = '✦';
  sparkle.setAttribute('aria-hidden', 'true');
  const title = document.createElement('h2');
  title.className = 'title';
  title.textContent = 'Polished draft';
  const tone = document.createElement('select');
  tone.className = 'tone';
  tone.setAttribute('aria-label', 'Selected writing tone');
  for (const [value, label] of toneOptions) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    option.selected = value === options.tone;
    tone.append(option);
  }
  const close = document.createElement('button');
  close.className = 'close';
  close.textContent = '×';
  close.setAttribute('aria-label', 'Close polished draft');
  header.append(sparkle, title, tone, close);
  const result = document.createElement('textarea');
  result.className = 'result';
  result.value = options.suggestion;
  result.setAttribute('aria-label', 'Editable polished draft');
  const actions = document.createElement('div');
  actions.className = 'result-actions';
  const changes = document.createElement('button');
  changes.className = 'link-button';
  changes.textContent = '✦ Show changes';
  changes.hidden = result.value === options.originalText;
  const originalToggle = document.createElement('button');
  originalToggle.className = 'link-button';
  originalToggle.textContent = 'View original';
  originalToggle.setAttribute('aria-expanded', 'false');
  actions.append(changes, originalToggle);
  const status = document.createElement('p');
  status.className = 'status';
  status.textContent = '🔒 Your message has not been sent.';
  const footer = document.createElement('footer');
  footer.className = 'footer';
  const again = document.createElement('button');
  again.textContent = 'Polish again';
  again.hidden = !options.onPolishAgain;
  const cancel = document.createElement('button');
  cancel.textContent = 'Cancel';
  const primary = document.createElement('button');
  primary.className = 'primary';
  primary.textContent = options.primaryLabel;
  footer.append(again, cancel, primary);
  popover.append(header, result, actions, status, footer);
  root.append(popover);
  place(popover, options.anchor);
  requestAnimationFrame(() => place(popover, options.anchor));
  resize(result);
  result.focus();
  const reposition = () => place(popover, options.anchor);
  window.addEventListener('resize', reposition);
  window.addEventListener('scroll', reposition, true);
  const closePreview = (reason: 'cancel' | 'primary') => {
    window.removeEventListener('resize', reposition);
    window.removeEventListener('scroll', reposition, true);
    host.remove();
    options.onClose(reason);
  };
  const showError = (message: string) => {
    const previousElement = footer.previousElementSibling;
    if (previousElement?.classList.contains('error')) {
      previousElement.remove();
    }
    const error = document.createElement('p');
    error.className = 'error';
    error.textContent = message;
    footer.before(error);
    reposition();
  };
  close.addEventListener('click', () => closePreview('cancel'));
  cancel.addEventListener('click', () => closePreview('cancel'));
  popover.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closePreview('cancel');
    }
  });
  result.addEventListener('input', () => resize(result));
  tone.addEventListener('change', () => {
    if (toneOptions.some(([value]) => value === tone.value))
      options.onToneChange(tone.value as Tone);
  });
  let original: HTMLElement | undefined;
  let diff: HTMLElement | undefined;
  originalToggle.addEventListener('click', () => {
    if (original) {
      original.remove();
      original = undefined;
      originalToggle.textContent = 'View original';
      originalToggle.setAttribute('aria-expanded', 'false');
    } else {
      original = document.createElement('div');
      original.className = 'original';
      original.textContent = options.originalText;
      actions.after(original);
      originalToggle.textContent = 'Hide original';
      originalToggle.setAttribute('aria-expanded', 'true');
    }
    reposition();
  });
  changes.addEventListener('click', () => {
    if (diff) {
      diff.remove();
      diff = undefined;
      changes.textContent = '✦ Show changes';
    } else {
      diff = document.createElement('div');
      diff.className = 'diff';
      appendDiff(diff, options.originalText, result.value);
      actions.after(diff);
      changes.textContent = 'Hide changes';
    }
    reposition();
  });
  again.addEventListener('click', async () => {
    if (!options.onPolishAgain || again.disabled) return;
    again.disabled = true;
    tone.disabled = true;
    primary.disabled = true;
    again.replaceChildren(
      Object.assign(document.createElement('span'), {
        className: 'spinner',
        ariaHidden: 'true',
      }),
      'Polishing',
    );
    const regenerated = await options.onPolishAgain(tone.value as Tone);
    again.disabled = false;
    tone.disabled = false;
    primary.disabled = false;
    again.replaceChildren('Polish again');
    if (!regenerated.ok) return showError(regenerated.message);
    result.value = regenerated.suggestion;
    resize(result);
    diff?.remove();
    diff = undefined;
    changes.hidden = result.value === options.originalText;
    changes.textContent = '✦ Show changes';
    reposition();
    result.focus();
  });
  primary.addEventListener('click', async () => {
    if (primary.disabled) return;
    primary.disabled = true;
    const action = await options.onPrimary(result.value);
    if (!action.ok) {
      primary.disabled = false;
      showError(action.message);
      return;
    }
    if (action.status) status.textContent = action.status;
    if (action.close !== false) closePreview('primary');
    else primary.disabled = false;
  });
}
