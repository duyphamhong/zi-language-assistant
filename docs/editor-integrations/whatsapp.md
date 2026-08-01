# WhatsApp Web

## Scope

The integration is limited to one visible, enabled, plain-text WhatsApp Web chat
composer at `https://web.whatsapp.com/*`. It is not generic contenteditable
support. The verified composer is a Lexical editor with `role="textbox"`,
`data-lexical-editor="true"`, and `data-tab="10"`.

## Safety

The draft is read only after an explicit click on **Polish with AI**. The
extension rejects unsupported rich content and requires a second explicit click
to copy the suggested draft. The copied text is held only in the system
clipboard; the user pastes it into the WhatsApp composer and remains in control
of sending. The extension never writes to the WhatsApp composer, clicks Send,
or invokes Enter-only or Ctrl+Enter.
