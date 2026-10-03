import { buildApp } from '../src/app';
import { loadConfig } from '../src/config';

describe('server', () => {
  it('GET /healthz returns ok', async () => {
    const app = buildApp({ config: loadConfig({}) });
    const res = await app.inject({ method: 'GET', url: '/healthz' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
  });

  it('reports ai: false without a key, or with a blank one', async () => {
    for (const key of [undefined, '', '   ']) {
      const app = buildApp({ config: loadConfig({ ANTHROPIC_API_KEY: key }) });
      const res = await app.inject({ method: 'GET', url: '/v1/capabilities' });
      expect(res.json()).toEqual({ ai: false });
    }
  });

  it('reports ai: true when a key is set', async () => {
    const app = buildApp({ config: loadConfig({ ANTHROPIC_API_KEY: 'test-key' }) });
    const res = await app.inject({ method: 'GET', url: '/v1/capabilities' });
    expect(res.json()).toEqual({ ai: true });
  });

  it('allows CORS only from the configured origin', async () => {
    const app = buildApp({ config: loadConfig({ CORS_ORIGIN: 'http://web.test' }) });
    const allowed = await app.inject({
      method: 'GET',
      url: '/healthz',
      headers: { origin: 'http://web.test' },
    });
    expect(allowed.headers['access-control-allow-origin']).toBe('http://web.test');
    const other = await app.inject({
      method: 'GET',
      url: '/healthz',
      headers: { origin: 'http://evil.test' },
    });
    expect(other.headers['access-control-allow-origin']).not.toBe('http://evil.test');
  });

  it('never rate-limits health and capabilities checks', async () => {
    const app = buildApp({ config: loadConfig({ RATE_LIMIT_PER_MINUTE: '1' }) });
    for (let i = 0; i < 3; i++) {
      const res = await app.inject({ method: 'GET', url: '/v1/capabilities' });
      expect(res.statusCode).toBe(200);
    }
  });

  it('/v1/ask is a 503 stub until T6', async () => {
    const app = buildApp({ config: loadConfig({ ANTHROPIC_API_KEY: 'k' }) });
    const res = await app.inject({ method: 'POST', url: '/v1/ask', payload: { query: 'hi' } });
    expect(res.statusCode).toBe(503);
    expect(res.json().error.code).toBe('ai_unavailable');
  });
});
