import type { RetrievalMode, SearchResult } from '../../../shared/api';
import type { Chunk } from './chunk';
import { createLexicalIndex, type ScoredChunk } from './lexical';

/** Turns texts into normalised vectors. The real one wraps @huggingface/transformers (embedder.ts). */
export interface Embedder {
  embed(texts: string[]): Promise<number[][]>;
}

export interface Retrieval {
  mode: RetrievalMode;
  abstained: boolean;
  results: SearchResult[]; // one per park, best first
  chunks: Chunk[]; // the fused chunk list, best first (T6 feeds these to the model)
}

export interface Retriever {
  search(query: string, limit: number): Promise<Retrieval>;
}

/**
 * Set from `npm run eval:retrieval` (ARCHITECTURE.md started at 0.35). 0.30 and 0.25
 * tie on the query set (21/23 abstention decisions right, hybrid recall@3 0.96);
 * 0.35 dropped recall to 0.78 because real paraphrases score 0.32-0.37. We pick the
 * higher of the tied values so off-topic queries abstain more often.
 */
export const COSINE_THRESHOLD = 0.3;
export const RRF_K = 60;
/** A query embedding normally takes a few ms; past this we answer lexically instead of waiting. */
export const EMBED_TIMEOUT_MS = 3000;

/** Resolves like promise, or rejects after ms. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('embedding timed out')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/** Dot product. The embedder normalises vectors, so this is the cosine similarity. */
export function cosine(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i]! * (b[i] ?? 0);
  return sum;
}

/** Reciprocal rank fusion: each list adds 1 / (k + rank) to a chunk's score. Rank starts at 1. */
export function fuseRanks(lists: Chunk[][], k = RRF_K): ScoredChunk[] {
  const scores = new Map<string, ScoredChunk>();
  for (const list of lists) {
    list.forEach((chunk, index) => {
      const entry = scores.get(chunk.chunkId) ?? { chunk, score: 0 };
      entry.score += 1 / (k + index + 1);
      scores.set(chunk.chunkId, entry);
    });
  }
  return [...scores.values()].sort((a, b) => b.score - a.score);
}

/** Keeps each park's best chunk (its score, field and text), best park first. */
export function toParkResults(ranked: ScoredChunk[], limit: number): SearchResult[] {
  const seen = new Set<string>();
  const results: SearchResult[] = [];
  for (const { chunk, score } of ranked) {
    if (seen.has(chunk.parkId)) continue;
    seen.add(chunk.parkId);
    results.push({ parkId: chunk.parkId, score, field: chunk.field, matchedText: chunk.text });
  }
  return results.slice(0, limit);
}

/**
 * Abstain when the query shares no word with the data AND there is no strong
 * meaning match (lexical mode has no meaning signal at all).
 */
export function shouldAbstain(input: {
  lexicalHits: number;
  mode: RetrievalMode;
  bestCosine: number;
  threshold: number;
}): boolean {
  if (input.lexicalHits > 0) return false;
  return input.mode === 'lexical' || input.bestCosine < input.threshold;
}

export function createRetriever(
  chunks: Chunk[],
  threshold = COSINE_THRESHOLD,
  embedTimeoutMs = EMBED_TIMEOUT_MS,
) {
  const lexical = createLexicalIndex(chunks);
  let dense: { embedder: Embedder; vectors: number[][] } | undefined;

  /** Embeds every chunk once. Until this resolves, search runs in lexical mode. */
  async function enableDense(embedder: Embedder): Promise<void> {
    const vectors = await embedder.embed(chunks.map((chunk) => chunk.text));
    dense = { embedder, vectors };
  }

  /** All chunks by cosine similarity to the query, best first; undefined if dense is unavailable. */
  async function rankDense(query: string): Promise<ScoredChunk[] | undefined> {
    if (!dense) return undefined;
    try {
      const [queryVector] = await withTimeout(dense.embedder.embed([query]), embedTimeoutMs);
      if (!queryVector) return undefined;
      const vectors = dense.vectors;
      return chunks
        .map((chunk, i) => ({ chunk, score: cosine(queryVector, vectors[i] ?? []) }))
        .sort((a, b) => b.score - a.score);
    } catch {
      return undefined; // a failing or slow model degrades to lexical, never an error
    }
  }

  async function search(query: string, limit: number): Promise<Retrieval> {
    const lexicalHits = lexical.search(query);
    const denseRanked = await rankDense(query);
    const mode: RetrievalMode = denseRanked ? 'hybrid' : 'lexical';
    const bestCosine = denseRanked?.[0]?.score ?? 0;

    if (shouldAbstain({ lexicalHits: lexicalHits.length, mode, bestCosine, threshold })) {
      return { mode, abstained: true, results: [], chunks: [] };
    }

    // Dense only votes for chunks that clear the threshold, so unrelated parks don't ride along.
    const denseHits = (denseRanked ?? []).filter((hit) => hit.score >= threshold);
    const fused = fuseRanks([lexicalHits.map((h) => h.chunk), denseHits.map((h) => h.chunk)]);
    return {
      mode,
      abstained: false,
      results: toParkResults(fused, limit),
      chunks: fused.map((hit) => hit.chunk),
    };
  }

  return { search, enableDense, rankLexical: lexical.search, rankDense };
}
