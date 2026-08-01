# Native Messaging

Frames are UTF-8 JSON prefixed by a four-byte little-endian unsigned byte length. The default maximum request is 64 KB. `stdout` contains frames only; diagnostics must use `stderr`. Register the host with `ai-message-host install --extension-id <Chrome-extension-ID>`.

Teams uses the existing `improve-message` native request with its compatible
grammar operation fixed by the background worker. Its content-script to
background `editor.transform` contract is separately Zod-validated on both sides
of the extension boundary, keeps the same request ID, and contains only the
current draft text. It never forwards Teams, account, URL, provider
configuration, or an operation choice to the host.

The configured GPT-5.6 model does not accept a custom temperature in this
workflow, so the local host intentionally relies on the model default. The
extension cannot control sampling parameters.
