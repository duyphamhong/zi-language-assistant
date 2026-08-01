# Architecture

The Manifest V3 extension sends explicit user requests to its background worker,
which validates and forwards them through Chrome Native Messaging. The local Node
host validates the versioned protocol, reads non-sensitive configuration,
retrieves the API key only from the OS credential vault, and calls OpenAI over
HTTPS. No local HTTP listener exists.

Each supported chat content script is isolated from the page and uses a
platform-specific editor adapter. A scoped `MutationObserver` mounts an extension-owned Shadow DOM
control but never reads drafts. Only a click causes the adapter to inspect the
active composer. The content script sends the validated `editor.transform`
message to the background worker, which is the only extension context allowed to
call `sendNativeMessage`. Suggestions remain in memory and replacement performs
a final composer identity/text check. For the verified Teams CKEditor and
WhatsApp Lexical composers,
the background worker uses Chrome's validated main-world script execution to
select the draft, then attaches Chrome's Debugger API to the active tab only to
issue `Input.insertText`; it detaches immediately and verifies the result. Both
steps occur only after the separate Replace click and never send a message.
