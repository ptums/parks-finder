import type { Embedder } from './retrieve';

export const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';

/**
 * Thin adapter over @huggingface/transformers (excluded from coverage; exercised
 * by `npm run build:index` and `npm run eval:retrieval`). The package is ESM-only
 * and heavy, so it is imported lazily: Jest never loads it, and the server can
 * listen before the model is ready. Downloads the model into cacheDir on first use.
 */
export async function loadEmbedder(cacheDir: string): Promise<Embedder> {
  const { pipeline, env } = await import('@huggingface/transformers');
  env.cacheDir = cacheDir;
  const extract = await pipeline('feature-extraction', EMBEDDING_MODEL, { dtype: 'fp32' });
  return {
    async embed(texts: string[]): Promise<number[][]> {
      const output = await extract(texts, { pooling: 'mean', normalize: true });
      return output.tolist() as number[][];
    },
  };
}
