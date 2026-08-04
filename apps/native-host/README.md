# AI Message Assistant native host

This package installs the Windows native-messaging companion for the AI Message
Assistant Chrome Web Store extension.

## Install

Requirements: Windows, Node.js 24 or later, and Google Chrome.

```powershell
npm install --global @duyphamhong/ai-message-host
```

The package post-install step registers the native host for the production
Chrome Web Store extension. If npm was run with `--ignore-scripts`, run this
command after installation:

```powershell
ai-message-host install
```

For a developer-loaded extension, use its local extension ID explicitly:

```powershell
ai-message-host install --extension-id <extension-id>
```

## Configure

To store your OpenAI API key, run:

```powershell
ai-message-host configure
```

The key is requested interactively and stored in Windows Credential Manager.
Press `Ctrl+V` to paste from the Windows clipboard; the key remains hidden and
accidental terminal control characters are discarded.
The native host always uses the approved model configured in the application
code; it is never placed in the Chrome extension, npm configuration, or a
native message.

Use `ai-message-host status` or `ai-message-host doctor` for diagnostics.
