// Offline retrieval eval: recall@3 and MRR for lexical, dense and hybrid, plus
// abstention accuracy and a cosine-threshold sweep. Runs lexical-only (with a
// warning) when the embedding model can't load. Always exits 0 unless it crashes:
// it reports misses, it does not gate on them.
import { readFileSync } from 'node:fs';
import { loadConfig } from '../src/config';
import { loadEmbedder } from '../src/rag/embedder';
import { loadChunks } from '../src/rag/index';
import { tokenize } from '../src/rag/lexical';
import {
  COSINE_THRESHOLD,
  createRetriever,
  shouldAbstain,
  toParkResults,
} from '../src/rag/retrieve';

interface EvalQuery {
  id: string;
  type: string;
  query: string;
  relevant: string[];
}

const { queries } = JSON.parse(readFileSync('server/evals/queries.json', 'utf8')) as {
  queries: EvalQuery[];
};
const chunks = loadChunks();
// `npm run eval:retrieval -- --threshold 0.3` tries another cosine threshold.
const flag = process.argv.indexOf('--threshold');
const threshold = flag === -1 ? COSINE_THRESHOLD : Number(process.argv[flag + 1]);
const retriever = createRetriever(chunks, threshold);
const dataWords = new Set(chunks.flatMap((chunk) => tokenize(chunk.text)));

let denseReady = false;
try {
  await retriever.enableDense(await loadEmbedder(loadConfig().modelCacheDir));
  denseReady = true;
} catch {
  console.warn('WARNING: embedding model could not load; reporting lexical only.\n');
}

interface Row {
  q: EvalQuery;
  lexical: string[];
  dense: string[];
  hybrid: string[];
  hybridAbstained: boolean;
  lexicalAbstained: boolean;
  bestCosine: number;
  lexicalHits: number;
}

const rows: Row[] = [];
for (const q of queries) {
  const lexicalHits = retriever.rankLexical(q.query);
  const denseRanked = (await retriever.rankDense(q.query)) ?? [];
  const hybrid = await retriever.search(q.query, 12);
  rows.push({
    q,
    lexical: toParkResults(lexicalHits, 12).map((r) => r.parkId),
    dense: toParkResults(denseRanked, 12).map((r) => r.parkId),
    hybrid: hybrid.results.map((r) => r.parkId),
    hybridAbstained: hybrid.abstained,
    lexicalAbstained: lexicalHits.length === 0,
    bestCosine: denseRanked[0]?.score ?? 0,
    lexicalHits: lexicalHits.length,
  });
}

function recallAt3(ranked: string[], relevant: string[]): number {
  const top = ranked.slice(0, 3);
  // Some queries have more than 3 relevant parks; 3 found is a perfect score.
  return relevant.filter((id) => top.includes(id)).length / Math.min(relevant.length, 3);
}

function reciprocalRank(ranked: string[], relevant: string[]): number {
  const index = ranked.findIndex((id) => relevant.includes(id));
  return index === -1 ? 0 : 1 / (index + 1);
}

const positives = rows.filter((row) => row.q.relevant.length > 0);
const average = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
const fmt = (n: number) => n.toFixed(2);

const modes: ['lexical' | 'dense' | 'hybrid', boolean][] = [
  ['lexical', true],
  ['dense', denseReady],
  ['hybrid', denseReady],
];
console.log(`Retrieval eval: ${queries.length} queries (${positives.length} with relevant parks)`);
console.log(`Cosine threshold: ${threshold}\n`);
console.log('| Mode | Recall@3 | MRR | Abstention accuracy |');
console.log('| --- | --- | --- | --- |');
for (const [mode, available] of modes) {
  if (!available) {
    console.log(`| ${mode} | n/a | n/a | n/a |`);
    continue;
  }
  const recall = average(positives.map((row) => recallAt3(row[mode], row.q.relevant)));
  const mrr = average(positives.map((row) => reciprocalRank(row[mode], row.q.relevant)));
  const abstainCorrect = (row: Row) =>
    (mode === 'lexical' ? row.lexicalAbstained : row.hybridAbstained) ===
    (row.q.relevant.length === 0);
  // Dense alone never abstains on its own in the service; abstention is reported for lexical and hybrid.
  const abstention =
    mode === 'dense' ? 'n/a' : fmt(average(rows.map((r) => (abstainCorrect(r) ? 1 : 0))));
  console.log(`| ${mode} | ${fmt(recall)} | ${fmt(mrr)} | ${abstention} |`);
}

if (denseReady) {
  console.log('\nThreshold sweep (hybrid abstention accuracy over all queries):');
  for (const threshold of [0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5]) {
    const correct = rows.filter(
      (row) =>
        shouldAbstain({
          lexicalHits: row.lexicalHits,
          mode: 'hybrid',
          bestCosine: row.bestCosine,
          threshold,
        }) ===
        (row.q.relevant.length === 0),
    ).length;
    console.log(`  ${threshold.toFixed(2)}: ${correct}/${rows.length}`);
  }
}

console.log('\nPer query (top 3; "-" = abstained):');
for (const row of rows) {
  const top = (ids: string[], abstained = false) =>
    abstained ? '-' : ids.slice(0, 3).join(', ') || '-';
  const overlap = tokenize(row.q.query).filter((word) => dataWords.has(word));
  const leak =
    (row.q.type === 'paraphrase' || row.q.type === 'negative') && overlap.length > 0
      ? ` WARNING shares words with data: ${overlap.join(', ')}`
      : '';
  console.log(
    `- ${row.q.id} [${row.q.type}] expected: ${row.q.relevant.join(', ') || 'abstain'}${leak}`,
  );
  console.log(`    lexical: ${top(row.lexical, row.lexicalAbstained)}`);
  if (denseReady) {
    console.log(`    dense:   ${top(row.dense)} (best cosine ${fmt(row.bestCosine)})`);
    console.log(`    hybrid:  ${top(row.hybrid, row.hybridAbstained)}`);
  }
}
