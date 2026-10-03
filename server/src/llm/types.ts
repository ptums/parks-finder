/**
 * The one LLM call the service makes, in the Anthropic Messages API shape.
 * There is deliberately no `tools` field: the model can only reply with text.
 */
export interface LlmRequest {
  model: string;
  system: string;
  max_tokens: number;
  temperature: number;
  messages: { role: 'user'; content: string }[];
}

export interface LlmReply {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

/** Real client: llm/anthropic.ts. Tests pass a fake, so no test touches the network. */
export interface LlmClient {
  create(request: LlmRequest, options: { timeoutMs: number }): Promise<LlmReply>;
}

/** Thrown by a client when the model did not answer within timeoutMs. */
export class LlmTimeoutError extends Error {
  constructor() {
    super('LLM request timed out');
    this.name = 'LlmTimeoutError';
  }
}

/**
 * A provider failure reduced to safe fields. Deliberately no message: upstream messages
 * can echo request details. status is the HTTP status; providerType is e.g.
 * "invalid_request_error", "authentication_error", "rate_limit_error", "overloaded_error".
 */
export class LlmError extends Error {
  readonly status?: number;
  readonly providerType?: string;
  readonly requestId?: string;

  constructor(details: { status?: number; providerType?: string; requestId?: string } = {}) {
    super('LLM request failed');
    this.name = 'LlmError';
    this.status = details.status;
    this.providerType = details.providerType;
    this.requestId = details.requestId;
  }
}

/** Safe, loggable fields for any error thrown by an LlmClient. */
export function llmErrorFields(error: unknown): {
  errorName: string;
  status?: number;
  providerType?: string;
  requestId?: string;
} {
  if (error instanceof LlmError) {
    return {
      errorName: error.name,
      status: error.status,
      providerType: error.providerType,
      requestId: error.requestId,
    };
  }
  return { errorName: error instanceof Error ? error.name : 'unknown' };
}
