# Phase 2 — Microsoft Teams Chat Integration Plan

## 1. Purpose

Implement the first in-editor integration for **Microsoft Teams for Web** while preserving the secure Phase 1 architecture.

The user must be able to:

1. Write a draft in a supported Microsoft Teams chat composer.
2. Explicitly invoke AI Message Assistant.
3. Choose a supported operation.
4. Preview the suggested text.
5. Explicitly accept or reject the replacement.
6. Review and send the final message manually through Teams.

The extension must never inspect drafts continuously, replace text automatically, or send a Teams message.

---

## 2. Phase 2 objective

Deliver a production-quality, narrowly scoped integration for **plain-text drafts in Microsoft Teams web chat composers**.

Phase 2 covers:

- Microsoft Teams for Web in Google Chrome.
- One-to-one chat composers.
- Group chat composers that use the same verified editor behavior.
- Grammar correction.
- Translation.
- Professional-tone rewriting.
- Concise rewriting.
- Suggestion preview.
- Explicit draft replacement.
- Mock-mode automated tests.
- Manual smoke testing against the live Teams web client.

Slack integration remains deferred to a later phase or a separate Phase 2B plan.

---

## 3. Supported origins

Add content-script matches only for the verified Microsoft Teams web origins:

```text
https://teams.microsoft.com/*
https://teams.cloud.microsoft/*
```

Do not add:

```text
<all_urls>
*://*/*
https://*.microsoft.com/*
```

Before final handoff, confirm through manual testing which origin or origins are actually required for the target Teams account and deployment. Remove any origin that is not needed.

---

## 4. Explicitly supported editor state

The first release should support only a normal, visible, enabled chat composer containing a plain-text draft.

A draft is eligible only when all of the following are true:

- A verified Teams chat composer is active.
- The editor is visible and editable.
- The draft contains non-whitespace text.
- The text is within the existing 64 KB native-message safety limit after contract serialization.
- The editor does not contain unsupported rich structures.
- No request is already running for the same composer.

Treat the following as unsupported in Phase 2:

- Empty drafts.
- Channel post and announcement editors unless separately verified and approved.
- Meeting chat if its editor behavior differs from the supported adapter.
- Mentions or mention chips.
- Attachments.
- Images, GIFs, stickers, or embedded cards.
- Loop components.
- Tables.
- Code blocks or complex rich formatting.
- Multiple simultaneously active composers.
- Read-only or disabled composers.
- Drafts changed after a suggestion request was started.

For unsupported content, show a clear local UI message and do not send the draft to the native host.

---

## 5. User experience

### 5.1 Assistant control

Inject one clearly visible AI Message Assistant control near the currently supported Teams composer.

Requirements:

- Use an extension-owned icon and accessible label.
- Do not imitate the Teams Send button.
- Do not cover Teams controls.
- Show the control only when a supported composer is present.
- Rebind safely when Teams changes chat routes without a full page reload.
- Remove the control when its composer is removed.
- Prevent duplicate controls after DOM rerenders.

Recommended accessibility label:

```text
Improve draft with AI Message Assistant
```

### 5.2 Invocation flow

1. The user clicks the assistant control.
2. The extension validates the current composer state.
3. The extension reads the current draft only at this point.
4. A small operation picker appears.
5. The user selects one operation.
6. For translation, the user selects a configured target language from a constrained list or existing Phase 1 setting.
7. The content script sends a validated extension message to the background worker.
8. The background worker sends the existing validated transformation request to the native host.
9. The content script displays a preview when the response arrives.

Do not read the draft on page load, focus, typing, selection change, MutationObserver callbacks, or timer callbacks.

### 5.3 Preview

The preview UI should be extension-owned and rendered in an isolated Shadow DOM.

Display:

- Requested operation.
- Original draft.
- Suggested draft.
- Translation target language when applicable.
- Character count when useful.
- A concise privacy note stating that only the current draft was submitted.
- Replace button.
- Cancel button.
- Retry action for recoverable errors.

The suggestion must remain editable only through Teams after replacement. Do not build a second message editor inside the preview in this phase.

### 5.4 Explicit replacement

Replacement must require a separate click on **Replace draft**.

Before applying the suggestion:

1. Re-read the active composer.
2. Compare it with the original draft snapshot captured for the request.
3. Verify that the composer identity is unchanged.
4. Verify that the composer is still visible and editable.
5. Abort replacement if any check fails.

If the user changed the draft while waiting, display:

```text
Your Teams draft changed after this suggestion was created. Run the assistant again to avoid overwriting your edits.
```

After replacement:

- Keep focus in the composer.
- Place the caret at the end when safe.
- Leave the preview visible long enough to show success, or close it according to the existing extension interaction convention.
- Never click Send.
- Never dispatch Enter, Ctrl+Enter, or any Teams send shortcut.
- Never submit a form.

---

## 6. Architecture

Preserve the existing Phase 1 data flow:

```text
Teams content script
        ↓ chrome.runtime messaging
Manifest V3 background service worker
        ↓ chrome.runtime.sendNativeMessage()
Local Node.js native host
        ↓ HTTPS
OpenAI Responses API
```

Rules:

- The Teams content script must not call the native host directly.
- The content script must not know, receive, or store the OpenAI API key.
- The content script must not call OpenAI or any remote endpoint.
- The background worker remains the only extension context that calls `sendNativeMessage()`.
- Reuse the existing native request and response flow whenever possible.
- Do not add HTTP, WebSockets, localhost listeners, cloud relays, databases, or telemetry.

---

## 7. Proposed extension structure

Adapt names to the repository’s existing conventions after inspection.

```text
apps/extension/
├─ entrypoints/
│  ├─ background.ts or background/
│  └─ teams.content/
│     ├─ index.tsx
│     ├─ TeamsAssistantRoot.tsx
│     └─ teams-content.css
├─ src/
│  ├─ editor/
│  │  ├─ core/
│  │  │  ├─ EditorAdapter.ts
│  │  │  ├─ EditorDraft.ts
│  │  │  └─ editor-errors.ts
│  │  └─ teams/
│  │     ├─ TeamsEditorAdapter.ts
│  │     ├─ teams-composer-locator.ts
│  │     ├─ teams-draft-reader.ts
│  │     ├─ teams-draft-writer.ts
│  │     └─ teams-rich-content-detector.ts
│  ├─ messaging/
│  │  ├─ extension-message-client.ts
│  │  └─ extension-message-router.ts
│  └─ ui/
│     ├─ OperationPicker.tsx
│     ├─ SuggestionPreview.tsx
│     ├─ AssistantButton.tsx
│     └─ editor-ui-state.ts
└─ tests/
   ├─ unit/
   ├─ fixtures/teams/
   └─ browser/
```

Do not create a generic editor implementation that automatically supports arbitrary `contenteditable` elements. The shared editor interface exists to isolate platform-specific behavior, not to claim generic compatibility.

---

## 8. Editor adapter contract

Introduce a narrow platform adapter similar to:

```ts
interface EditorAdapter {
  readonly platform: 'teams-web';

  locateActiveComposer(): SupportedComposer | null;
  inspectDraft(composer: SupportedComposer): DraftInspection;
  readPlainText(composer: SupportedComposer): string;
  replacePlainText(
    composer: SupportedComposer,
    expectedOriginalText: string,
    replacementText: string,
  ): ReplaceResult;
}
```

`DraftInspection` should classify the composer before any host request:

```ts
type DraftInspection =
  | { supported: true; text: string; fingerprint: string }
  | {
      supported: false;
      reason:
        | 'empty'
        | 'not-editable'
        | 'rich-content'
        | 'multiple-composers'
        | 'oversized'
        | 'unknown-editor-state';
    };
```

The fingerprint should be local and ephemeral. It may combine the composer instance identity and original plain text, but it must not be stored or logged.

---

## 9. Teams DOM integration strategy

Microsoft Teams is a single-page application whose DOM may rerender without navigation. Implement the adapter defensively.

### 9.1 Selector discovery

Before coding final selectors:

1. Inspect a live Teams web chat composer using Chrome DevTools.
2. Record a sanitized DOM fixture without message content, tenant data, account data, or identifiers.
3. Identify stable accessibility attributes, roles, editor semantics, or structural anchors.
4. Avoid generated CSS class names and positional selectors.
5. Verify the same locator in one-to-one and group chat.
6. Document the verified editor states and rejected states.

Use a small ordered selector strategy rather than a single fragile selector. Every located node must pass semantic validation before use.

### 9.2 SPA lifecycle

Use a scoped `MutationObserver` only to detect composer creation, replacement, and removal.

The observer must not read or record draft text.

Responsibilities:

- Mount the assistant control when a supported composer appears.
- Unmount when the composer disappears.
- Prevent duplicate mounting.
- Re-evaluate after Teams route changes or rerenders.
- Disconnect cleanly when the WXT content-script context is invalidated.

Avoid continuous polling. A bounded fallback check may be used only if Teams lifecycle behavior cannot be handled reliably with observation.

### 9.3 Isolated UI

Use WXT’s Shadow Root content-script UI mechanism so Teams styles do not corrupt the assistant UI and extension styles do not leak into Teams.

Keep the content script in the isolated world unless a proven editor-writing limitation requires a narrowly reviewed main-world bridge. Do not inject main-world code by default.

### 9.4 Reading text

Read only the active supported composer and normalize conservatively:

- Preserve line breaks.
- Preserve Unicode characters.
- Do not trim meaningful leading or trailing content during replacement.
- Use trimming only to determine whether the draft is empty.
- Do not read nearby chat history, quoted messages, participant names, channel data, or hidden DOM.

### 9.5 Writing text

Implement replacement using the smallest DOM interaction compatible with Teams’ editor state management.

The writer must:

- Update the editor through the editor behavior verified during discovery.
- Dispatch only the minimum input/change events needed for Teams to recognize the new draft.
- Never dispatch keyboard events associated with sending.
- Verify the resulting composer text.
- Return a structured failure if the write is not reflected accurately.
- Avoid modifying adjacent composer controls or DOM.

Do not use clipboard injection unless the repository owner explicitly approves it after security and UX review.

---

## 10. Contracts and messaging

### 10.1 Extension-internal message

Add a Zod-validated request for content-script-to-background communication. Reuse the existing transformation operation schema rather than duplicating operation strings.

Conceptual request:

```ts
{
  type: 'editor.transform';
  requestId: string;
  protocolVersion: 1;
  payload: {
    operation: 'grammar' | 'translate' | 'professional' | 'concise';
    text: string;
    targetLanguage?: string;
  };
}
```

Conceptual response:

```ts
{
  type: 'editor.transform.result';
  requestId: string;
  protocolVersion: 1;
  ok: boolean;
  payload?: {
    suggestion: string;
    operation: string;
    metadata?: ExistingSafeResponseMetadata;
  };
  error?: {
    code: StableErrorCode;
    message: string;
    retryable: boolean;
  };
}
```

Requirements:

- Validate at the content-script boundary.
- Validate again in the background worker.
- Validate the native-host response before returning it.
- Keep `requestId` unchanged end to end.
- Reject unknown message types.
- Do not pass platform, tenant, conversation, user, or URL metadata to the native host.
- Do not add a new native protocol version unless an actual breaking change is required.

### 10.2 Background routing

Extend the existing background message router to:

1. Accept messages only from the extension’s own content scripts.
2. Validate the request.
3. Map the request to the existing native-host transformation contract.
4. Call `chrome.runtime.sendNativeMessage()`.
5. Map known native-host failures to stable extension errors.
6. Return the validated response to the requesting content script.

Do not allow the content script to specify:

- Native host name.
- Provider endpoint.
- Model ID.
- API key.
- Timeout.
- Arbitrary prompt.
- Arbitrary request type.

---

## 11. State management

Use an explicit UI state machine:

```text
idle
→ operation-selection
→ validating-draft
→ requesting
→ preview
→ applying
→ applied
```

Failure states:

```text
unsupported-draft
native-host-unavailable
configuration-required
provider-error
request-timeout
invalid-response
stale-draft
apply-failed
```

Rules:

- One active request per composer.
- Disable duplicate submission while requesting.
- Ignore stale responses whose `requestId` no longer matches the active request.
- Cancel or discard preview state when the associated composer is removed.
- Never persist original or suggested text in browser storage.
- Keep draft and suggestion only in memory for the active UI lifecycle.

---

## 12. Security and privacy requirements

Phase 2 must preserve all Phase 1 security rules.

Mandatory checks:

- No API key in extension source, messages, storage, logs, tests, or documentation.
- No draft or suggestion in logs.
- No message content in analytics or telemetry; do not add analytics.
- No conversation-history access.
- No use of Teams APIs, Microsoft Graph, cookies, auth tokens, local storage, or session storage.
- No network request from the content script.
- No broad host permissions.
- No automatic correction while typing.
- No automatic replacement.
- No automatic send.
- No draft persistence.
- No arbitrary `contenteditable` scanning.
- No hidden background collection.

Add a regression test that fails if the extension code calls `fetch`, `XMLHttpRequest`, or WebSocket from the Teams content-script bundle.

---

## 13. Error handling and UI messages

Map errors to short, actionable messages without exposing secrets or raw provider responses.

Examples:

| Condition | User-facing behavior |
|---|---|
| Empty draft | “Write a draft before using the assistant.” |
| Unsupported rich content | “This draft contains Teams content that cannot be replaced safely yet.” |
| Draft too large | “This draft is too large to process safely.” |
| Native host missing | Reuse Phase 1 installation guidance. |
| API key missing | Reuse Phase 1 credential configuration guidance. |
| Request timeout | “The request timed out. Your Teams draft was not changed.” |
| Provider failure | Show mapped friendly error and keep original draft unchanged. |
| Draft changed | Require a new request; never overwrite. |
| Apply verification failed | Restore or leave the current draft unchanged when possible and show a failure. |

Do not display native stack traces, raw provider bodies, authorization data, filesystem paths containing user information, or unvalidated error strings.

---

## 14. Testing strategy

### 14.1 Unit tests

Add unit coverage for:

- Composer locator accepts the verified Teams fixture.
- Locator rejects unrelated `contenteditable` elements.
- Plain-text draft reading preserves line breaks and Unicode.
- Empty draft detection.
- Rich-content detection.
- Oversized request rejection.
- Replacement succeeds for supported fixture.
- Replacement verifies final text.
- Replacement aborts when original text changed.
- Replacement aborts when composer instance changed.
- Duplicate assistant controls are not mounted.
- Composer removal cleans up UI and observers.
- No draft is read during passive DOM observation.

### 14.2 Contract tests

Cover:

- Valid editor transformation request.
- Invalid operation.
- Missing request ID.
- Unsupported protocol version.
- Oversized payload.
- Unknown response type.
- Request/response correlation.
- Stable error mapping.
- Platform metadata is not forwarded to the native host.

### 14.3 Background integration tests

Using mock mode:

- Content-script request reaches the background worker.
- Background worker validates and sends the native message.
- Mock native-host response returns to the correct caller.
- Native-host unavailable error is mapped correctly.
- Malformed native response is rejected.
- Concurrent requests remain correlated.

### 14.4 Browser-level extension tests

Use Playwright with a test extension build and sanitized Teams composer fixtures.

A test-only WXT configuration may match a local fixture origin. Production builds must retain only the approved Teams origins.

Required flows:

1. Assistant control appears beside a supported composer.
2. No draft text is read or sent before user invocation.
3. User invokes grammar correction.
4. Preview shows original and mock suggestion.
5. Cancel leaves the Teams draft unchanged.
6. Replace updates the draft but does not send it.
7. Editing the draft while waiting causes stale-draft protection.
8. Rich content is rejected before native messaging.
9. Teams SPA rerender remounts exactly one control.
10. Native-host error leaves the draft unchanged.

### 14.5 No-automatic-send regression suite

Instrument the fixture Send button and composer events.

Assert that the extension never:

- Clicks the Send button.
- Dispatches Enter.
- Dispatches Ctrl+Enter.
- Dispatches Meta+Enter.
- Submits a form.
- Calls a Teams send API.
- Sends a message after replacement.

This suite is a release-blocking gate.

### 14.6 Manual Teams smoke tests

Perform on Windows with Chrome and the locally registered native host.

Test matrix:

- `teams.microsoft.com` if reachable for the target account.
- `teams.cloud.microsoft` if used by the target account.
- One-to-one chat.
- Group chat.
- Multiline plain-text draft.
- Vietnamese-to-English translation.
- English grammar correction.
- Professional rewrite.
- Concise rewrite.
- Cancel.
- Replace.
- User edits during request.
- Chat route change while preview is open.
- Mock mode.
- One manually approved live OpenAI request.

Record unsupported editor variants instead of silently expanding support.

---

## 15. Documentation changes

Update:

- `README.md`
  - Teams web support status.
  - Required Chrome permissions.
  - Setup and verification steps.
  - Supported and unsupported draft types.
- `docs/business/product-overview.md`
  - Mark the exact Phase 2 capability after implementation.
- `docs/architecture.md`
  - Add content-script and editor-adapter flow.
- `docs/security.md`
  - Document explicit invocation, ephemeral text handling, and no-send guarantees.
- `docs/native-messaging.md`
  - Document any reused or extended contracts without exposing content examples.
- `docs/editor-integrations/teams.md`
  - Supported origins.
  - Supported editor states.
  - Selector strategy.
  - Sanitized fixture process.
  - Known limitations.
  - Manual test matrix.
- `docs/plans/phase-2-teams-chat-integration-plan.md`
  - Store this plan in the repository.

Create an ADR only if implementation requires a durable architectural or security decision, such as a main-world bridge or clipboard-based writing. Neither should be introduced by default.

---

## 16. Implementation work breakdown

### Workstream 1 — Repository and Teams discovery

- Read all repository documentation required by `AGENTS.md`.
- Inspect current extension messaging and Phase 1 transformation UI.
- Identify reusable contracts, operation definitions, error mapping, and React components.
- Inspect the live Teams web chat composer.
- Produce sanitized DOM fixtures.
- Document supported and unsupported editor states.

**Exit criteria:** the team can identify the supported composer without relying on generated CSS classes.

### Workstream 2 — Contracts and message routing

- Add extension-internal Zod contracts.
- Reuse native transformation contracts.
- Add background routing.
- Add request correlation and stable error mapping.
- Add contract and router tests.

**Exit criteria:** a synthetic content-script request can reach mock mode and return a validated suggestion.

### Workstream 3 — Teams editor adapter

- Implement composer lifecycle detection.
- Implement semantic composer validation.
- Implement plain-text reader.
- Implement rich-content rejection.
- Implement guarded plain-text writer.
- Implement post-write verification.
- Add unit tests against sanitized fixtures.

**Exit criteria:** the adapter can safely read and replace plain text in supported fixtures and rejects unsafe states.

### Workstream 4 — Content-script UI

- Add WXT Teams content-script entrypoint.
- Add Shadow DOM UI.
- Mount assistant control near the supported composer.
- Add operation picker.
- Add loading and error states.
- Add original/suggestion preview.
- Add explicit Replace and Cancel actions.
- Add stale-draft protection.

**Exit criteria:** the complete mock flow works in the browser fixture without automatic replacement or send.

### Workstream 5 — Security and regression hardening

- Verify exact host permissions.
- Verify no content-script network access.
- Verify no browser storage persistence.
- Verify no draft/suggestion logging.
- Add no-automatic-send tests.
- Add malformed response and stale-response tests.

**Exit criteria:** all security and no-send tests pass.

### Workstream 6 — Live Teams verification and documentation

- Run the manual test matrix.
- Fix verified compatibility issues without broadening scope.
- Document supported origins and limitations.
- Update README and architecture/security documentation.
- Record tests actually executed.

**Exit criteria:** plain-text one-to-one Teams chat works in mock mode and in one manually approved live-provider test.

---

## 17. Acceptance criteria

Phase 2 is complete only when all of the following are true:

1. The extension injects a single accessible assistant control into a verified Teams web chat composer.
2. The extension reads the draft only after explicit user invocation.
3. Only the current plain-text draft and requested operation are submitted.
4. The content script communicates only with the background service worker.
5. The background service worker remains the only extension layer using Native Messaging.
6. The extension never receives the OpenAI API key.
7. The user can preview the original and suggested text.
8. Replacement requires a separate explicit action.
9. Cancel leaves the draft unchanged.
10. A changed draft is never overwritten.
11. Unsupported rich content is rejected before processing.
12. Replacing a draft never sends the Teams message.
13. No draft or suggestion is stored or logged.
14. Production host permissions are limited to verified Teams origins.
15. Unit, contract, integration, browser, and no-send regression tests pass.
16. `corepack pnpm build` passes.
17. `corepack pnpm verify` passes.
18. `corepack pnpm format:check` passes.
19. README and relevant documentation are updated.
20. Any unperformed live verification is reported explicitly at handoff.

---

## 18. Required Codex execution instructions

Codex must:

1. Read `AGENTS.md` and all required repository documentation before changing code.
2. Inspect the existing implementation before choosing file names or adding contracts.
3. Reuse Phase 1 components and contracts where appropriate.
4. Keep TypeScript strict and avoid `any` except at documented third-party boundaries.
5. Use ESM and preserve browser/Node package separation.
6. Keep the Teams implementation platform-specific.
7. Add proportional tests with every behavioral change.
8. Run the complete repository quality gate before handoff.
9. Report changed files, tests run, manual tests run, and remaining limitations.
10. Do not commit, push, publish, register credentials, or create a pull request unless explicitly requested.

---

## 19. Suggested handoff report

At completion, provide:

```text
Implementation summary
- ...

Supported Teams states
- ...

Unsupported Teams states
- ...

Security/privacy verification
- ...

Automated tests run
- ...

Manual tests run
- ...

Commands run
- corepack pnpm build
- corepack pnpm verify
- corepack pnpm format:check

Known limitations
- ...

Files changed
- ...
```

Do not describe Phase 2 as generic rich-text editor support. Describe it as verified support for the explicitly tested Microsoft Teams web chat composer states.
