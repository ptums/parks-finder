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
    });
    expect(config).toEqual({
      port: 9000,
      corsOrigin: 'http://x',
      anthropicKey: 'k',
      rateLimitPerMinute: 5,
      modelCacheDir: '/models',
      onFly: true,
    });
  });
});
