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
