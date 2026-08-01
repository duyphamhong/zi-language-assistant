# AI Message Assistant — Agent Instructions

## Purpose and current phase

This repository is a Windows-first AI Message Assistant. A Chrome Manifest V3 extension improves a draft only after an explicit user action. Phase 1 established the local architecture and intentionally does **not** integrate with Slack, Microsoft Teams, or generic rich-text editors.

Before making changes, read the relevant files under `docs/`, especially:

- `docs/business/product-overview.md`
- `docs/architecture.md`
- `docs/security.md`
- `docs/native-messaging.md`

## Architecture: preserve these boundaries

```text
Extension popup/options/content script (future)
                    ↓
Manifest V3 background service worker
                    ↓ Chrome Native Messaging only
Local Node.js native host
                    ↓ HTTPS only
OpenAI Responses API
```

- `apps/extension`: WXT, React, TypeScript Manifest V3 extension.
- `apps/native-host`: local Node.js process, native-message protocol, configuration, credentials, providers, and Windows registration.
- `packages/contracts`: versioned cross-process Zod contracts. It is the source of truth for request/response types and stable error codes.
- `packages/prompts`: operation-specific prompts only; keep provider/network logic out of this package.
- `tests/native-host-integration`: real framed Native Messaging integration coverage.

The extension must communicate with the local program only through Chrome Native Messaging. Do not replace this with HTTP, WebSockets, a localhost listener, IPC alternatives, or a cloud relay.

## Mandatory security rules

1. Never put an OpenAI API key in source, `.env`, JSON configuration, browser storage, logs, tests, documentation examples, or Native Messaging messages.
2. The API key belongs only in the OS credential vault behind `SecretStore`. Do not add a plaintext fallback.
3. Keep `stdout` of the native host exclusively for length-prefixed Native Messaging frames. Diagnostics go to `stderr` or a local log file only.
4. Validate every extension message and every native message with the shared Zod schemas.
5. Keep the 64 KB Native Messaging size limit unless a documented, security-reviewed change is required.
6. Do not log original text, suggested text, OpenAI request/response bodies, authorization values, tokens, secrets, or key-like fields.
7. Do not expose an API-key-return operation, an arbitrary URL proxy, a localhost port, or wildcard native-host origins.
8. The native-host manifest must use exact `chrome-extension://<id>/` origins only.
9. Keep the model, timeout, token limit, and provider selection under local-host configuration. The extension must not choose arbitrary endpoint URLs or models.
10. The product must never send a message automatically. Replacing a draft in a future editor requires a separate explicit user action.

## Native Messaging protocol rules

- Protocol version is currently `1`; retain backward compatibility or intentionally version a breaking change.
- Requests require a `requestId`, `protocolVersion`, operation `type`, and validated payload.
- Preserve stable error codes from `packages/contracts/src/protocol.ts`; map new failures to a structured code and friendly UI text.
- Frame format is four-byte unsigned little-endian UTF-8 JSON length followed by JSON bytes.
- Process frames sequentially. Handle partial reads, combined frames, malformed JSON, oversized frames, and closed stdin without crashing.

## Phase 2 direction: editor integration

Phase 2 may add Slack and Microsoft Teams editor support. Work in this order:

1. Define the user interaction and supported editor states before adding host permissions or DOM selectors.
2. Add narrowly scoped content scripts for the supported Slack/Teams origins only; do not add generic `contenteditable` support by default.
3. Content scripts may read the active draft only after an explicit user action, then send a typed request to the background worker.
4. The background worker remains the only extension layer allowed to call `chrome.runtime.sendNativeMessage()`.
5. Return the suggestion to the content script for preview. Apply it to an editor only after the user explicitly accepts it.
6. Add browser-level tests for each supported editor flow, plus regression tests that ensure no automatic send occurs.
7. Request the smallest possible permissions and document why each is necessary.

Do not add conversation-history collection, broad host permissions, automatic corrections while typing, automatic sends, a database, user accounts, billing, telemetry, or a cloud backend unless a later approved plan explicitly changes scope.

## Development workflow

- Target Node.js 24+ and use the root pinned pnpm version through Corepack.
- Install with `corepack pnpm install` from the repository root.
- Native `keytar` is intentionally the only approved native dependency in `pnpm-workspace.yaml`. Do not broadly enable dependency build scripts.
- Build with `corepack pnpm build`.
- Run the quality gate with `corepack pnpm verify`; also run `corepack pnpm format:check` before handoff.
- Keep TypeScript strict. Do not introduce `any` except at a documented third-party boundary.
- Use ESM and preserve the separation between browser-only and Node-only code.
- Add or update proportional tests whenever behavior, protocol, credentials, transport, provider mapping, or editor interaction changes.

## Local manual test commands

```powershell
corepack pnpm build
node .\apps\native-host\dist\cli.js status
node .\apps\native-host\dist\cli.js configure --mock-mode false --model <approved-model-id>
```

For registration, use the unpacked extension ID from `chrome://extensions`:

```powershell
node .\apps\native-host\dist\cli.js install --extension-id <extension-id>
```

Reload the extension after registration or a host rebuild. Use mock mode for automated tests; live OpenAI requests are manual only and must never require a CI secret.

## Documentation and delivery

- Update `README.md` and relevant `docs/` pages when setup, security, commands, protocol, or editor support changes.
- Add an ADR for a durable architectural or security decision.
- Report tests actually run and any manual verification that was not performed.
- Do not commit, push, create a pull request, or modify user credentials unless explicitly requested.
