import type { Chunk } from './chunk';

// Common words that carry no meaning for park search. "park" is here because
// nearly every query says it and three park names contain it.
const STOPWORDS = new Set(
  (
    'a an and are as at be by can do does for from has have how i in is it its me my of on ' +
    'or our park the their there this to was what when where which who will with you your'
  ).split(' '),
);

/** Lowercase word tokens, stopwords removed, a simple plural "s" stripped ("trails" -> "trail"). */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .map((word) =>
      word.length > 3 && word.endsWith('s') && !word.endsWith('ss') ? word.slice(0, -1) : word,
    )
    .filter((word) => word !== '' && !STOPWORDS.has(word));
}

export interface ScoredChunk {
  chunk: Chunk;
  score: number;
}

const K1 = 1.2;
const B = 0.75;

/** BM25 over the chunks. Small enough to read in one sitting; no dependency. */
export function createLexicalIndex(chunks: Chunk[]) {
  const docs = chunks.map((chunk) => tokenize(chunk.text));
  const avgLength = docs.reduce((sum, doc) => sum + doc.length, 0) / Math.max(docs.length, 1);

  // How many chunks contain each term.
  const docFreq = new Map<string, number>();
  for (const doc of docs) {
    for (const term of new Set(doc)) docFreq.set(term, (docFreq.get(term) ?? 0) + 1);
  }

  function idf(term: string): number {
    const n = docFreq.get(term) ?? 0;
    return Math.log(1 + (docs.length - n + 0.5) / (n + 0.5));
  }

  /** Chunks with at least one query term, best first. An empty list means no term overlap. */
  function search(query: string): ScoredChunk[] {
    const terms = [...new Set(tokenize(query))];
    const hits: ScoredChunk[] = [];
    docs.forEach((doc, i) => {
      let score = 0;
      for (const term of terms) {
        const tf = doc.filter((word) => word === term).length;
        if (tf === 0) continue;
        score += (idf(term) * tf * (K1 + 1)) / (tf + K1 * (1 - B + (B * doc.length) / avgLength));
      }
      if (score > 0) hits.push({ chunk: chunks[i]!, score });
    });
    return hits.sort((a, b) => b.score - a.score);
  }

  return { search };
}
