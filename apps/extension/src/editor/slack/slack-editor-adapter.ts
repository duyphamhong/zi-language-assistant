import type {
  DraftInspection,
  EditorAdapter,
  ReplaceResult,
} from '../core/editor-adapter';

const MAX_NATIVE_MESSAGE_BYTES = 64 * 1024;
const composerSelector =
  '[data-qa="texty_input"][data-feat="composer"][contenteditable="true"][role="textbox"]';

function visible(element: HTMLElement): boolean {
  const style = getComputedStyle(element);
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    element.getClientRects().length > 0
  );
}

export class SlackEditorAdapter implements EditorAdapter<HTMLElement> {
  readonly platform = 'slack-web' as const;

  locateActiveComposer(): HTMLElement | null {
    const composers = [
      ...document.querySelectorAll<HTMLElement>(composerSelector),
    ].filter(visible);
    return composers.length === 1 ? (composers[0] ?? null) : null;
  }

  inspectDraft(composer: HTMLElement): DraftInspection {
    if (
      !composer.isContentEditable ||
      composer.getAttribute('aria-disabled') === 'true' ||
      !visible(composer)
    )
      return { supported: false, reason: 'not-editable' };
    if (this.locateActiveComposer() !== composer)
      return { supported: false, reason: 'multiple-composers' };
    if (
      composer.querySelector(
        'img, video, table, pre, code, [contenteditable="false"], [data-qa*="attachment"]',
      )
    )
      return { supported: false, reason: 'rich-content' };
    const text = this.readPlainText(composer);
    if (!text.trim()) return { supported: false, reason: 'empty' };
    if (
      new TextEncoder().encode(text).byteLength > MAX_NATIVE_MESSAGE_BYTES ||
      text.length > 10_000
    )
      return { supported: false, reason: 'oversized' };
    return {
      supported: true,
      text,
      fingerprint: `slack:${text.length}:${text}`,
    };
  }

  readPlainText(composer: HTMLElement): string {
    return composer.innerText.replace(/\r\n/g, '\n');
  }

  async replacePlainText(
    composer: HTMLElement,
    expected: string,
    replacement: string,
  ): Promise<ReplaceResult> {
    if (
      this.locateActiveComposer() !== composer ||
      this.readPlainText(composer) !== expected
    )
      return { applied: false, reason: 'stale-draft' };
    composer.focus();
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(composer);
    selection?.removeAllRanges();
    selection?.addRange(range);
    if (!document.execCommand('insertText', false, replacement))
      return { applied: false, reason: 'apply-failed' };
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
    return this.readPlainText(composer) === replacement
      ? { applied: true }
      : { applied: false, reason: 'apply-failed' };
  }
}
