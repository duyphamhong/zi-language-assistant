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

The native host starts in offline mock mode. To use an OpenAI API key, run:

```powershell
ai-message-host configure --mock-mode false --model <approved-model-id>
```

The key is requested interactively and stored in Windows Credential Manager.
It is never placed in the Chrome extension, npm configuration, or a native
message.

Use `ai-message-host status` or `ai-message-host doctor` for diagnostics.
