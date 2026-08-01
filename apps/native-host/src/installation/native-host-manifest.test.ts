import { describe, expect, it } from 'vitest';
import { createNativeHostManifest } from './native-host-manifest.js';
import { PRODUCTION_EXTENSION_ID } from './production-extension.js';

describe('native host manifest', () => {
  it('pins the production manifest to the Chrome Web Store extension ID', () => {
    expect(PRODUCTION_EXTENSION_ID).toMatch(/^[a-p]{32}$/);
    expect(
      createNativeHostManifest(
        'C:\\Program Files\\AI Message Assistant\\host.cmd',
        PRODUCTION_EXTENSION_ID,
      ),
    ).toMatchObject({
      allowed_origins: [`chrome-extension://${PRODUCTION_EXTENSION_ID}/`],
    });
  });
});
