import Anthropic, { APIConnectionTimeoutError, APIError } from '@anthropic-ai/sdk';
import { LlmError, LlmTimeoutError, type LlmClient } from './types';

/**
 * Thin adapter over @anthropic-ai/sdk (excluded from coverage, like embedder.ts).
 * The key stays inside the SDK client; it is never logged or returned.
 */
export function createAnthropicLlm(apiKey: string): LlmClient {
  // No retries: a retry would stretch the 15 s budget, and the UI falls back to standard search.
  const client = new Anthropic({ apiKey, maxRetries: 0 });

  return {
    async create(request, { timeoutMs }) {
      try {
        const message = await client.messages.create(request, { timeout: timeoutMs });
        const text = message.content
          .map((block) => (block.type === 'text' ? block.text : ''))
          .join('');
        return {
          text,
          inputTokens: message.usage.input_tokens,
          outputTokens: message.usage.output_tokens,
        };
      } catch (error) {
        if (error instanceof APIConnectionTimeoutError) throw new LlmTimeoutError();
        if (error instanceof APIError) {
          throw new LlmError({
            status: error.status,
            providerType: error.type ?? undefined,
            requestId: error.requestID ?? undefined,
          });
        }
        throw error;
      }
    },
  };
}
