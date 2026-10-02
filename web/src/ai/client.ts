import type { z } from 'zod';
import {
  CapabilitiesResponseSchema,
  ErrorResponseSchema,
  SearchResponseSchema,
  type SearchResponse,
} from '../../../shared/api';
import { env } from '../env';
import { AskResponseSchema, type AiAnswer } from './types';

export type AiFailure = 'unavailable' | 'rate_limited' | 'daily_cap';

/** Thrown for any failed AI call. `kind` picks the message; `retryAfter` is in seconds. */
export class AiError extends Error {
  constructor(
    readonly kind: AiFailure,
    readonly retryAfter?: number,
  ) {
    super(kind);
  }
}

const CAPABILITIES_TIMEOUT_MS = 4000;
const REQUEST_TIMEOUT_MS = 20000;

async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  timeoutMs: number,
  body?: unknown,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${env.ragUrl}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) throw await failureFrom(response);
    return schema.parse(await response.json());
  } catch (error) {
    if (error instanceof AiError) throw error;
    throw new AiError('unavailable'); // network error, timeout, or an unexpected body
  } finally {
    clearTimeout(timer);
  }
}

async function failureFrom(response: Response): Promise<AiError> {
  const body = ErrorResponseSchema.safeParse(await response.json().catch(() => null));
  const code = body.success ? body.data.error.code : null;
  if (code === 'daily_cap_reached') return new AiError('daily_cap');
  if (response.status === 429 || code === 'rate_limited') {
    const seconds = Number(response.headers.get('Retry-After'));
    return new AiError('rate_limited', Number.isFinite(seconds) && seconds > 0 ? seconds : 60);
  }
  return new AiError('unavailable');
}

export function fetchCapabilities(): Promise<boolean> {
  return request('/v1/capabilities', CapabilitiesResponseSchema, CAPABILITIES_TIMEOUT_MS).then(
    (result) => result.ai,
  );
}

export function searchParks(query: string): Promise<SearchResponse> {
  return request('/v1/search', SearchResponseSchema, REQUEST_TIMEOUT_MS, { query });
}

export function askParks(query: string): Promise<AiAnswer> {
  return request('/v1/ask', AskResponseSchema, REQUEST_TIMEOUT_MS, { query });
}

const MESSAGES: Record<AiFailure, (error: AiError) => string> = {
  unavailable: () => 'AI search is unavailable right now. Standard search still works.',
  rate_limited: (error) => `Too many AI searches. Try again in ${error.retryAfter} seconds.`,
  daily_cap: () => "Today's AI answer limit is reached. Search results still shown.",
};

export function failureMessage(error: unknown): string {
  const known = error instanceof AiError ? error : new AiError('unavailable');
  return MESSAGES[known.kind](known);
}
