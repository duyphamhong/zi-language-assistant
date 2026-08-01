# AI Message Assistant

A Windows-first Chrome extension and local native host that improves an explicitly submitted message draft. It uses Chrome Native Messaging—not a localhost server—so the extension never receives the OpenAI API key.

## Setup

Prerequisites: Node.js 24, Corepack-enabled pnpm, Google Chrome, and Windows Credential Manager.

```powershell
corepack enable
pnpm install
pnpm build
```

Load `apps/extension/.output/chrome-mv3` as an unpacked extension in `chrome://extensions`, copy its ID, then register the host:

```powershell
pnpm --filter @zi-language-assistant/native-host exec ai-message-host install --extension-id <extension-id>
pnpm --filter @zi-language-assistant/native-host exec ai-message-host status
```

The default is offline mock mode. Use the Options page for a grammar request. For a live request, run `ai-message-host configure`, enter the key when prompted, set a valid model ID with `--model`, and disable mock mode with `--mock-mode false`. The key is stored by Windows Credential Manager and never in the extension or JSON configuration.

Run `pnpm verify` for formatting, lint, types, tests, and builds. Current Phase 1 deliberately excludes Slack/Teams integration, editor injection, automatic sending, and any local HTTP API.
