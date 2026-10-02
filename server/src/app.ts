import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyRequest } from 'fastify';
import type { CapabilitiesResponse } from '../../shared/api';
import type { Config } from './config';
import { createDailyCap } from './dailyCap';
import { sendError } from './errors';
import type { LlmClient } from './llm/types';
import type { Retriever } from './rag/retrieve';
import { registerAskRoute } from './routes/ask';
import { registerSearchRoute } from './routes/search';

export interface AppDeps {
  config: Config;
  /** Omitted in tests that don't search; /v1/search then answers 503. */
  retriever?: Retriever;
  /** Where JSON log lines go. Omitted = no logging (tests). */
  logStream?: { write(line: string): void };
  /** The model client. Omitted = /v1/ask answers 503. Tests pass a fake. */
  llm?: LlmClient;
  /** Clock for the daily cap (tests move it past UTC midnight). */
  now?: () => Date;
}

// On Fly the proxy sets Fly-Client-IP to the caller's address. Anywhere else any
// caller could send that header to dodge the limit, so we use the socket address.
function clientKey(request: FastifyRequest, onFly: boolean): string {
  const flyIp = request.headers['fly-client-ip'];
  return onFly && typeof flyIp === 'string' && flyIp !== '' ? flyIp : request.ip;
}

export function buildApp({ config, retriever, logStream, llm, now }: AppDeps) {
  const app = Fastify({
    bodyLimit: 2048,
    logger: logStream
      ? {
          stream: logStream,
          // Only method and URL: headers can carry keys or cookies and are never logged.
          serializers: {
            req: (req) => ({ method: req.method, url: req.url }),
            res: (res) => ({ statusCode: res.statusCode }),
          },
        }
      : false,
  });
  const aiEnabled = config.anthropicKey !== '';
  const dailyCap = createDailyCap(config.dailyRequestCap, now);

  void app.register(cors, { origin: config.corsOrigin, exposedHeaders: ['Retry-After'] });
  void app.register(rateLimit, {
    max: config.rateLimitPerMinute,
    timeWindow: '1 minute',
    keyGenerator: (request) => clientKey(request, config.onFly),
  });

  app.setErrorHandler((error: { statusCode?: number; message?: string }, request, reply) => {
    const status = error.statusCode ?? 500;
    if (status === 429) {
      const seconds = reply.getHeader('retry-after') ?? 60;
      return sendError(
        reply,
        429,
        'rate_limited',
        `Too many requests. Try again in ${seconds} seconds.`,
      );
    }
    if (status >= 400 && status < 500) {
      // Malformed JSON, wrong content type, or a body over 2 KB.
      return sendError(reply, status, 'bad_request', 'The request was not valid.');
    }
    // Message only: never the stack, request, headers or query.
    request.log.error({ statusCode: status, errorMessage: error.message }, 'unhandled error');
    return sendError(reply, 500, 'internal', 'Something went wrong.');
  });

  // Routes are registered inside a plugin so the rate limiter is loaded first.
  void app.register(async (scope) => {
    const unlimited = { config: { rateLimit: false } };

    scope.get('/healthz', unlimited, async () => ({ status: 'ok' }));

    scope.get('/v1/capabilities', unlimited, async (): Promise<CapabilitiesResponse> => ({
      ai: aiEnabled,
    }));

    registerSearchRoute(scope, aiEnabled, retriever);

    registerAskRoute(scope, { aiEnabled, retriever, llm, dailyCap, model: config.anthropicModel });
  });

  return app;
}
