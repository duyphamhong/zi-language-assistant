import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

function isGlobalNpmInstall(): boolean {
  return (
    process.platform === 'win32' &&
    (process.env.npm_config_global === 'true' ||
      process.env.npm_config_location === 'global')
  );
}

if (isGlobalNpmInstall()) {
  const cliPath = fileURLToPath(new URL('./cli.js', import.meta.url));
  const { stdout, stderr } = await execFileAsync(process.execPath, [
    cliPath,
    'install',
  ]);
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);
}
