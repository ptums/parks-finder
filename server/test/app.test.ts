import { buildApp } from '../src/app';
import { loadConfig } from '../src/config';

describe('server', () => {
  it('GET /healthz returns ok', async () => {
    const app = buildApp(loadConfig({}));
    const res = await app.inject({ method: 'GET', url: '/healthz' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
  });

  it('reports ai: false without a key, or with a blank one', async () => {
    for (const key of [undefined, '', '   ']) {
      const app = buildApp(loadConfig({ ANTHROPIC_API_KEY: key }));
      const res = await app.inject({ method: 'GET', url: '/v1/capabilities' });
      expect(res.json()).toEqual({ ai: false });
    }
  });

  it('reports ai: true when a key is set', async () => {
    const app = buildApp(loadConfig({ ANTHROPIC_API_KEY: 'test-key' }));
    const res = await app.inject({ method: 'GET', url: '/v1/capabilities' });
    expect(res.json()).toEqual({ ai: true });
  });

  it('allows CORS only from the configured origin', async () => {
    const app = buildApp(loadConfig({ CORS_ORIGIN: 'http://web.test' }));
    const res = await app.inject({
      method: 'GET',
      url: '/healthz',
      headers: { origin: 'http://web.test' },
    });
    expect(res.headers['access-control-allow-origin']).toBe('http://web.test');
  });
});
