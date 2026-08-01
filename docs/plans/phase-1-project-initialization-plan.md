# Phase 1 — Project Initialization and Architecture Proof

## 1. Purpose

Initialize a production-oriented monorepo for an **AI Message Assistant** that improves or translates text typed in browser-based chat applications.

The solution must contain:

1. A Chrome extension built with WXT, React, TypeScript, and Manifest V3.
2. A local Node.js companion application running on the user's machine.
3. Communication between the extension and the local companion through **Chrome Native Messaging**.
4. A secure abstraction for storing the user's OpenAI API key in the operating system credential vault.
5. A minimal end-to-end architecture proof that sends sample text from the extension to the local companion and receives a result.
6. An optional live OpenAI test when the user has configured an API key.

Phase 1 is an initialization and technical-foundation phase. It must prove that the selected architecture works before implementing Slack and Microsoft Teams editor integration.

---

## 2. Phase 1 Outcome

At the end of this phase, a developer must be able to:

1. Clone the repository.
2. Install dependencies with one package-manager command.
3. Build the Chrome extension and local native host.
4. Register the native host on Windows using the provided CLI.
5. Load the unpacked extension into Chrome.
6. Open the extension popup or options page.
7. Confirm that the extension can communicate with the native host.
8. Configure an OpenAI API key without storing it in plaintext configuration.
9. Submit a sample grammar-correction or translation request.
10. See the generated suggestion, token usage, and latency.
11. Run linting, type checking, unit tests, and integration tests successfully.

---

## 3. Scope

### 3.1 Included

- TypeScript monorepo initialization.
- pnpm workspace configuration.
- Chrome extension scaffold using WXT and React.
- Manifest V3 background service worker.
- Popup and options page shells.
- Native Messaging protocol and shared contracts.
- Local Node.js native host scaffold.
- Length-prefixed `stdin`/`stdout` Native Messaging transport.
- Windows-first native-host registration CLI.
- Configuration repository for non-sensitive settings.
- OS credential-vault abstraction for the OpenAI API key.
- OpenAI Responses API integration behind an interface.
- Mock provider for deterministic development and testing.
- Health-check, configuration-status, and improve-message operations.
- Minimal usage metadata: input tokens, output tokens, model, latency, and success status.
- Unit and integration test foundation.
- GitHub Actions CI foundation.
- Developer documentation and architecture records.

### 3.2 Explicitly excluded

Do not implement the following in Phase 1:

- Slack composer detection.
- Microsoft Teams composer detection.
- Generic `contenteditable` detection.
- Message replacement inside third-party rich-text editors.
- Injected buttons into Slack or Teams.
- Automatic correction while typing.
- Automatic message sending.
- Conversation-history collection.
- Cloud backend or hosted API.
- Express, Fastify, or any localhost HTTP server.
- User accounts or centralized authentication.
- PostgreSQL, SQLite, Redis, or another database.
- Subscription billing.
- Chrome Web Store publishing.
- Signed Windows installer.
- Full macOS or Linux native-host registration.
- Production analytics or telemetry.

Prepare extension points for these items, but do not implement them prematurely.

---

## 4. Technical Decisions

### 4.1 Runtime and package management

- Use **Node.js 24 LTS**.
- Use **pnpm workspaces**.
- Pin the package-manager version through the root `packageManager` field.
- Commit `pnpm-lock.yaml`.
- Use the latest stable dependency versions compatible with Node.js 24 at implementation time.
- Do not use floating `latest` versions in committed package manifests.

### 4.2 Language and coding rules

- Use TypeScript for all application and shared-package code.
- Enable strict TypeScript settings.
- Do not use `any` unless isolated behind a documented external-library boundary.
- Prefer explicit domain types and discriminated unions.
- Validate every cross-process message at runtime with Zod.
- Use ESM unless a packaging constraint requires a small CommonJS launcher.
- Keep browser-specific and Node-specific modules separated.

### 4.3 Extension stack

- WXT
- React
- TypeScript
- Manifest V3
- Tailwind CSS
- Radix UI primitives
- Zustand for small UI state only
- Zod for message validation

### 4.4 Native host stack

- Node.js 24 LTS
- TypeScript
- Chrome Native Messaging using `stdin` and `stdout`
- Official OpenAI JavaScript/TypeScript SDK
- Zod
- Commander for the installation/configuration CLI
- Pino for structured diagnostics written only to `stderr` or a file
- `env-paths` or an equivalent library for platform-appropriate data directories
- A credential-store adapter backed by the operating-system credential vault

### 4.5 Testing stack

- Vitest for unit tests.
- Vitest or Node child-process tests for native-host integration tests.
- React Testing Library for extension UI components.
- Playwright setup may be scaffolded, but browser automation against Slack and Teams belongs to a later phase.

---

## 5. Target Architecture

```text
┌──────────────────────────────────────────────┐
│ Chrome                                       │
│                                              │
│ Extension popup/options page                 │
│              │                               │
│              ▼                               │
│ Manifest V3 background service worker        │
│              │                               │
│              │ Chrome Native Messaging       │
└──────────────┼───────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────┐
│ Local Node.js Native Host                    │
│                                              │
│ Native message transport                     │
│ Request validation                           │
│ Request routing                              │
│ Configuration repository                     │
│ OS credential-store adapter                  │
│ Writing service                              │
│ OpenAI provider / mock provider              │
│ Usage metadata                               │
└──────────────┬───────────────────────────────┘
               │ HTTPS
               ▼
┌──────────────────────────────────────────────┐
│ OpenAI Responses API                         │
└──────────────────────────────────────────────┘
```

Important boundaries:

- The extension must never receive the raw OpenAI API key.
- The API key must never be sent through Native Messaging.
- The content of a request may be sent from the extension to the native host only after an explicit user action.
- The native host must never expose an HTTP port.
- `stdout` is reserved exclusively for the Native Messaging protocol.

---

## 6. Repository Structure

Create the following structure unless an equivalent structure already exists:

```text
ai-message-assistant/
├── apps/
│   ├── extension/
│   │   ├── entrypoints/
│   │   │   ├── background.ts
│   │   │   ├── popup/
│   │   │   │   ├── index.html
│   │   │   │   ├── main.tsx
│   │   │   │   └── App.tsx
│   │   │   └── options/
│   │   │       ├── index.html
│   │   │       ├── main.tsx
│   │   │       └── App.tsx
│   │   ├── components/
│   │   ├── services/
│   │   │   ├── native-host-client.ts
│   │   │   └── extension-message-router.ts
│   │   ├── stores/
│   │   ├── styles/
│   │   ├── wxt.config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── native-host/
│       ├── src/
│       │   ├── main.ts
│       │   ├── cli.ts
│       │   ├── native-messaging/
│       │   │   ├── frame-reader.ts
│       │   │   ├── frame-writer.ts
│       │   │   ├── message-loop.ts
│       │   │   └── request-router.ts
│       │   ├── configuration/
│       │   │   ├── config-schema.ts
│       │   │   ├── config-repository.ts
│       │   │   └── app-paths.ts
│       │   ├── credentials/
│       │   │   ├── secret-store.ts
│       │   │   ├── os-secret-store.ts
│       │   │   └── in-memory-secret-store.ts
│       │   ├── writing/
│       │   │   ├── writing-service.ts
│       │   │   ├── writing-provider.ts
│       │   │   ├── openai-writing-provider.ts
│       │   │   ├── mock-writing-provider.ts
│       │   │   └── prompt-builder.ts
│       │   ├── installation/
│       │   │   ├── native-host-manifest.ts
│       │   │   ├── windows-registrar.ts
│       │   │   └── installer-service.ts
│       │   └── logging/
│       │       └── logger.ts
│       ├── scripts/
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   ├── contracts/
│   │   ├── src/
│   │   │   ├── protocol.ts
│   │   │   ├── requests.ts
│   │   │   ├── responses.ts
│   │   │   └── errors.ts
│   │   └── package.json
│   ├── prompts/
│   │   ├── src/
│   │   │   ├── grammar.ts
│   │   │   ├── translation.ts
│   │   │   └── index.ts
│   │   └── package.json
│   └── test-fixtures/
│       ├── src/
│       └── package.json
│
├── tests/
│   └── native-host-integration/
│       ├── native-host.integration.test.ts
│       └── helpers/
│
├── docs/
│   ├── architecture.md
│   ├── development.md
│   ├── native-messaging.md
│   ├── security.md
│   └── adr/
│       ├── 0001-use-native-messaging.md
│       ├── 0002-use-os-credential-store.md
│       └── 0003-no-local-http-server.md
│
├── .github/
│   └── workflows/
│       └── ci.yml
├── .editorconfig
├── .gitignore
├── eslint.config.js
├── prettier.config.mjs
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── README.md
```

The exact structure may be refined, but application, protocol, secret-storage, OpenAI-provider, and installation concerns must remain separated.

---

## 7. Shared Native Messaging Protocol

Create a versioned protocol shared by the extension and native host.

### 7.1 General envelope

```typescript
interface NativeRequestEnvelope<TType extends string, TPayload> {
  protocolVersion: 1;
  requestId: string;
  type: TType;
  payload: TPayload;
}

interface NativeSuccessResponse<TData> {
  protocolVersion: 1;
  requestId: string;
  success: true;
  data: TData;
}

interface NativeErrorResponse {
  protocolVersion: 1;
  requestId: string;
  success: false;
  error: {
    code: string;
    message: string;
    retryable: boolean;
  };
}
```

Implement these operations:

### 7.2 `health-check`

Request payload:

```json
{}
```

Response data:

```json
{
  "status": "ok",
  "hostVersion": "0.1.0",
  "protocolVersion": 1,
  "platform": "win32"
}
```

### 7.3 `get-configuration-status`

Return only non-sensitive status information:

```json
{
  "apiKeyConfigured": true,
  "provider": "openai",
  "model": "configured-model-id",
  "mockMode": false
}
```

Never return the full API key.

### 7.4 `improve-message`

Request payload:

```json
{
  "text": "I have check this issue.",
  "operation": "grammar",
  "sourceLanguage": "auto",
  "targetLanguage": "English",
  "tone": "professional"
}
```

Allowed operations in Phase 1:

- `grammar`
- `translate`
- `professional`
- `concise`

Response data:

```json
{
  "originalText": "I have check this issue.",
  "suggestedText": "I have checked this issue.",
  "provider": "openai",
  "model": "configured-model-id",
  "usage": {
    "inputTokens": 0,
    "outputTokens": 0
  },
  "durationMs": 0
}
```

### 7.5 Error codes

Define stable error codes, including:

- `NATIVE_HOST_UNAVAILABLE`
- `INVALID_REQUEST`
- `UNSUPPORTED_PROTOCOL_VERSION`
- `API_KEY_NOT_CONFIGURED`
- `CONFIGURATION_INVALID`
- `OPENAI_AUTHENTICATION_FAILED`
- `OPENAI_RATE_LIMITED`
- `OPENAI_REQUEST_FAILED`
- `OPENAI_TIMEOUT`
- `OUTPUT_EMPTY`
- `INTERNAL_ERROR`

The UI must present friendly messages while preserving the structured error code for diagnostics.

---

## 8. Native Messaging Transport

Implement the Chrome Native Messaging framing protocol correctly.

Each message must be:

1. Serialized as UTF-8 JSON.
2. Prefixed by a 4-byte unsigned integer containing the byte length.
3. Read from `stdin` and written to `stdout`.
4. Processed sequentially for Phase 1.

Requirements:

- Correctly handle partial reads.
- Correctly handle multiple frames received in one chunk.
- Reject invalid JSON.
- Reject messages exceeding a configured size limit.
- Use a default request-size limit of 64 KB for Phase 1.
- Exit gracefully when `stdin` closes.
- Never write diagnostics to `stdout`.
- Write logs to `stderr` or an optional rotating log file.
- Include transport-level unit tests.

Support both extension communication modes at the client abstraction level:

- One-shot `chrome.runtime.sendNativeMessage()`.
- Future persistent `chrome.runtime.connectNative()`.

Use one-shot requests in the Phase 1 UI unless testing shows startup latency is unacceptable.

---

## 9. Native Host Registration

### 9.1 Host identity

Use a stable host name such as:

```text
com.appzihub.ai_message_assistant
```

Keep it configurable in one location.

### 9.2 Host manifest

Generate a manifest similar to:

```json
{
  "name": "com.appzihub.ai_message_assistant",
  "description": "AI Message Assistant local native host",
  "path": "ABSOLUTE_PATH_TO_LAUNCHER",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://DEVELOPMENT_OR_PRODUCTION_EXTENSION_ID/"
  ]
}
```

Requirements:

- Do not use wildcard origins.
- The extension ID must be supplied through CLI arguments or configuration.
- Validate that the generated manifest contains an absolute path.
- Do not place API keys in the host manifest.

### 9.3 Windows-first installer

Implement the following CLI commands:

```bash
ai-message-host install --extension-id <id>
ai-message-host uninstall
ai-message-host configure
ai-message-host status
ai-message-host doctor
ai-message-host run
```

Expected behavior:

- `install`: build or locate the launcher, generate the host manifest, and register it under the current user.
- `uninstall`: remove the current-user registration and generated manifest, but do not delete credentials unless explicitly requested.
- `configure`: securely prompt for the API key and save non-sensitive preferences.
- `status`: show registration, configuration, and credential status without revealing secrets.
- `doctor`: validate Node version, file paths, host manifest, registry entry, credential availability, and extension ID.
- `run`: start the Native Messaging message loop; this is the command used by the native-host launcher.

Target the current-user Windows registry location rather than requiring administrator privileges.

Create interfaces for macOS and Linux registration, but leave those implementations explicitly unsupported in Phase 1 with actionable errors.

---

## 10. Credential Storage

Create a `SecretStore` interface:

```typescript
interface SecretStore {
  setOpenAiApiKey(apiKey: string): Promise<void>;
  getOpenAiApiKey(): Promise<string | null>;
  deleteOpenAiApiKey(): Promise<void>;
  hasOpenAiApiKey(): Promise<boolean>;
}
```

Implementation rules:

- Use the operating system credential vault.
- On Windows, store the key in Windows Credential Manager through a maintained Node-compatible adapter.
- Keep the third-party package behind `SecretStore` so it can be replaced.
- Add an in-memory implementation for tests.
- Do not silently fall back to plaintext storage.
- If the credential vault is unavailable, return a clear error.
- Never log the key.
- Never show the full key after it is saved.
- Clear prompt variables as soon as practical.
- Use a service name and account key that are stable and documented.

The local JSON configuration must never contain `openaiApiKey`, `apiKey`, `authorization`, or another secret field.

---

## 11. Local Configuration

Store non-sensitive configuration in the OS-appropriate application data directory.

Example schema:

```json
{
  "schemaVersion": 1,
  "provider": "openai",
  "model": "configured-model-id",
  "defaultOperation": "grammar",
  "defaultSourceLanguage": "auto",
  "defaultTargetLanguage": "English",
  "defaultTone": "professional",
  "maxInputCharacters": 10000,
  "maxOutputTokens": 500,
  "requestTimeoutMs": 30000,
  "mockMode": true,
  "logging": {
    "level": "info",
    "includeMessageContent": false
  }
}
```

Requirements:

- Validate configuration with Zod.
- Apply safe defaults when no file exists.
- Use atomic file replacement when saving.
- Add `schemaVersion` from the beginning.
- Reject unknown secret-looking fields.
- Never log message text by default.
- Do not implement configuration migration beyond version 1 in this phase, but structure the repository so migrations can be added.

The model identifier must be configurable. Do not hard-code an unverified or unavailable model name.

---

## 12. OpenAI Integration

Create a provider abstraction:

```typescript
interface WritingProvider {
  improve(request: ImproveWritingRequest): Promise<ImproveWritingResult>;
}
```

Implement:

1. `MockWritingProvider`
2. `OpenAiWritingProvider`

### 12.1 Mock provider

The mock provider must:

- Return deterministic results.
- Support all four Phase 1 operations.
- Require no network or API key.
- Be the default for automated tests.
- Allow the complete extension-to-native-host flow to be demonstrated offline.

### 12.2 OpenAI provider

The OpenAI provider must:

- Use the official OpenAI JavaScript/TypeScript SDK.
- Use the Responses API.
- Retrieve the API key only from `SecretStore`.
- Read the model from local configuration.
- Set an output-token limit.
- Apply a request timeout.
- Map provider errors into stable application error codes.
- Return token usage when supplied by the API.
- Avoid sending conversation history.
- Send only the explicitly supplied draft and operation metadata.
- Return only the revised message to the extension.

### 12.3 Prompt rules

Use operation-specific prompts from the shared prompts package.

Common constraints:

- Preserve the original meaning.
- Do not invent facts.
- Do not answer the message as if participating in the conversation.
- Preserve names, URLs, ticket IDs, code, commands, file paths, numbers, and technical terms.
- Preserve line breaks where reasonable.
- Return only the revised or translated message.
- Keep the original language unless translation is requested.

Translation-specific constraints:

- Translate to the requested target language.
- Use natural workplace language.
- Preserve the original level of formality.
- Do not add explanations.

---

## 13. Chrome Extension Foundation

### 13.1 Manifest permissions

Use the minimum permissions needed in Phase 1:

```text
nativeMessaging
storage
```

Do not request Slack, Teams, `activeTab`, tabs, scripting, or broad host permissions yet unless strictly required by the implemented Phase 1 UI.

### 13.2 Background service worker

Implement a typed background message router that:

- Accepts requests only from extension-owned pages in Phase 1.
- Validates every request with Zod.
- Calls `chrome.runtime.sendNativeMessage()`.
- Maps `chrome.runtime.lastError` into `NATIVE_HOST_UNAVAILABLE` or another application error.
- Applies a client-side timeout.
- Never handles or stores the API key.

### 13.3 Popup

Create a compact status popup showing:

- Extension version.
- Native host connection status.
- API-key configured status.
- Current provider and model.
- A link to open the options page.
- A “Run health check” action.

### 13.4 Options page

Create a simple development-oriented options page with:

1. Native-host status section.
2. Setup instructions.
3. Mock-mode indication.
4. A sample text box.
5. Operation selector.
6. Source and target language fields where relevant.
7. “Improve message” button.
8. Original and suggested text areas.
9. Token usage and latency display.
10. Structured error display.

Do not implement API-key entry directly inside the extension in Phase 1. The key must be configured through the local CLI so that it never crosses the extension boundary.

### 13.5 State management

- Use local component state by default.
- Use Zustand only for shared extension UI state that genuinely needs it.
- Store only non-sensitive preferences in extension storage.
- Do not store original or corrected messages.

---

## 14. Security Requirements

Treat the following as mandatory acceptance criteria:

- No OpenAI API key in source code.
- No OpenAI API key in extension storage.
- No OpenAI API key in JSON configuration.
- No OpenAI API key in logs.
- No API-key-return operation in the Native Messaging protocol.
- No localhost HTTP listener.
- No wildcard `allowed_origins`.
- No third-party extension may invoke the native host.
- Native messages must be schema-validated.
- Native messages must have a maximum size.
- OpenAI requests must have a timeout.
- Message content must not be logged by default.
- The extension must not automatically send messages.
- The native host must use HTTPS only through the official SDK endpoint.
- The OpenAI endpoint must not be supplied by the extension.
- The model must be controlled by local configuration, not arbitrary extension input.
- Errors must not expose secrets or full provider response bodies.

Add a `docs/security.md` threat summary covering:

- Malicious web page.
- Compromised content script in future phases.
- Malicious extension attempting to access the host.
- Local process inspection.
- Accidental plaintext-secret storage.
- Prompt-content leakage through logs.
- Arbitrary URL proxying.
- Oversized-message denial of service.

---

## 15. Logging and Diagnostics

Use structured logs in the native host.

Safe fields:

- Timestamp
- Log level
- Request ID
- Operation
- Provider
- Model
- Duration
- Input token count
- Output token count
- Error code
- Success status

Forbidden fields:

- API key
- Authorization header
- Original message
- Suggested message
- Full OpenAI request
- Full OpenAI response

Requirements:

- Write diagnostics to `stderr` during Native Messaging execution.
- Support optional file logging in the platform application-data directory.
- Default `includeMessageContent` to `false` and do not implement a UI toggle in Phase 1.
- Add redaction for properties whose names contain `key`, `secret`, `token`, or `authorization`.

---

## 16. Testing Requirements

### 16.1 Unit tests

Cover at least:

- Request and response schema validation.
- Protocol-version rejection.
- Frame encoding.
- Partial frame decoding.
- Multiple frames in one input chunk.
- Oversized frame rejection.
- Invalid JSON handling.
- Configuration defaults.
- Invalid configuration rejection.
- Secret-store interface using in-memory implementation.
- Prompt generation for every operation.
- Mock provider outputs.
- OpenAI response mapping using a mocked SDK client.
- Provider error mapping.
- Background service-worker error mapping.

### 16.2 Native-host integration tests

Spawn the built native-host process and communicate through the real length-prefixed protocol.

Test:

- `health-check` succeeds.
- `get-configuration-status` succeeds.
- Mock `improve-message` succeeds.
- Invalid operation fails.
- Invalid protocol version fails.
- Process exits cleanly when input closes.
- No non-protocol text is written to `stdout`.

### 16.3 Extension component tests

Test:

- Popup renders disconnected state.
- Popup renders connected state.
- Options page submits a request.
- Loading state prevents duplicate submission.
- Suggested text renders.
- Token usage renders when available.
- Friendly error renders for missing native host.

### 16.4 Manual smoke test

Document a Windows manual test:

1. Build all packages.
2. Register the host with the unpacked extension ID.
3. Reload the extension.
4. Run health check.
5. Run a mock grammar operation.
6. Configure an API key.
7. Disable mock mode.
8. Run a live grammar operation.
9. Confirm no API key appears in extension DevTools, native logs, config file, or output.

---

## 17. Developer Experience

Create root scripts:

```json
{
  "scripts": {
    "dev": "...",
    "dev:extension": "...",
    "dev:native-host": "...",
    "build": "...",
    "build:extension": "...",
    "build:native-host": "...",
    "lint": "...",
    "format": "...",
    "format:check": "...",
    "typecheck": "...",
    "test": "...",
    "test:unit": "...",
    "test:integration": "...",
    "verify": "pnpm lint && pnpm typecheck && pnpm test && pnpm build"
  }
}
```

Requirements:

- `pnpm install` must work from the repository root.
- `pnpm verify` must provide the local quality gate.
- Avoid scripts that depend on globally installed tools.
- Add `.nvmrc` or equivalent containing Node 24.
- Add `.editorconfig`.
- Configure consistent path aliases.
- Add VS Code recommendations only when they add concrete value.

---

## 18. Continuous Integration

Create a GitHub Actions workflow that runs on pull requests and the main branch.

Minimum jobs:

1. Checkout.
2. Install Node.js 24.
3. Enable the pinned pnpm version.
4. Install dependencies with a frozen lockfile.
5. Run formatting check.
6. Run lint.
7. Run TypeScript type checking.
8. Run unit tests.
9. Run native-host integration tests.
10. Build all workspaces.
11. Upload the extension ZIP and native-host build as CI artifacts.

The CI pipeline does not need to register the native host in Chrome during Phase 1.

Never place a real OpenAI API key in CI. All automated provider tests must use mocks.

---

## 19. Documentation Requirements

### 19.1 Root README

Include:

- Product purpose.
- Architecture diagram.
- Prerequisites.
- Setup commands.
- Development workflow.
- Building the extension.
- Finding the unpacked extension ID.
- Installing the native host.
- Configuring the API key.
- Running mock mode.
- Running a live OpenAI test.
- Running tests.
- Troubleshooting.
- Phase 1 limitations.

### 19.2 Architecture documentation

Explain:

- Why Native Messaging is used.
- Why no localhost HTTP server is used.
- Why the API key remains in the native host.
- Why the key is stored in the OS credential vault.
- How shared protocol versioning works.
- How a future Slack/Teams content script will communicate through the background worker.

### 19.3 ADRs

Add the following decisions:

- ADR 0001: Use Chrome Native Messaging for extension-to-local communication.
- ADR 0002: Store the OpenAI API key in the operating-system credential vault.
- ADR 0003: Do not expose a localhost HTTP server.

---

## 20. Implementation Sequence for Codex

Implement in this order:

### Step 1 — Inspect and preserve existing repository content

- Determine whether the target repository is empty.
- Read all existing `README`, `AGENTS.md`, architecture, linting, and contribution files.
- Preserve existing requirements and conventions unless they directly conflict with this plan.
- Document any unavoidable conflict before changing existing structure.

### Step 2 — Initialize workspace

- Configure Node.js 24 and pnpm workspaces.
- Add strict TypeScript base configuration.
- Add linting, formatting, and root scripts.
- Create application and package folders.

### Step 3 — Implement shared contracts

- Define protocol version 1.
- Add Zod schemas and inferred TypeScript types.
- Add stable error codes.
- Add contract tests.

### Step 4 — Implement native transport

- Implement frame encoder and decoder.
- Implement sequential request loop.
- Route `health-check`.
- Add transport unit and integration tests.

### Step 5 — Implement configuration and secrets

- Implement application paths.
- Implement validated JSON configuration.
- Implement `SecretStore` abstraction.
- Implement Windows OS credential storage.
- Add in-memory test implementation.

### Step 6 — Implement provider abstraction

- Add prompt package.
- Add mock provider.
- Add OpenAI provider.
- Add timeout, usage mapping, and error mapping.
- Route `get-configuration-status` and `improve-message`.

### Step 7 — Implement CLI and Windows registration

- Add `install`, `uninstall`, `configure`, `status`, `doctor`, and `run`.
- Generate host manifest.
- Register under current user.
- Add tests around manifest generation and installation decisions.

### Step 8 — Initialize extension

- Scaffold WXT React extension.
- Add minimum Manifest V3 permissions.
- Add background service worker.
- Implement typed native-host client.
- Create popup and options page.

### Step 9 — Complete vertical slice

- Run health check from popup.
- Run mock improve request from options page.
- Run optional live OpenAI request after CLI configuration.
- Display output, token usage, model, and latency.

### Step 10 — Quality and documentation

- Add CI.
- Add README, architecture, security, development, and Native Messaging docs.
- Run `pnpm verify`.
- Perform the documented Windows smoke test.

---

## 21. Acceptance Criteria

Phase 1 is accepted only when all of the following are true:

### Workspace

- [ ] The repository uses pnpm workspaces.
- [ ] The project targets Node.js 24 LTS.
- [ ] TypeScript strict mode is enabled.
- [ ] The lockfile is committed.
- [ ] `pnpm verify` succeeds.

### Native host

- [ ] The host can read and write valid Native Messaging frames.
- [ ] `health-check` returns a valid protocol-versioned response.
- [ ] Invalid input returns structured errors without crashing.
- [ ] No logs are written to `stdout`.
- [ ] The host process exits cleanly.

### Registration and configuration

- [ ] The Windows CLI registers the native host for the current user.
- [ ] `doctor` identifies common installation problems.
- [ ] Non-sensitive configuration is persisted locally.
- [ ] The API key is stored in Windows Credential Manager.
- [ ] The API key is not present in extension storage or configuration files.

### Extension

- [ ] The extension builds under Manifest V3.
- [ ] The popup can run a health check.
- [ ] The options page can submit a mock improve request.
- [ ] The options page can submit an OpenAI request when configured.
- [ ] The UI handles loading, success, and error states.
- [ ] The extension never receives the API key.

### OpenAI integration

- [ ] The provider uses the official SDK and Responses API.
- [ ] The model is configurable.
- [ ] Only the submitted draft is sent.
- [ ] Output tokens are limited.
- [ ] Requests time out safely.
- [ ] Token usage is returned when available.
- [ ] Provider failures map to stable application errors.

### Tests and documentation

- [ ] Unit tests cover contracts, framing, config, prompts, and error mapping.
- [ ] Integration tests spawn the native host and use real framed messages.
- [ ] CI succeeds without an OpenAI API key.
- [ ] README contains complete Windows setup instructions.
- [ ] Security decisions and threat boundaries are documented.

---

## 22. Definition of Done

Phase 1 is done when:

1. The architecture is proven end to end on Windows and Chrome.
2. A mock request works without network access.
3. A live OpenAI request works after local API-key configuration.
4. The API key never crosses into the extension.
5. No local HTTP server exists.
6. Automated quality checks pass.
7. A new developer can reproduce the setup from the README.
8. Slack and Teams integration can be added in Phase 2 without restructuring the core protocol or native host.

---

## 23. Codex Execution Rules

- Do not implement features listed under “Explicitly excluded.”
- Do not replace Native Messaging with HTTP, WebSocket, or a cloud backend.
- Do not store secrets in `.env`, JSON, source code, extension storage, or logs.
- Do not hard-code an assumed OpenAI model name; use validated local configuration.
- Do not add a database.
- Do not add unnecessary abstractions beyond the boundaries defined in this plan.
- Keep the first implementation Windows-first, but avoid architecture that blocks later macOS and Linux support.
- Use mocks for all automated OpenAI tests.
- Preserve any existing repository standards and documentation.
- After implementation, report:
  - Files added or changed.
  - Commands to run the solution.
  - Test results.
  - Manual smoke-test result.
  - Remaining Phase 1 limitations.
  - Recommended Phase 2 entry point.

---

## 24. Reference Documentation

Codex should consult the current official documentation before implementation because APIs and package versions can change:

- WXT installation and project structure: https://wxt.dev/guide/installation
- Chrome Native Messaging: https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging
- Chrome runtime Native Messaging APIs: https://developer.chrome.com/docs/extensions/reference/api/runtime
- Node.js releases: https://nodejs.org/en/download
- pnpm workspaces: https://pnpm.io/workspaces
- OpenAI Node.js SDK: https://github.com/openai/openai-node
- OpenAI API documentation: https://platform.openai.com/docs
- Vitest: https://vitest.dev/guide/

