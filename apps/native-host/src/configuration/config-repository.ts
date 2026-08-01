import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import envPaths from 'env-paths';
import { z } from 'zod';
import type { Operation } from '@zi-language-assistant/contracts';
const configSchema = z
  .object({
    schemaVersion: z.literal(1),
    provider: z.literal('openai'),
    model: z.string().min(1),
    defaultOperation: z.enum([
      'grammar',
      'translate',
      'professional',
      'concise',
    ]),
    defaultSourceLanguage: z.string(),
    defaultTargetLanguage: z.string(),
    defaultTone: z.string(),
    maxInputCharacters: z.number().int().positive().max(10_000),
    maxOutputTokens: z.number().int().positive().max(2_000),
    // Retained only to read configurations written by the short-lived 0.3
    // release. GPT-5.6 does not accept a custom temperature in this workflow.
    temperature: z.number().min(0).max(2).optional(),
    requestTimeoutMs: z.number().int().positive().max(120_000),
    mockMode: z.boolean(),
    logging: z
      .object({
        level: z.enum(['debug', 'info', 'warn', 'error']),
        includeMessageContent: z.literal(false),
      })
      .strict(),
  })
  .strict()
  .superRefine((value, ctx) => {
    for (const key of Object.keys(value))
      if (
        /key|secret|token|authorization/i.test(key) &&
        key !== 'maxOutputTokens'
      )
        ctx.addIssue({
          code: 'custom',
          message: 'Secret-like configuration fields are forbidden.',
        });
  });
export type AppConfig = z.infer<typeof configSchema>;
export const defaultConfig: AppConfig = {
  schemaVersion: 1,
  provider: 'openai',
  model: 'gpt-4.1-mini',
  defaultOperation: 'grammar',
  defaultSourceLanguage: 'auto',
  defaultTargetLanguage: 'English',
  defaultTone: 'professional',
  maxInputCharacters: 10_000,
  maxOutputTokens: 500,
  requestTimeoutMs: 30_000,
  mockMode: true,
  logging: { level: 'info', includeMessageContent: false },
};
export class ConfigRepository {
  readonly filePath = `${envPaths('ai-message-assistant').config}/config.json`;
  async get(): Promise<AppConfig> {
    try {
      return configSchema.parse(
        JSON.parse(await readFile(this.filePath, 'utf8')),
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT')
        return defaultConfig;
      throw error;
    }
  }
  async save(config: AppConfig): Promise<void> {
    const value = configSchema.parse(config);
    await mkdir(dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.tmp`;
    await writeFile(tmp, JSON.stringify(value, null, 2), { mode: 0o600 });
    await rename(tmp, this.filePath);
  }
  async update(
    values: Partial<Pick<AppConfig, 'model' | 'mockMode' | 'defaultOperation'>>,
  ): Promise<AppConfig> {
    const next = { ...(await this.get()), ...values } as AppConfig;
    await this.save(next);
    return next;
  }
}
export type _OperationReference = Operation;
