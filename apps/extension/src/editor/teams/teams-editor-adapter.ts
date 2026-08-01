import type {
  DraftInspection,
  EditorAdapter,
  ReplaceResult,
} from '../core/editor-adapter';

const MAX_NATIVE_MESSAGE_BYTES = 64 * 1024;
const composerSelector = [
  '[data-tid="ckeditor"][contenteditable="true"]',
  '[data-tid="ckeditor"] [contenteditable="true"][role="textbox"]',
  '[data-tid="message-compose-box"] [contenteditable="true"][role="textbox"]',
].join(', ');

function isVisible(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    element.getClientRects().length > 0
  );
}

function containsUnsupportedStructure(composer: HTMLElement): boolean {
  return Boolean(
    composer.querySelector(
      '[data-mention-id], [data-tid*="mention"], img, video, table, pre, code, [contenteditable="false"], [data-tid*="attachment"], [data-tid*="loop"], [data-tid*="card"]',
    ),
  );
}

function textFromComposer(composer: HTMLElement): string {
  // innerText retains user-visible line breaks and does not inspect sibling chat history.
  return composer.innerText.replace(/\r\n/g, '\n');
}

function plainTextAsHtml(text: string): string {
  const escaped = text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
  return escaped.replaceAll('\n', '<br>');
}

function selectComposerContents(composer: HTMLElement): Selection | null {
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(composer);
  selection?.removeAllRanges();
  selection?.addRange(range);
  return selection;
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function fingerprint(composer: HTMLElement, text: string): string {
  // Ephemeral identity, intentionally not cryptographic and never persisted/logged.
  return `${composer.dataset.tid ?? 'teams'}:${text.length}:${text}`;
}

export class TeamsEditorAdapter implements EditorAdapter<HTMLElement> {
  readonly platform = 'teams-web' as const;

  locateActiveComposer(): HTMLElement | null {
    const candidates = [
      ...document.querySelectorAll<HTMLElement>(composerSelector),
    ].filter((candidate) => isVisible(candidate));
    return candidates.length === 1 ? (candidates[0] ?? null) : null;
  }

  inspectDraft(composer: HTMLElement): DraftInspection {
    if (
      !composer.isContentEditable ||
      composer.getAttribute('aria-disabled') === 'true' ||
      !isVisible(composer)
    )
      return { supported: false, reason: 'not-editable' };
    const candidates = [
      ...document.querySelectorAll<HTMLElement>(composerSelector),
    ].filter(isVisible);
    if (candidates.length !== 1)
      return { supported: false, reason: 'multiple-composers' };
    if (containsUnsupportedStructure(composer))
      return { supported: false, reason: 'rich-content' };
    const text = this.readPlainText(composer);
    if (!text.trim()) return { supported: false, reason: 'empty' };
    if (
      new TextEncoder().encode(text).byteLength > MAX_NATIVE_MESSAGE_BYTES ||
      text.length > 10_000
    )
      return { supported: false, reason: 'oversized' };
    return { supported: true, text, fingerprint: fingerprint(composer, text) };
  }

  readPlainText(composer: HTMLElement): string {
    return textFromComposer(composer);
  }

  async replacePlainText(
    composer: HTMLElement,
    expectedOriginalText: string,
    replacementText: string,
  ): Promise<ReplaceResult> {
    if (
      this.locateActiveComposer() !== composer ||
      this.readPlainText(composer) !== expectedOriginalText
    )
      return { applied: false, reason: 'stale-draft' };
    if (!composer.isContentEditable || !isVisible(composer))
      return { applied: false, reason: 'apply-failed' };
    composer.focus();

    // Teams uses CKEditor. Direct child replacement bypasses CKEditor's model and
    // is later overwritten by its state. This browser editing command is observed
    // by CKEditor as a normal text insertion without using a send shortcut.
    let selection = selectComposerContents(composer);
    let inserted = document.execCommand('insertText', false, replacementText);

    // Some Teams CKEditor builds reject insertText from an isolated extension
    // context but still accept the browser's HTML editing command. The content
    // is escaped first, so this remains a plain-text-only replacement.
    if (!inserted) {
      selection = selectComposerContents(composer);
      inserted = document.execCommand(
        'insertHTML',
        false,
        plainTextAsHtml(replacementText),
      );
    }
    if (!inserted) return { applied: false, reason: 'apply-failed' };

    await nextFrame();
    await nextFrame();
    if (this.readPlainText(composer) !== replacementText)
      return { applied: false, reason: 'apply-failed' };
    const endRange = document.createRange();
    endRange.selectNodeContents(composer);
    endRange.collapse(false);
    selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(endRange);
    return { applied: true };
  }
}
