import { z } from 'zod';
import type { Citation } from '../../../shared/api';
import type { Chunk } from './chunk';

export const ABSTAIN_ANSWER = "I don't have that information in the park data.";

// A quote must be long enough to carry a fact (an empty quote would match every chunk).
export const MIN_QUOTE_LENGTH = 12;

// Capitalised words that are fine anywhere in an answer even though no chunk contains them.
const ALLOWED_CAPITALISED = new Set(['i', 'the']);

const ModelAnswerSchema = z.object({
  answer: z.string().trim().min(1),
  citations: z.array(z.object({ chunkId: z.string(), quote: z.string() })),
});

/** Why the server abstained after asking the model (logged, and counted by eval:ask). */
export type AbstainReason =
  | 'retrieval' // weak evidence: the model was never asked
  | 'unparseable' // not JSON, wrong shape, or the model chose {"abstain": true}
  | 'no_citations'
  | 'citation_failed' // some citation's chunk was not retrieved, or its quote is not in it
  | 'unsupported_fact'; // a name or number in the answer is in none of the cited chunks

export interface VerifiedAnswer {
  answer: string;
  citations: Citation[];
  abstained: boolean;
  reason?: AbstainReason;
}

const abstain = (reason: AbstainReason): VerifiedAnswer => ({
  answer: ABSTAIN_ANSWER,
  citations: [],
  abstained: true,
  reason,
});

/** Lowercase and collapse all whitespace, so "Dog  Run" matches "dog run". */
export function normalise(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Lowercase words and numbers in a text ("4.7" stays one token). */
function words(text: string): string[] {
  return text.toLowerCase().match(/\d+(?:[.,]\d+)*|[\p{L}'’-]+/gu) ?? [];
}

/** Every chunk starts with "<park name>. ", so the name is the text before the first ". ". */
function parkName(chunk: Chunk): string {
  const end = chunk.text.indexOf('. ');
  return end === -1 ? chunk.text : chunk.text.slice(0, end);
}

/** Parses the model's JSON, tolerating a ```json code fence. Returns undefined if it is not JSON. */
export function parseModelJson(text: string): unknown {
  const unfenced = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  try {
    return JSON.parse(unfenced);
  } catch {
    return undefined;
  }
}

/**
 * A quote proves something only if it is in the chunk, is at least MIN_QUOTE_LENGTH
 * characters, and has a word beyond the park name (every chunk starts with the name,
 * so a name-only quote would "support" any claim about that park).
 */
export function quoteIsValid(quote: string, chunk: Chunk): boolean {
  const wanted = normalise(quote);
  if (wanted.length < MIN_QUOTE_LENGTH) return false;
  if (!normalise(chunk.text).includes(wanted)) return false;
  const nameWords = new Set(words(parkName(chunk)));
  return words(wanted).some((word) => !nameWords.has(word));
}

/**
 * Names and numbers in the answer that appear in none of the given texts.
 * Rule (kept simple on purpose): every number, and every capitalised word except the
 * first word of a sentence and "I"/"The", must appear as a word in the cited chunks.
 */
export function unsupportedFacts(answer: string, citedTexts: string[]): string[] {
  const known = new Set(citedTexts.flatMap(words));
  const missing = new Set<string>();
  for (const sentence of answer.split(/(?<=[.!?])\s+/)) {
    const tokens = sentence.match(/\d+(?:[.,]\d+)*|[\p{L}'’-]+/gu) ?? [];
    tokens.forEach((token, index) => {
      const isNumber = /^\d/.test(token);
      const isCapitalised = /^\p{Lu}/u.test(token);
      if (!isNumber && (!isCapitalised || index === 0)) return;
      const lower = token.toLowerCase().replace(/[.,]$/, '');
      if (ALLOWED_CAPITALISED.has(lower) || known.has(lower)) return;
      missing.add(token);
    });
  }
  return [...missing];
}

/**
 * Returns the model's answer only if every citation checks out against the chunks
 * retrieved for this question, and every name and number in the answer appears in a
 * cited chunk. Otherwise abstains: unverified model text is never returned.
 * parkId comes from our chunk, never from the model.
 */
export function verifyAnswer(modelText: string, retrieved: Chunk[]): VerifiedAnswer {
  const parsed = ModelAnswerSchema.safeParse(parseModelJson(modelText));
  if (!parsed.success) return abstain('unparseable');
  if (parsed.data.citations.length === 0) return abstain('no_citations');

  const byId = new Map(retrieved.map((chunk) => [chunk.chunkId, chunk]));
  const citations: Citation[] = [];
  const citedTexts: string[] = [];
  for (const { chunkId, quote } of parsed.data.citations) {
    const chunk = byId.get(chunkId);
    // One bad citation means the answer may rest on it, so the whole answer goes.
    if (!chunk || !quoteIsValid(quote, chunk)) return abstain('citation_failed');
    citations.push({ parkId: chunk.parkId, chunkId, quote: quote.trim() });
    citedTexts.push(chunk.text);
  }

  if (unsupportedFacts(parsed.data.answer, citedTexts).length > 0) {
    return abstain('unsupported_fact');
  }
  return { answer: parsed.data.answer, citations, abstained: false };
}
