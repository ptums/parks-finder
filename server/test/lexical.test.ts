import { createLexicalIndex, tokenize } from '../src/rag/lexical';
import { testChunks } from './fixtures';

describe('tokenize', () => {
  it('lowercases, drops stopwords and strips a plural s', () => {
    expect(tokenize('Where are the Trails, and a dog-run?')).toEqual(['trail', 'dog', 'run']);
    expect(tokenize('Parks with a park')).toEqual([]);
    expect(tokenize('grass')).toEqual(['grass']);
  });
});

describe('BM25 index', () => {
  const index = createLexicalIndex(testChunks);

  it('ranks the chunk that contains the rare term first', () => {
    const hits = index.search('skateboarding bowls');
    expect(hits[0]?.chunk.chunkId).toBe('skate#overview');
    expect(hits[0]!.score).toBeGreaterThan(0);
  });

  it('scores more matching terms higher', () => {
    const hits = index.search('duck pond');
    expect(hits.map((h) => h.chunk.chunkId)).toEqual(['oak-park#overview']);
    const one = index.search('pond')[0]!.score;
    expect(hits[0]!.score).toBeGreaterThan(one);
  });

  it('returns nothing when no query word appears in the data', () => {
    expect(index.search('What is the capital of France?')).toEqual([]);
    expect(index.search('the of and')).toEqual([]);
  });
});
