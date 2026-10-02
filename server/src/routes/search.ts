import type { FastifyInstance } from 'fastify';
import { SearchRequestSchema, type SearchResponse } from '../../../shared/api';
import type { Retriever } from '../rag/retrieve';
import { sendError } from '../errors';

const DEFAULT_LIMIT = 6;

/** POST /v1/search: ranked parks for a query. Never calls the LLM. */
export function registerSearchRoute(
  app: FastifyInstance,
  aiEnabled: boolean,
  retriever: Retriever | undefined,
) {
  app.post('/v1/search', { bodyLimit: 2048 }, async (request, reply) => {
    if (!aiEnabled || !retriever) {
      return sendError(reply, 503, 'ai_unavailable', 'AI search is not available.');
    }
    const parsed = SearchRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, 'bad_request', 'query must be 1 to 200 characters.');
    }

    const started = performance.now();
    const { query, limit = DEFAULT_LIMIT } = parsed.data;
    const retrieval = await retriever.search(query, limit);
    const latencyMs = Math.round(performance.now() - started);

    // Log the query's length, never its text: it may contain personal details.
    request.log.info(
      {
        route: '/v1/search',
        latencyMs,
        mode: retrieval.mode,
        abstained: retrieval.abstained,
        queryLength: query.length,
        chunkIds: retrieval.chunks.slice(0, 10).map((chunk) => chunk.chunkId),
      },
      'search',
    );

    const body: SearchResponse = {
      mode: retrieval.mode,
      results: retrieval.results,
      abstained: retrieval.abstained,
      latencyMs,
    };
    return body;
  });
}
