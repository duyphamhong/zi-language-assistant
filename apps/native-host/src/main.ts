import { OsSecretStore } from './credentials/os-secret-store.js';
import { runMessageLoop } from './native-messaging/message-loop.js';
import { RequestRouter } from './native-messaging/request-router.js';
await runMessageLoop(new RequestRouter(undefined, new OsSecretStore()));
