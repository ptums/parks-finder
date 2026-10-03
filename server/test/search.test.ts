import { ErrorResponseSchema, SearchResponseSchema } from '../../shared/api';
import { buildApp, type AppDeps } from '../src/app';
import { loadConfig } from '../src/config';
import { createRetriever, type Retriever } from '../src/rag/retrieve';
import { testChunks } from './fixtures';

const KEY = 'sk-test-secret-value';

function app(overrides: Partial<AppDeps> = {}, env: NodeJS.ProcessEnv = {}) {
  return buildApp({
    config: loadConfig({ ANTHROPIC_API_KEY: KEY, ...env }),
    retriever: createRetriever(testChunks),
    ...overrides,
  });
}

const search = (server: ReturnType<typeof app>, payload: unknown, headers = {}) =>
  server.inject({ method: 'POST', url: '/v1/search', payload: payload as object, headers });

describe('POST /v1/search', () => {
  it('answers 503 ai_unavailable without a key', async () => {
    const res = await search(app({ config: loadConfig({}) }), { query: 'skate' });
    expect(res.statusCode).toBe(503);
    expect(ErrorResponseSchema.parse(res.json()).error.code).toBe('ai_unavailable');
  });

  it('returns ranked parks in the shared response shape', async () => {
    const res = await search(app(), { query: 'skateboarding bowls' });
    expect(res.statusCode).toBe(200);
    const body = SearchResponseSchema.parse(res.json());
    expect(body.mode).toBe('lexical');
    expect(body.abstained).toBe(false);
    expect(body.results[0]).toMatchObject({ parkId: 'skate', field: 'overview' });
    expect(body.results[0]?.matchedText).toMatch(/^Ramp Yard\. /);
  });

  it('abstains with results [] on an off-topic query', async () => {
    const res = await search(app(), { query: 'What is the capital of France?' });
    const body = SearchResponseSchema.parse(res.json());
    expect(body).toMatchObject({ results: [], abstained: true });
  });

  it.each([
    ['empty query', { query: '   ' }],
    ['over 200 characters', { query: 'a'.repeat(201) }],
    ['missing query', {}],
  ])('rejects %s with 400 bad_request', async (_name, payload) => {
    const res = await search(app(), payload);
    expect(res.statusCode).toBe(400);
    expect(ErrorResponseSchema.parse(res.json()).error.code).toBe('bad_request');
  });

  it('rejects a body over 2 KB', async () => {
    const res = await search(app(), { query: 'a', padding: 'x'.repeat(3000) });
    expect(res.statusCode).toBe(413);
    expect(ErrorResponseSchema.parse(res.json()).error.code).toBe('bad_request');
  });

  it('rate-limits per IP with 429, Retry-After and code rate_limited', async () => {
    const server = app({}, { RATE_LIMIT_PER_MINUTE: '2' });
    await search(server, { query: 'skate' });
    await search(server, { query: 'skate' });
    const limited = await search(server, { query: 'skate' });
    expect(limited.statusCode).toBe(429);
    expect(Number(limited.headers['retry-after'])).toBeGreaterThan(0);
    expect(ErrorResponseSchema.parse(limited.json()).error.code).toBe('rate_limited');
  });

  it('ignores a spoofed Fly-Client-IP when not running on Fly', async () => {
    const server = app({}, { RATE_LIMIT_PER_MINUTE: '1' });
    await search(server, { query: 'skate' }, { 'fly-client-ip': '203.0.113.1' });
    const spoofed = await search(server, { query: 'skate' }, { 'fly-client-ip': '203.0.113.2' });
    expect(spoofed.statusCode).toBe(429);
  });

  it('keys the limit on Fly-Client-IP when running on Fly', async () => {
    const server = app({}, { RATE_LIMIT_PER_MINUTE: '1', FLY_APP_NAME: 'peter-parks-rag' });
    await search(server, { query: 'skate' }, { 'fly-client-ip': '203.0.113.1' });
    const other = await search(server, { query: 'skate' }, { 'fly-client-ip': '203.0.113.2' });
    expect(other.statusCode).toBe(200);
    const same = await search(server, { query: 'skate' }, { 'fly-client-ip': '203.0.113.1' });
    expect(same.statusCode).toBe(429);
  });

  it('stays in lexical mode when the embedder never loaded or fails', async () => {
    const retriever = createRetriever(testChunks);
    await retriever.enableDense({
      embed: async (texts) => {
        if (texts.length === 1) throw new Error('model gone');
        return texts.map(() => [1]);
      },
    });
    const res = await search(app({ retriever }), { query: 'skate' });
    expect(res.statusCode).toBe(200);
    expect(res.json().mode).toBe('lexical');
  });

  it('answers 500 internal (not a crash) if the retriever itself throws', async () => {
    const broken: Retriever = {
      search: async () => {
        throw new Error('boom');
      },
    };
    const lines: string[] = [];
    const server = app({ retriever: broken, logStream: { write: (line) => lines.push(line) } });
    const res = await search(server, { query: 'skate' });
    expect(res.statusCode).toBe(500);
    expect(res.json().error.code).toBe('internal');
    const entry = lines.map((l) => JSON.parse(l)).find((l) => l.msg === 'unhandled error');
    expect(entry).toMatchObject({ level: 50, statusCode: 500, errorMessage: 'boom' });
    expect(lines.join('\n')).not.toContain('stack');
  });

  it('logs request id, route, latency and chunk ids, never the key, headers or query text', async () => {
    const lines: string[] = [];
    const server = app({ logStream: { write: (line) => lines.push(line) } });
    await search(server, { query: 'skateboarding bowls' }, { authorization: `Bearer ${KEY}` });
    const log = lines.join('\n');
    const entry = lines.map((l) => JSON.parse(l)).find((l) => l.msg === 'search');
    expect(entry).toMatchObject({ route: '/v1/search', queryLength: 19, mode: 'lexical' });
    expect(entry.reqId).toBeDefined();
    expect(typeof entry.latencyMs).toBe('number');
    expect(entry.chunkIds).toContain('skate#overview');
    expect(log).not.toContain(KEY);
    expect(log).not.toContain('authorization');
    expect(log).not.toContain('skateboarding bowls');
  });
});
