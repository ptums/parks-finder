import type { FastifyInstance } from 'fastify';
import { AskRequestSchema, type AskResponse } from '../../../shared/api';
import type { DailyCap } from '../dailyCap';
import { sendError } from '../errors';
import { LlmTimeoutError, type LlmClient, type LlmReply } from '../llm/types';
import { buildAskRequest, MAX_CHUNKS, TIMEOUT_MS } from '../rag/generate';
import type { Retriever } from '../rag/retrieve';
import { ABSTAIN_ANSWER, verifyAnswer, type VerifiedAnswer } from '../rag/verifyCitations';

export interface AskDeps {
  aiEnabled: boolean;
  retriever?: Retriever;
  llm?: LlmClient;
  dailyCap: DailyCap;
  model: string;
}

/** POST /v1/ask: one grounded JSON answer whose citations the server has checked. */
export function registerAskRoute(app: FastifyInstance, deps: AskDeps) {
  const { aiEnabled, retriever, llm, dailyCap, model } = deps;

  app.post('/v1/ask', async (request, reply) => {
    if (!aiEnabled || !retriever || !llm) {
      return sendError(reply, 503, 'ai_unavailable', 'AI answers are not available.');
    }
    const parsed = AskRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, 'bad_request', 'query must be 1 to 200 characters.');
    }
    const started = performance.now();
    const { query } = parsed.data;
    const retrieval = await retriever.search(query, MAX_CHUNKS);
    const chunks = retrieval.chunks.slice(0, MAX_CHUNKS);

    // Weak evidence: abstain without spending a model call (and without using the cap).
    let llmReply: LlmReply | undefined;
    if (!retrieval.abstained && chunks.length > 0) {
      const retryAfter = dailyCap.take();
      if (retryAfter !== null) {
        reply.header('retry-after', String(retryAfter));
        return sendError(
          reply,
          429,
          'daily_cap_reached',
          "Today's AI answer limit is reached. Search results still work.",
        );
      }

      try {
        llmReply = await llm.create(buildAskRequest(query, chunks, model), {
          timeoutMs: TIMEOUT_MS,
        });
      } catch (error) {
        const timedOut = error instanceof LlmTimeoutError;
        // Only the error's class name: messages from upstream can echo request details.
        request.log.warn({ route: '/v1/ask', errorName: (error as Error).name }, 'llm failed');
        return timedOut
          ? sendError(reply, 504, 'timeout', 'The AI answer took too long. Try again.')
          : sendError(reply, 503, 'ai_unavailable', 'AI answers are not available right now.');
      }
    }

    const verified: VerifiedAnswer = llmReply
      ? verifyAnswer(llmReply.text, chunks)
      : { answer: ABSTAIN_ANSWER, citations: [], abstained: true, reason: 'retrieval' };
    const latencyMs = Math.round(performance.now() - started);

    // Never the query text, the key or headers.
    request.log.info(
      {
        route: '/v1/ask',
        latencyMs,
        mode: retrieval.mode,
        abstained: verified.abstained,
        llmCalled: llmReply !== undefined,
        queryLength: query.length,
        chunkIds: chunks.map((chunk) => chunk.chunkId),
        inputTokens: llmReply?.inputTokens ?? 0,
        outputTokens: llmReply?.outputTokens ?? 0,
        citations: verified.citations.length,
        abstainReason: verified.reason,
      },
      'ask',
    );

    const body: AskResponse = {
      answer: verified.answer,
      citations: verified.citations,
      abstained: verified.abstained,
      mode: retrieval.mode,
      latencyMs,
      ...(llmReply && {
        usage: { inputTokens: llmReply.inputTokens, outputTokens: llmReply.outputTokens },
      }),
    };
    return body;
  });
}
