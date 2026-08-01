# Native Messaging

Frames are UTF-8 JSON prefixed by a four-byte little-endian unsigned byte length. The default maximum request is 64 KB. `stdout` contains frames only; diagnostics must use `stderr`. Register the host with `ai-message-host install --extension-id <Chrome-extension-ID>`.
