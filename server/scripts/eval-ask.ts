// Manual answer eval (FR-26). Calls the real Anthropic API, so it never runs in CI.
// Runs each query in server/evals/queries.json through the same steps as /v1/ask
// (retrieve -> abstain or generate -> verify) and reports:
//   - citation validity: citations that passed verification / citations the model gave
//   - abstention accuracy: negative, trap and prompt-leak queries must abstain; others should answer
//   - possible unsupported facts: numbers and capitalised words in an answer that appear in
//     none of the retrieved chunks (a crude flag for the human spot-check, not a verdict)
// Usage: ANTHROPIC_API_KEY=... npm run eval:ask   (or put the key in .env.local)
import { readFileSync } from 'node:fs';
import { loadConfig } from '../src/config';
import { createAnthropicLlm } from '../src/llm/anthropic';
import { loadEmbedder } from '../src/rag/embedder';
import { buildAskRequest, MAX_CHUNKS, TIMEOUT_MS } from '../src/rag/generate';
import { loadChunks } from '../src/rag/index';
import { createRetriever } from '../src/rag/retrieve';
import { normalise, verifyAnswer } from '../src/rag/verifyCitations';

try {
  process.loadEnvFile('.env.local');
} catch {
  // no .env.local: rely on the real environment
}

const config = loadConfig();
if (config.anthropicKey === '') {
  console.log('eval:ask needs a real Anthropic key and calls the paid API, so it is manual.');
  console.log('Run it with:  ANTHROPIC_API_KEY=<your key> npm run eval:ask');
  console.log('No key is set, so nothing was run.');
  process.exit(0);
}

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
const retriever = createRetriever(chunks);
try {
  await retriever.enableDense(await loadEmbedder(config.modelCacheDir));
} catch {
  console.warn('WARNING: embedding model could not load; retrieval is lexical only.\n');
}
const llm = createAnthropicLlm(config.anthropicKey);

/** The query set has no "should abstain" flag, so: no relevant parks, a trap, or a prompt leak. */
function shouldAbstain(q: EvalQuery): boolean {
  return q.relevant.length === 0 || q.type === 'trap';
}

/** Numbers and capitalised words in the answer that no retrieved chunk contains. */
function possibleUnsupported(answer: string, chunkText: string): string[] {
  const words = answer.match(/\b(\d[\d.,]*|[A-Z][a-z]+)\b/g) ?? [];
  const ignore = new Set(['The', 'It', 'Yes', 'No', 'This', 'There', 'Both', 'Park', 'Parks']);
  return [...new Set(words)].filter((w) => !ignore.has(w) && !chunkText.includes(normalise(w)));
}

let given = 0;
let valid = 0;
let abstainRight = 0;
let unsupportedTotal = 0;
const spotCheck: string[] = [];

for (const q of queries) {
  const retrieval = await retriever.search(q.query, MAX_CHUNKS);
  const top = retrieval.chunks.slice(0, MAX_CHUNKS);
  let result = { answer: '', abstained: true, citations: [] as { chunkId: string }[], dropped: 0 };
  let tokens = '';
  if (!retrieval.abstained && top.length > 0) {
    const reply = await llm.create(buildAskRequest(q.query, top, config.anthropicModel), {
      timeoutMs: TIMEOUT_MS,
    });
    result = verifyAnswer(reply.text, top);
    tokens = ` tokens ${reply.inputTokens}/${reply.outputTokens}`;
  }
  given += result.citations.length + result.dropped;
  valid += result.citations.length;
  if (result.abstained === shouldAbstain(q)) abstainRight += 1;

  const flagged = result.abstained
    ? []
    : possibleUnsupported(result.answer, normalise(top.map((c) => c.text).join(' ')));
  unsupportedTotal += flagged.length;

  const expected = shouldAbstain(q) ? 'abstain' : 'answer';
  const got = result.abstained ? 'abstained' : 'answered';
  spotCheck.push(
    `[${q.id}] (${q.type}) expected ${expected}, ${got}${tokens}\n` +
      `  Q: ${q.query}\n` +
      (result.abstained
        ? ''
        : `  A: ${result.answer}\n  cites: ${result.citations.map((c) => c.chunkId).join(', ')}\n`) +
      (result.dropped > 0 ? `  dropped citations: ${result.dropped}\n` : '') +
      (flagged.length > 0 ? `  CHECK possible unsupported: ${flagged.join(', ')}\n` : ''),
  );
}

console.log(`Model: ${config.anthropicModel}\n`);
console.log(spotCheck.join('\n'));
const pct = (n: number, d: number) => (d === 0 ? 'n/a' : `${((100 * n) / d).toFixed(0)}%`);
console.log('Summary');
console.log(`  citation validity:   ${valid}/${given} (${pct(valid, given)})`);
console.log(
  `  abstention accuracy: ${abstainRight}/${queries.length} (${pct(abstainRight, queries.length)})`,
);
console.log(`  possible unsupported facts flagged: ${unsupportedTotal} (read each one above)`);
