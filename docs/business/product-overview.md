# AI Message Assistant — Business and Product Overview

## Product purpose

AI Message Assistant helps people improve a message before they send it in browser-based workplace chat tools. Its initial value is quick, private, user-controlled writing assistance for grammar, translation, professional tone, and concision.

The product is not a chatbot, a customer-support system, or an autonomous messaging tool. It improves the wording of a draft that the user explicitly chooses to submit for assistance.

## User problem

People frequently write short workplace messages in a non-native language, under time pressure, or with an unclear tone. They need help correcting grammar and expressing themselves clearly without switching to a separate writing application, exposing a broad conversation history, or giving an extension access to their OpenAI API key.

## Target users

- Professionals who write English or multilingual workplace messages.
- Users who want a final grammar, clarity, or tone check before sending.
- Privacy-conscious users who bring their own OpenAI API key and want it to remain on their own machine.

## Core user journey

1. The user writes a draft in a supported chat editor.
2. The user explicitly invokes AI Message Assistant.
3. The product sends only the selected/current draft and requested operation to the local native host.
4. The product shows a suggestion and its metadata.
5. The user decides whether to use the suggestion.
6. The user remains responsible for reviewing and sending the final message.

The product must never silently inspect drafts, continuously collect message content, automatically edit text, or send a message.

## Product principles

### User control first

Every message-improvement request and every future draft replacement must follow an explicit user action. Suggestions are advisory; the user has final control.

### Privacy by architecture

The extension never receives or stores the OpenAI API key. The native host retrieves the key from the operating-system credential vault and communicates with OpenAI over HTTPS. The product sends no conversation history and does not run a cloud backend.

### Minimal data handling

Only the draft necessary for the requested transformation may leave the extension, and only after the user asks. Do not add analytics, telemetry, remote logging, message history, or database persistence without an approved product and privacy decision.

### Focused workplace writing quality

The initial supported transformations are:

- Grammar correction
- Translation
- Professional-tone rewriting
- Concise rewriting

Suggestions must preserve meaning and technical details. They must not invent facts, answer as a participant in the conversation, or add explanations to the revised message.

## Current Phase 1 capability

Phase 1 proves the secure architecture through an extension popup/options page and a local native host. It supports offline mock mode and an optional live OpenAI request when configured locally.

Phase 1 does not yet read or write Slack, Microsoft Teams, or any web editor. A successful mock grammar result confirms the technical path; it does not mean an AI model was called.

## Phase 2 business objective

Phase 2 should bring the same user-controlled workflow into supported Slack and Microsoft Teams message composers:

- The user invokes the assistant from a clearly visible control.
- The product reads only the current draft after that action.
- The user previews the result.
- The user explicitly accepts any replacement.
- The product never sends the message on the user's behalf.

Support should be narrowly implemented and tested per editor. Do not claim generic support for arbitrary `contenteditable` elements unless this becomes an approved product requirement.

## Out of scope unless explicitly approved

- Automatic correction while typing
- Automatic send or scheduled messaging
- Conversation-history capture
- Inbox or channel monitoring
- User accounts, subscriptions, or billing
- Cloud backend, database, or centralized storage
- Sharing user messages with third parties beyond the configured AI provider
- Analytics containing message content or secrets

## Success criteria

The product succeeds when a user can improve a draft quickly, understand what will be sent for processing, trust that their API key is not exposed to the extension, and retain complete control over accepting and sending the final message.
