import cors from '@fastify/cors';
import Fastify from 'fastify';
import type { CapabilitiesResponse } from '../../shared/api';
import type { Config } from './config';

export function buildApp(config: Config) {
  const app = Fastify({ logger: false });
  void app.register(cors, { origin: config.corsOrigin });

  app.get('/healthz', async () => ({ status: 'ok' }));

  app.get('/v1/capabilities', async (): Promise<CapabilitiesResponse> => ({
    ai: config.anthropicKey !== '',
  }));

  return app;
}
