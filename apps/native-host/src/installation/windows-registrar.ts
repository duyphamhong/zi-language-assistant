import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execFileAsync = promisify(execFile);
export const registryKey =
  'HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\com.appzihub.ai_message_assistant';
export async function registerWindows(manifestPath: string): Promise<void> {
  await execFileAsync('reg.exe', [
    'ADD',
    registryKey,
    '/ve',
    '/t',
    'REG_SZ',
    '/d',
    manifestPath,
    '/f',
  ]);
}
export async function unregisterWindows(): Promise<void> {
  try {
    await execFileAsync('reg.exe', ['DELETE', registryKey, '/f']);
  } catch (error) {
    if ((error as { code?: number }).code !== 1) throw error;
  }
}
export async function readRegistration(): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync('reg.exe', [
      'QUERY',
      registryKey,
      '/ve',
    ]);
    return stdout.trim();
  } catch {
    return null;
  }
}
