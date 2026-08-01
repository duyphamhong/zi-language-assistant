export type DraftInspection =
  | { supported: true; text: string; fingerprint: string }
  | {
      supported: false;
      reason:
        | 'empty'
        | 'not-editable'
        | 'rich-content'
        | 'multiple-composers'
        | 'oversized'
        | 'unknown-editor-state';
    };

export type ReplaceResult =
  | { applied: true }
  | { applied: false; reason: 'stale-draft' | 'apply-failed' };

export interface EditorAdapter<TComposer extends Element> {
  readonly platform: 'teams-web' | 'whatsapp-web';
  locateActiveComposer(): TComposer | null;
  inspectDraft(composer: TComposer): DraftInspection;
  readPlainText(composer: TComposer): string;
  replacePlainText(
    composer: TComposer,
    expectedOriginalText: string,
    replacementText: string,
  ): Promise<ReplaceResult>;
}
