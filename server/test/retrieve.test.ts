import type { Chunk } from '../src/rag/chunk';
import {
  cosine,
  createRetriever,
  fuseRanks,
  shouldAbstain,
  toParkResults,
  type Embedder,
} from '../src/rag/retrieve';
import { testChunks } from './fixtures';

const chunk = (parkId: string, field: Chunk['field']): Chunk => ({
  chunkId: `${parkId}#${field}`,
  parkId,
  field,
  text: `${parkId} ${field}`,
});

/** Maps a text to a vector by keyword, so tests control similarity exactly. */
function fakeEmbedder(): Embedder {
  const axis = (text: string) =>
    /skate|board/i.test(text) ? [1, 0, 0] : /dog|pup/i.test(text) ? [0, 1, 0] : [0, 0, 1];
  return { embed: async (texts) => texts.map(axis) };
}

describe('fuseRanks (RRF, k = 60)', () => {
  it('adds 1/(k + rank) per list, so agreement beats one strong vote', () => {
    const a = chunk('a', 'overview');
    const b = chunk('b', 'overview');
    const c = chunk('c', 'overview');
    const fused = fuseRanks([
      [a, b],
      [b, c],
    ]);
    expect(fused.map((h) => h.chunk.parkId)).toEqual(['b', 'a', 'c']);
    expect(fused[0]!.score).toBeCloseTo(1 / 62 + 1 / 61);
    expect(fused[1]!.score).toBeCloseTo(1 / 61);
  });
});

describe('toParkResults', () => {
  it("keeps each park's best chunk with its field and text", () => {
    const ranked = [
      { chunk: chunk('a', 'hours'), score: 0.5 },
      { chunk: chunk('b', 'size'), score: 0.4 },
      { chunk: chunk('a', 'overview'), score: 0.3 },
    ];
    expect(toParkResults(ranked, 5)).toEqual([
      { parkId: 'a', score: 0.5, field: 'hours', matchedText: 'a hours' },
      { parkId: 'b', score: 0.4, field: 'size', matchedText: 'b size' },
    ]);
    expect(toParkResults(ranked, 1)).toHaveLength(1);
  });
});

describe('shouldAbstain', () => {
  const base = { lexicalHits: 0, bestCosine: 0.9, threshold: 0.35 };
  it('never abstains when a query word matches', () => {
    expect(shouldAbstain({ ...base, lexicalHits: 1, mode: 'lexical' })).toBe(false);
  });
  it('abstains with no word overlap in lexical mode', () => {
    expect(shouldAbstain({ ...base, mode: 'lexical' })).toBe(true);
  });
  it('in hybrid mode abstains only below the cosine threshold', () => {
    expect(shouldAbstain({ ...base, mode: 'hybrid' })).toBe(false);
    expect(shouldAbstain({ ...base, mode: 'hybrid', bestCosine: 0.2 })).toBe(true);
  });
});

describe('cosine', () => {
  it('is the dot product of normalised vectors', () => {
    expect(cosine([1, 0], [1, 0])).toBe(1);
    expect(cosine([1, 0], [0, 1])).toBe(0);
  });
});

describe('createRetriever', () => {
  it('runs lexical-only until the embedder is enabled', async () => {
    const retriever = createRetriever(testChunks);
    const result = await retriever.search('skateboarding', 5);
    expect(result.mode).toBe('lexical');
    expect(result.results[0]?.parkId).toBe('skate');
    expect(result.abstained).toBe(false);
  });

  it('abstains on an off-topic query in lexical mode', async () => {
    const result = await createRetriever(testChunks).search('capital of France', 5);
    expect(result).toEqual({ mode: 'lexical', abstained: true, results: [], chunks: [] });
  });

  it('finds a paraphrase with no shared words through the dense side', async () => {
    const retriever = createRetriever(testChunks);
    await retriever.enableDense(fakeEmbedder());
    const result = await retriever.search('somewhere for my pup', 5);
    expect(result.mode).toBe('hybrid');
    expect(result.results.map((r) => r.parkId)).toEqual(['oak-park']);
  });

  it('abstains in hybrid mode when nothing is similar enough', async () => {
    const retriever = createRetriever(testChunks, 1.1);
    await retriever.enableDense(fakeEmbedder());
    const result = await retriever.search('somewhere for my pup', 5);
    expect(result.abstained).toBe(true);
  });

  it('falls back to lexical when the embedder throws at query time', async () => {
    const retriever = createRetriever(testChunks);
    let calls = 0;
    await retriever.enableDense({
      embed: async (texts) => {
        calls += 1;
        if (calls > 1) throw new Error('model crashed');
        return texts.map(() => [1, 0, 0]);
      },
    });
    const result = await retriever.search('skateboarding', 5);
    expect(result.mode).toBe('lexical');
    expect(result.results[0]?.parkId).toBe('skate');
  });
});
