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

## Microsoft Teams for Web

Phase 2 adds narrowly scoped Teams web chat integration at `teams.microsoft.com`,
`teams.cloud.microsoft`, and `teams.live.com`, plus WhatsApp Web at
`web.whatsapp.com`. In a supported plain-text chat composer, click **Polish with
AI**, review the preview, then explicitly choose
**Replace draft**. The extension never sends a chat message.

Only a visible, enabled, single plain-text composer is supported. Mentions,
attachments, images, cards, Loop components, tables, code blocks, and other
rich content are rejected locally before any request is sent. The draft is held
only in memory for the active interaction. Chrome requires the `debugger`
permission to make Teams accept the explicitly approved replacement; it is used
only for that one text insertion, then detached immediately. Reload the
extension after building and accept the updated permission.

The Teams integration has one workplace-polish action. It uses the documented
English-editor system prompt to correct errors and rewrite awkward phrasing into
clear, natural professional language while preserving meaning and technical details.
Choose the desired writing tone before polishing; **Professional** is the default
and the selection is stored locally in the extension for future Teams sessions.
The configured GPT-5.6 model uses its default sampling behavior because custom
temperature values are not accepted for this workflow; the extension cannot
change sampling parameters.

Run `pnpm verify` for formatting, lint, types, tests, and builds. The extension
uses Chrome Native Messaging only; it does not expose a local HTTP API.
