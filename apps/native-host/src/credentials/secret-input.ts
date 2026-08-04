/**
 * Removes characters that cannot occur in an HTTP authorization value.
 * Raw Windows terminal input can include a Ctrl+V marker before pasted text.
 */
export function sanitizeSecretInput(value: string): string {
  return value.replace(/[\u0000-\u001F\u007F-\u009F]/g, '').trim();
}

export function appendClipboardSecret(
  value: string,
  clipboard: string,
): string {
  return value + sanitizeSecretInput(clipboard);
}
