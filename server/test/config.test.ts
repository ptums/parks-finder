import { loadConfig } from '../src/config';

describe('loadConfig', () => {
  it('uses defaults', () => {
    expect(loadConfig({})).toEqual({
      port: 8787,
      corsOrigin: 'http://localhost:5173',
      anthropicKey: '',
    });
  });

  it('reads values from the environment', () => {
    expect(loadConfig({ PORT: '9000', CORS_ORIGIN: 'http://x', ANTHROPIC_API_KEY: ' k ' })).toEqual(
      {
        port: 9000,
        corsOrigin: 'http://x',
        anthropicKey: 'k',
      },
    );
  });
});
