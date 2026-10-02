import { DEFAULT_MODEL } from './rag/generate';

export interface Config {
  port: number;
  corsOrigin: string;
  anthropicKey: string;
  rateLimitPerMinute: number;
  modelCacheDir: string;
  /** True on Fly machines (Fly sets FLY_APP_NAME); only then is Fly-Client-IP trusted. */
  onFly: boolean;
  anthropicModel: string;
  /** Max /v1/ask requests per UTC day on this machine; 0 = no cap. */
  dailyRequestCap: number;
}

/** Reads settings from process.env. Never logs values. A missing key just means ai: false. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return {
    port: Number(env.PORT) || 8787,
    corsOrigin: env.CORS_ORIGIN || 'http://localhost:5173',
    anthropicKey: (env.ANTHROPIC_API_KEY ?? '').trim(),
    rateLimitPerMinute: Number(env.RATE_LIMIT_PER_MINUTE) || 20,
    modelCacheDir: env.MODEL_CACHE_DIR || 'server/.cache/models',
    onFly: Boolean(env.FLY_APP_NAME),
    anthropicModel: env.ANTHROPIC_MODEL || DEFAULT_MODEL,
    dailyRequestCap: readCap(env.AI_DAILY_REQUEST_CAP),
  };
}

const DEFAULT_DAILY_CAP = 300;

/** Unset or not a number: the default. "0" turns the cap off. */
function readCap(value: string | undefined): number {
  if (value === undefined || value.trim() === '') return DEFAULT_DAILY_CAP;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : DEFAULT_DAILY_CAP;
}
