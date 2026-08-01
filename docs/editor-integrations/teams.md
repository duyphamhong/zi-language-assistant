# Microsoft Teams for Web

## Scope

The implementation is limited to a single visible, enabled, plain-text Teams chat composer
on `https://teams.microsoft.com/*`, `https://teams.cloud.microsoft/*`, and
`https://teams.live.com/*`. It is
not generic `contenteditable` support. Channel posts, meeting variants that do
not share the verified behavior, multiple composers, and disabled editors are
rejected.

## Locator strategy

The adapter accepts only proposed Teams semantic `data-tid` composer markers paired with
an editable textbox. It never relies on generated class names or positional
selectors. It accepts `data-tid="ckeditor"` and message-compose
container variants, then requires exactly one visible candidate. Mutation
observation only detects lifecycle changes; it does not read draft text.

The `teams.live.com` composer was verified against the `data-tid="ckeditor"`,
editable textbox marker. Confirm the same behavior in the targeted one-to-one
and group chat states before release. Capture a sanitized fixture containing no
tenant, account, or message data if adjustment is needed.

## Supported and unsupported drafts

Plain text, line breaks, and Unicode are retained. Empty drafts and drafts over
the native safety limit are rejected. Mentions, attachments, images, GIFs,
stickers, cards, Loop components, tables, code blocks, and non-editable embedded
content are rejected before native messaging.

For the verified `teams.live.com` CKEditor composer, replacement selects the
active composer contents, then uses Chrome's `debugger` API to invoke
browser-trusted `Input.insertText` for each text segment and Shift+Enter to
retain requested line breaks. The extension attaches only after the user chooses
**Replace draft**, verifies the resulting text, and detaches immediately. It
does not inspect network traffic, cookies, storage, or conversation history; it
does not click Send, invoke Enter-only or Ctrl+Enter, or submit a form.

## Manual verification matrix

After registering the built host and reloading the unpacked extension, test each
Teams origin used by the account, one-to-one and group chat, multiline English
text, professional-polish suggestions, cancel, replacement, edited-while-waiting
protection, route changes, mock mode, and one manually approved live request.
Confirm the Send button is never clicked
and no Enter, Ctrl+Enter, Meta+Enter, or form submit is dispatched.
