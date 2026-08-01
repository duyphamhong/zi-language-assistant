export const experimentalWhatsAppFullDraftReplacement = false;

export type WhatsAppDraftMutationState =
  | 'UNCHANGED'
  | 'EXPECTED'
  | 'APPENDED'
  | 'PREPENDED'
  | 'EMPTY'
  | 'PARTIAL'
  | 'UNKNOWN';

export function normalizeWhatsAppDraft(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replaceAll('\u00a0', ' ')
    .replace(/[\u200B\uFEFF]+$/g, '');
}

export function classifyWhatsAppDraftMutation(
  original: string,
  replacement: string,
  actual: string,
): WhatsAppDraftMutationState {
  const expected = normalizeWhatsAppDraft(replacement);
  const before = normalizeWhatsAppDraft(original);
  const after = normalizeWhatsAppDraft(actual);
  if (after === expected) return 'EXPECTED';
  if (after === before) return 'UNCHANGED';
  if (!after) return 'EMPTY';
  if (after === before + expected) return 'APPENDED';
  if (after === expected + before) return 'PREPENDED';
  if (before.includes(after) || expected.includes(after)) return 'PARTIAL';
  return 'UNKNOWN';
}
