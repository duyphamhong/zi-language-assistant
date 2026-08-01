import { isAbsolute } from 'node:path';
import { HOST_NAME } from '@zi-language-assistant/contracts';
export function createNativeHostManifest(
  launcherPath: string,
  extensionId: string,
) {
  if (!isAbsolute(launcherPath))
    throw new Error('Native host launcher path must be absolute.');
  if (!/^[a-p]{32}$/.test(extensionId))
    throw new Error('A 32-character Chrome extension ID is required.');
  return {
    name: HOST_NAME,
    description: 'AI Message Assistant local native host',
    path: launcherPath,
    type: 'stdio',
    allowed_origins: [`chrome-extension://${extensionId}/`],
  };
}
