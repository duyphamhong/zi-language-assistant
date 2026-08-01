# Architecture

The Manifest V3 extension sends explicit user requests to its background worker, which validates and forwards them through Chrome Native Messaging. The local Node host validates the versioned protocol, reads non-sensitive configuration, retrieves the API key only from the OS credential vault, and calls OpenAI over HTTPS. No local HTTP listener exists. Future Slack or Teams content scripts will communicate only with the background worker.
