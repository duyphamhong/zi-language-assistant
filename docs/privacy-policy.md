# Privacy Policy — AI Message Assistant

**Effective date:** August 2, 2026

AI Message Assistant is a Chrome extension and Windows local companion that
helps users improve message drafts in supported web chat editors. This policy
explains how the extension and its native host handle user data.

## Data we process

AI Message Assistant processes only the information necessary to provide its
writing-improvement feature:

- The current message draft after the user explicitly selects **Polish with
  AI**.
- The writing tone selected by the user, such as Professional or Friendly.

The extension does not automatically inspect drafts, collect conversation
history, monitor browsing activity, or send messages on the user's behalf.

## How we use data

The selected draft is used solely to generate a requested writing suggestion,
such as grammar correction, clarity improvement, or professional polishing.

The user reviews the suggestion before deciding whether to replace or copy it.
The extension never automatically edits or sends a message.

## Sharing with an AI provider

When the user configures and enables the live AI-provider mode, the selected
draft is sent from the user's local native host to the configured OpenAI
service over HTTPS, solely to generate the requested suggestion. OpenAI's
handling of that request is subject to the user's agreement with OpenAI and
its applicable privacy terms.

We do not operate a cloud backend for message storage. We do not sell, rent,
use, or transfer user data for advertising, profiling, analytics, or any
purpose unrelated to the extension's user-facing writing-improvement feature.

## Storage and retention

The original draft and generated suggestion remain in memory only for the
active interaction and are not stored as message history by the extension or
native host.

The selected writing tone may be stored locally in Chrome extension storage to
remember the user's preference. No draft text or generated suggestion is saved
there.

## API keys

The Chrome extension does not receive, store, or transmit OpenAI API keys.
The local native host stores an API key only in Windows Credential Manager on
the user's device. The key is not placed in the extension, browser storage,
configuration files, native-messaging messages, or logs.

## Permissions

- **nativeMessaging** communicates with the user-installed local native host.
- **storage** stores the user's writing-tone preference locally.
- **scripting** and **debugger** are used only after explicit user actions to
  safely identify and replace an approved draft in Microsoft Teams.
- **clipboardWrite** is used only after a user chooses to copy an approved
  suggestion on WhatsApp Web.
- Host permissions are limited to the supported chat sites and are used only
  to show the extension control and process the current draft after explicit
  user action.

## Security

The extension uses Chrome Native Messaging rather than a local HTTP server.
Message text is not logged by the extension or native host. The extension does
not access browser cookies, account credentials, or network traffic.

## Your choices

You can stop using the extension at any time by uninstalling it. You can clear
the locally stored writing-tone preference in Chrome's extension settings. You
can remove the API key from Windows Credential Manager through the local native
host's configuration process.

## Contact

For privacy questions, contact: **[duyphamhong@gmail.com]**.
