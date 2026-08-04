import { stdin as input, stdout as output } from 'node:process';
import { dirname, resolve } from 'node:path';
import { mkdir, rm, writeFile, access } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import envPaths from 'env-paths';
import { Command } from 'commander';
import { ConfigRepository } from './configuration/config-repository.js';
import { OsSecretStore } from './credentials/os-secret-store.js';
import {
  appendClipboardSecret,
  sanitizeSecretInput,
} from './credentials/secret-input.js';
import { createNativeHostManifest } from './installation/native-host-manifest.js';
import { PRODUCTION_EXTENSION_ID } from './installation/production-extension.js';
import {
  readRegistration,
  registerWindows,
  unregisterWindows,
} from './installation/windows-registrar.js';
const paths = envPaths('ai-message-assistant');
const manifestPath = resolve(paths.config, 'native-host-manifest.json');
const launcherPath = resolve(paths.data, 'ai-message-host.cmd');
const hostEntryPoint = resolve(dirname(process.argv[1] ?? ''), 'main.js');
const execFileAsync = promisify(execFile);
const program = new Command()
  .name('ai-message-host')
  .description('AI Message Assistant native host');

async function readWindowsClipboard(): Promise<string> {
  if (process.platform !== 'win32')
    throw new Error('Clipboard paste is supported on Windows only.');
  const { stdout } = await execFileAsync('powershell.exe', [
    '-NoProfile',
    '-NonInteractive',
    '-Command',
    'Get-Clipboard -Raw',
  ]);
  return stdout;
}

async function promptSecret(question: string): Promise<string> {
  if (!input.isTTY) {
    throw new Error(
      'configure requires an interactive terminal to protect the API key.',
    );
  }
  output.write(question);
  input.setRawMode(true);
  input.resume();
  return new Promise((resolve, reject) => {
    let value = '';
    let complete = false;
    const fail = (error: unknown) => {
      if (complete) return;
      complete = true;
      cleanup();
      reject(error);
    };
    const handleData = async (chunk: Buffer) => {
      for (const character of chunk.toString('utf8')) {
        if (complete) return;
        if (character === '\r' || character === '\n') {
          complete = true;
          cleanup();
          output.write('\n');
          resolve(value);
          return;
        }
        if (character === '\u0003') {
          fail(new Error('Configuration cancelled.'));
          return;
        }
        if (character === '\u0016') {
          value = appendClipboardSecret(value, await readWindowsClipboard());
          continue;
        }
        if (character === '\u007f' || character === '\b') {
          value = value.slice(0, -1);
          continue;
        }
        value += character;
      }
    };
    let pendingInput = Promise.resolve();
    const onData = (chunk: Buffer) => {
      pendingInput = pendingInput.then(() => handleData(chunk)).catch(fail);
    };
    const cleanup = () => {
      input.off('data', onData);
      input.setRawMode(false);
      input.pause();
    };
    input.on('data', onData);
  });
}
program.command('run').action(async () => {
  await import('./main.js');
});
program
  .command('install')
  .option(
    '--extension-id <id>',
    'Chrome extension ID; defaults to the production Chrome Web Store item.',
    PRODUCTION_EXTENSION_ID,
  )
  .action(async ({ extensionId }) => {
    if (process.platform !== 'win32')
      throw new Error('Phase 1 registration is supported on Windows only.');
    await access(hostEntryPoint);
    await mkdir(dirname(launcherPath), { recursive: true });
    await writeFile(
      launcherPath,
      `@echo off\r\n"${process.execPath}" "${hostEntryPoint}"\r\n`,
      { encoding: 'utf8' },
    );
    const manifest = createNativeHostManifest(launcherPath, extensionId);
    await mkdir(dirname(manifestPath), { recursive: true });
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    await registerWindows(manifestPath);
    output.write(`Installed ${manifest.name}.\n`);
  });
program.command('uninstall').action(async () => {
  await unregisterWindows();
  await rm(manifestPath, { force: true });
  output.write(
    'Native host registration removed. Credentials were retained.\n',
  );
});
program.command('configure').action(async () => {
  const config = await new ConfigRepository().get();
  const apiKey = await promptSecret(
    'OpenAI API key (leave blank to keep current key): ',
  );
  const sanitizedApiKey = sanitizeSecretInput(apiKey);
  if (sanitizedApiKey) {
    await new OsSecretStore().setOpenAiApiKey(sanitizedApiKey);
  }
  output.write(
    `Saved API-key configuration. The native host uses ${config.model}.\n`,
  );
});
program.command('status').action(async () => {
  const config = await new ConfigRepository().get();
  output.write(
    JSON.stringify(
      {
        registered: (await readRegistration()) !== null,
        apiKeyConfigured: await new OsSecretStore().hasOpenAiApiKey(),
        provider: config.provider,
        model: config.model,
      },
      null,
      2,
    ) + '\n',
  );
});
program.command('doctor').action(async () => {
  let manifestExists = true;
  try {
    await access(manifestPath);
  } catch {
    manifestExists = false;
  }
  output.write(
    JSON.stringify(
      {
        node: process.version,
        platform: process.platform,
        registration: (await readRegistration()) !== null,
        manifestExists,
        credentialVaultAvailable: process.platform === 'win32',
      },
      null,
      2,
    ) + '\n',
  );
});
await program.parseAsync();
