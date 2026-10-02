export interface Config {
  port: number;
  corsOrigin: string;
  anthropicKey: string;
  rateLimitPerMinute: number;
  modelCacheDir: string;
}

/** Reads settings from process.env. Never logs values. A missing key just means ai: false. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return {
    port: Number(env.PORT) || 8787,
    corsOrigin: env.CORS_ORIGIN || 'http://localhost:5173',
    anthropicKey: (env.ANTHROPIC_API_KEY ?? '').trim(),
    rateLimitPerMinute: Number(env.RATE_LIMIT_PER_MINUTE) || 20,
    modelCacheDir: env.MODEL_CACHE_DIR || 'server/.cache/models',
  };
}
