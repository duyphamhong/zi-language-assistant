import type {
  DraftInspection,
  EditorAdapter,
  ReplaceResult,
} from '../core/editor-adapter';

const MAX_NATIVE_MESSAGE_BYTES = 64 * 1024;
const composerSelector =
  'div[role="textbox"][contenteditable="true"][data-lexical-editor="true"][data-tab="10"]';

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
      'img, video, table, pre, code, [contenteditable="false"], [data-lexical-decorator], [data-icon], [data-testid*="attachment"]',
    ),
  );
}

function textFromComposer(composer: HTMLElement): string {
  return composer.innerText.replace(/\r\n/g, '\n');
}

function fingerprint(composer: HTMLElement, text: string): string {
  return `whatsapp:${composer.dataset.tab ?? 'composer'}:${text.length}:${text}`;
}

export class WhatsAppEditorAdapter implements EditorAdapter<HTMLElement> {
  readonly platform = 'whatsapp-web' as const;

  locateActiveComposer(): HTMLElement | null {
    const candidates = [
      ...document.querySelectorAll<HTMLElement>(composerSelector),
    ].filter(isVisible);
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

  prepareReplacement(
    composer: HTMLElement,
    expectedOriginalText: string,
  ): ReplaceResult {
    if (
      this.locateActiveComposer() !== composer ||
      this.readPlainText(composer) !== expectedOriginalText
    )
      return { applied: false, reason: 'stale-draft' };
    if (!composer.isContentEditable || !isVisible(composer))
      return { applied: false, reason: 'apply-failed' };

    composer.focus();
    // Keep this synchronous with the user's click. It establishes Lexical's
    // own selection model; a DOM Range does not do that reliably.
    return document.execCommand('selectAll', false)
      ? { applied: true }
      : { applied: false, reason: 'apply-failed' };
  }

  async replacePlainText(
    composer: HTMLElement,
    expectedOriginalText: string,
    replacementText: string,
  ): Promise<ReplaceResult> {
    void composer;
    void expectedOriginalText;
    void replacementText;
    // Chrome's debugger-backed trusted insertion is coordinated by the
    // background worker. prepareReplacement establishes the native selection.
    return { applied: false, reason: 'apply-failed' };
  }
}
