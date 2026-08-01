import { z } from 'zod';

export const PROTOCOL_VERSION = 1 as const;
export const HOST_NAME = 'com.appzihub.ai_message_assistant';
export const operationSchema = z.enum([
  'grammar',
  'translate',
  'professional',
  'concise',
]);
export type Operation = z.infer<typeof operationSchema>;
export const errorCodeSchema = z.enum([
  'NATIVE_HOST_UNAVAILABLE',
  'INVALID_REQUEST',
  'UNSUPPORTED_PROTOCOL_VERSION',
  'API_KEY_NOT_CONFIGURED',
  'CONFIGURATION_INVALID',
  'OPENAI_AUTHENTICATION_FAILED',
  'OPENAI_RATE_LIMITED',
  'OPENAI_REQUEST_FAILED',
  'OPENAI_TIMEOUT',
  'OUTPUT_EMPTY',
  'INTERNAL_ERROR',
]);
export type ErrorCode = z.infer<typeof errorCodeSchema>;
const base = {
  protocolVersion: z.literal(PROTOCOL_VERSION),
  requestId: z.string().min(1).max(128),
};
export const nativeRequestSchema = z.discriminatedUnion('type', [
  z.object({
    ...base,
    type: z.literal('health-check'),
    payload: z.object({}).strict(),
  }),
  z.object({
    ...base,
    type: z.literal('get-configuration-status'),
    payload: z.object({}).strict(),
  }),
  z.object({
    ...base,
    type: z.literal('improve-message'),
    payload: z
      .object({
        text: z.string().min(1).max(10_000),
        operation: operationSchema,
        sourceLanguage: z.string().min(1).max(64),
        targetLanguage: z.string().min(1).max(64),
        tone: z.string().min(1).max(64),
      })
      .strict(),
  }),
]);
export type NativeRequest = z.infer<typeof nativeRequestSchema>;
export const nativeResponseSchema = z.union([
  z.object({ ...base, success: z.literal(true), data: z.unknown() }),
  z.object({
    ...base,
    success: z.literal(false),
    error: z.object({
      code: errorCodeSchema,
      message: z.string(),
      retryable: z.boolean(),
    }),
  }),
]);
export type NativeResponse = z.infer<typeof nativeResponseSchema>;
export const failure = (
  requestId: string,
  code: ErrorCode,
  message: string,
  retryable = false,
): NativeResponse => ({
  protocolVersion: PROTOCOL_VERSION,
  requestId,
  success: false,
  error: { code, message, retryable },
});
