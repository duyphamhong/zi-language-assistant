# Security

The extension has only `nativeMessaging` and `storage` permissions. A malicious webpage cannot directly invoke the host; Chrome enforces the manifest's exact extension origin. Native frames are size-limited and Zod-validated. Message text is never logged, API keys are stored only through Windows Credential Manager, and no API-key protocol operation exists. The host neither proxies arbitrary URLs nor exposes localhost. Local process inspection remains an OS-level risk; users should protect their Windows account.
