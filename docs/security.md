# Security

The extension has `nativeMessaging`, `storage`, `scripting`, `debugger`, and
`clipboardWrite`
permissions plus narrowly scoped Teams and WhatsApp Web host permissions. A malicious webpage
cannot directly invoke the host; Chrome enforces the manifest's exact extension
origin. Native frames are size-limited and Zod-validated. Message text is never
logged, API keys are stored only through Windows Credential Manager, and no
API-key protocol operation exists. The host neither proxies arbitrary URLs nor
exposes localhost.

Teams and WhatsApp drafts are read only after clicking the extension-owned
assistant control.
They and suggestions remain in memory only for the active interaction; the
content script makes no network request and does not use Teams APIs, cookies, or
browser storage. A second explicit click is required to replace a draft, with a
fresh text and composer-identity check. The replacement code never clicks Send,
submits a form, or dispatches keyboard send shortcuts. Local process inspection
remains an OS-level risk; users should protect their Windows account.

The `debugger` permission is used only after the user clicks **Replace draft**.
The extension attaches to the current Teams tab, invokes Chrome DevTools Protocol
`Input.insertText` for the already-approved text, and uses Shift+Enter only when
needed to retain line breaks. It verifies the result and detaches immediately.
It never invokes Enter-only or Ctrl+Enter, clicks Send, or submits a form. It
does not use Debugger API commands to inspect network traffic, cookies, storage,
credentials, or conversation history.

For WhatsApp Web, an explicit **Copy suggested draft** click writes only the
approved suggestion to the system clipboard. The extension does not read the
previous clipboard contents, paste into WhatsApp, modify the draft, or send a
message. The `clipboardWrite` permission must be disclosed in the installation
flow and Chrome Web Store listing.
