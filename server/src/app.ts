import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyRequest } from 'fastify';
import type { CapabilitiesResponse } from '../../shared/api';
import type { Config } from './config';
import { sendError } from './errors';
import type { Retriever } from './rag/retrieve';
import { registerSearchRoute } from './routes/search';

export interface AppDeps {
  config: Config;
  /** Omitted in tests that don't search; /v1/search then answers 503. */
  retriever?: Retriever;
  /** Where JSON log lines go. Omitted = no logging (tests). */
  logStream?: { write(line: string): void };
}

// Fly's proxy puts the caller's address in Fly-Client-IP; locally it is the socket address.
function clientKey(request: FastifyRequest): string {
  const flyIp = request.headers['fly-client-ip'];
  return typeof flyIp === 'string' && flyIp !== '' ? flyIp : request.ip;
}

export function buildApp({ config, retriever, logStream }: AppDeps) {
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

  void app.register(cors, { origin: config.corsOrigin });
  void app.register(rateLimit, {
    max: config.rateLimitPerMinute,
    timeWindow: '1 minute',
    keyGenerator: clientKey,
  });

  app.setErrorHandler((error: { statusCode?: number }, request, reply) => {
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
    request.log.error({ statusCode: status }, 'unhandled error');
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

    // Grounded answers arrive in T6; until then this is always unavailable.
    scope.post('/v1/ask', async (_request, reply) =>
      sendError(reply, 503, 'ai_unavailable', 'AI answers are not available.'),
    );
  });

  return app;
}
