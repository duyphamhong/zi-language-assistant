/**
 * Removes characters that cannot occur in an HTTP authorization value.
 * Raw Windows terminal input can include a Ctrl+V marker before pasted text.
 */
export function sanitizeSecretInput(value: string): string {
  return Array.from(value, (character) => {
    const code = character.charCodeAt(0);
    return code <= 0x1f || (code >= 0x7f && code <= 0x9f) ? '' : character;
  })
    .join('')
    .trim();
}

export function appendClipboardSecret(
  value: string,
  clipboard: string,
): string {
  return value + sanitizeSecretInput(clipboard);
}
