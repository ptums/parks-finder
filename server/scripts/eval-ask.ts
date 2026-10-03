// Manual answer eval (FR-26). Calls the real Anthropic API, so it never runs in CI.
// Runs each query in server/evals/queries.json through the same steps as /v1/ask
// (retrieve -> abstain or generate -> verify) and reports:
//   - citation validity: citations that passed verification / citations the model gave
//   - abstention accuracy: negative, trap and prompt-leak queries must abstain; others should answer
//   - unsupported facts caught: answers the verifier rejected because a name or number in
//     them appears in no cited chunk (verifyCitations.ts unsupportedFacts; same rule as /v1/ask)
// Usage: ANTHROPIC_API_KEY=... npm run eval:ask   (or put the key in .env.local)
import { readFileSync } from 'node:fs';
import { loadConfig } from '../src/config';
import { createAnthropicLlm } from '../src/llm/anthropic';
import { failureLabel, shouldStopEarly } from '../src/llm/evalFailures';
import { loadEmbedder } from '../src/rag/embedder';
import { buildAskRequest, MAX_CHUNKS, TIMEOUT_MS } from '../src/rag/generate';
import { loadChunks } from '../src/rag/index';
import { createRetriever } from '../src/rag/retrieve';
import { verifyAnswer, type VerifiedAnswer } from '../src/rag/verifyCitations';

const PROBLEM_TEXT = {
  chunk_not_retrieved: 'chunk was not retrieved for this question',
  quote_too_short: 'quote too short',
  quote_not_in_chunk: 'quote not in chunk',
  quote_is_only_park_name: 'quote is only the park name',
} as const;

/** Why an abstained query abstained, one line per rejected citation (model text only; no secrets). */
function abstainDetails(result: VerifiedAnswer, modelText: string): string {
  const lines = (result.rejected ?? []).map(
    (r) => `  rejected: ${r.chunkId} "${r.quote}" -> ${PROBLEM_TEXT[r.problem]}\n`,
  );
  if (result.unsupported?.length) {
    lines.push(`  unsupported words: ${result.unsupported.join(', ')}\n`);
  }
  if (result.reason === 'unparseable' || result.reason === 'no_citations') {
    lines.push(`  model said: ${modelText.slice(0, 300).replace(/\s+/g, ' ')}\n`);
  }
  return lines.join('');
}

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

let asked = 0;
let citationFailures = 0;
let abstainRight = 0;
let unsupportedTotal = 0;
let errored = 0;
let stoppedReason = '';
const failureLabels: string[] = [];
const spotCheck: string[] = [];

for (const q of queries) {
  const retrieval = await retriever.search(q.query, MAX_CHUNKS);
  const top = retrieval.chunks.slice(0, MAX_CHUNKS);
  let result: VerifiedAnswer = { answer: '', citations: [], abstained: true, reason: 'retrieval' };
  let tokens = '';
  let modelText = '';
  if (!retrieval.abstained && top.length > 0) {
    try {
      const reply = await llm.create(buildAskRequest(q.query, top, config.anthropicModel), {
        timeoutMs: TIMEOUT_MS,
      });
      modelText = reply.text;
      result = verifyAnswer(modelText, top);
      tokens = ` tokens ${reply.inputTokens}/${reply.outputTokens}`;
      asked += 1;
    } catch (error) {
      const label = failureLabel(error);
      failureLabels.push(label);
      errored += 1;
      spotCheck.push(`[${q.id}] (${q.type}) ERROR ${label}\n  Q: ${q.query}\n`);
      if (shouldStopEarly(failureLabels, asked)) {
        stoppedReason = `Stopped: every call failed with ${label}. Check the account's credit balance or the key.`;
        break;
      }
      continue;
    }
  }
  if (result.reason === 'citation_failed') citationFailures += 1;
  if (result.reason === 'unsupported_fact') unsupportedTotal += 1;
  if (result.abstained === shouldAbstain(q)) abstainRight += 1;

  const expected = shouldAbstain(q) ? 'abstain' : 'answer';
  const got = result.abstained ? `abstained (${result.reason})` : 'answered';
  spotCheck.push(
    `[${q.id}] (${q.type}) expected ${expected}, ${got}${tokens}\n` +
      `  Q: ${q.query}\n` +
      (result.abstained
        ? abstainDetails(result, modelText)
        : `  A: ${result.answer}\n  cites: ${result.citations.map((c) => c.quote).join(' | ')}\n`),
  );
}

console.log(`Model: ${config.anthropicModel}\n`);
console.log(spotCheck.join('\n'));
if (stoppedReason) {
  console.log(stoppedReason);
  process.exit(1);
}
const pct = (n: number, d: number) => (d === 0 ? 'n/a' : `${((100 * n) / d).toFixed(0)}%`);
console.log('Summary');
const scored = queries.length - errored;
const citedOk = asked - citationFailures;
console.log(
  `  citation validity (answers whose citations all verified): ${citedOk}/${asked} (${pct(citedOk, asked)})`,
);
console.log(
  `  abstention accuracy: ${abstainRight}/${scored} (${pct(abstainRight, scored)}), not counting errors`,
);
console.log(`  queries that errored (model call failed): ${errored}`);
console.log(`  answers rejected for unsupported facts: ${unsupportedTotal}`);
console.log('  Read every answer above: the fact check only covers names and numbers.');
