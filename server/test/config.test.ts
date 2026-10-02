import { loadConfig } from '../src/config';

describe('loadConfig', () => {
  it('uses defaults', () => {
    expect(loadConfig({})).toEqual({
      port: 8787,
      corsOrigin: 'http://localhost:5173',
      anthropicKey: '',
      rateLimitPerMinute: 20,
      modelCacheDir: 'server/.cache/models',
      onFly: false,
      anthropicModel: 'claude-haiku-4-5-20251001',
      dailyRequestCap: 300,
    });
  });

  it('reads values from the environment', () => {
    const config = loadConfig({
      PORT: '9000',
      CORS_ORIGIN: 'http://x',
      ANTHROPIC_API_KEY: ' k ',
      RATE_LIMIT_PER_MINUTE: '5',
      MODEL_CACHE_DIR: '/models',
      FLY_APP_NAME: 'peter-parks-rag',
      ANTHROPIC_MODEL: 'claude-other',
      AI_DAILY_REQUEST_CAP: '7',
    });
    expect(config).toEqual({
      port: 9000,
      corsOrigin: 'http://x',
      anthropicKey: 'k',
      rateLimitPerMinute: 5,
      modelCacheDir: '/models',
      onFly: true,
      anthropicModel: 'claude-other',
      dailyRequestCap: 7,
    });
  });

  it.each([
    ['0', 0],
    ['abc', 300],
    ['-3', 300],
    ['  ', 300],
  ])('AI_DAILY_REQUEST_CAP=%p gives a cap of %p', (value, expected) => {
    expect(loadConfig({ AI_DAILY_REQUEST_CAP: value }).dailyRequestCap).toBe(expected);
  });
});
