# ADR 0004: Use validated main-world execution for Teams CKEditor replacement

Teams uses CKEditor, whose document model does not reliably accept writes from
an isolated extension content script. The content script remains isolated for
composer discovery, draft reading, UI, and all native-host communication.

After the user explicitly clicks **Replace draft**, it sends a Zod-validated
internal `editor.replace` request to the background worker. The worker validates
the extension sender and request, then uses Chrome `scripting.executeScript` in
the current Teams tab's main world. The injected function is narrowly limited to
one verified Teams composer and rechecks and selects the original text.

Teams accepts browser-trusted text input only, so the worker then attaches
Chrome's Debugger API to that one tab, invokes the fixed `Input.insertText`
command for each approved text segment, and uses Shift+Enter only to preserve
the requested line breaks. It detaches in a `finally` block and verifies the
resulting text in the main world. It does not call the native host, make network
requests, inspect network or storage data, click Send, dispatch Enter-only or
Ctrl+Enter shortcuts, or submit a form. The `debugger` permission must be
disclosed in the installation flow and Chrome Web Store listing.

This avoids a page-observable custom-event bridge, which could let a webpage
forge a replacement request.
