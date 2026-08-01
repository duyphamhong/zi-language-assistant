# Slack Web

The Slack Web integration is limited to one visible, plain-text new-message composer at `https://app.slack.com/*`. It recognizes Slack's semantic `data-qa="texty_input"` and `data-feat="composer"` textbox markers, reads a draft only after **Polish with AI** is clicked, then shows a preview and requires a second explicit **Replace draft** click. Replacement uses Slack's normal editable-composer command and does not attach Chrome's debugger. It never sends a Slack message.

Slack edit-message, attachment, and rich-content composer modes are rejected. Manual validation is required for direct messages, channels, multiline text, cancellation, changed-draft protection, and verification that no send shortcut is dispatched.
