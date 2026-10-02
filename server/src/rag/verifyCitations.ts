import { z } from 'zod';
import type { Citation } from '../../../shared/api';
import type { Chunk } from './chunk';

export const ABSTAIN_ANSWER = "I don't have that information in the park data.";

// Quotes shorter than this are too weak to prove anything (an empty quote matches every chunk).
const MIN_QUOTE_LENGTH = 3;

const ModelAnswerSchema = z.object({
  answer: z.string().trim().min(1),
  citations: z.array(z.object({ chunkId: z.string(), quote: z.string() })),
});

export interface VerifiedAnswer {
  answer: string;
  citations: Citation[];
  abstained: boolean;
  /** Citations the model gave that failed verification (logged and reported by eval:ask). */
  dropped: number;
}

const abstain = (dropped = 0): VerifiedAnswer => ({
  answer: ABSTAIN_ANSWER,
  citations: [],
  abstained: true,
  dropped,
});

/** Lowercase and collapse all whitespace, so "Dog  Run" matches "dog run". */
export function normalise(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
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
 * Keeps a citation only if its chunk was retrieved for this question and its quote
 * really appears in that chunk. parkId comes from our chunk, never from the model.
 * No valid citation left means we abstain: unverified model text is never returned.
 */
export function verifyAnswer(modelText: string, retrieved: Chunk[]): VerifiedAnswer {
  const parsed = ModelAnswerSchema.safeParse(parseModelJson(modelText));
  if (!parsed.success) return abstain(); // malformed JSON, or {"abstain": true}

  const byId = new Map(retrieved.map((chunk) => [chunk.chunkId, chunk]));
  const citations: Citation[] = [];
  for (const { chunkId, quote } of parsed.data.citations) {
    const chunk = byId.get(chunkId);
    const wanted = normalise(quote);
    if (!chunk || wanted.length < MIN_QUOTE_LENGTH) continue;
    if (!normalise(chunk.text).includes(wanted)) continue;
    citations.push({ parkId: chunk.parkId, chunkId, quote: quote.trim() });
  }

  const dropped = parsed.data.citations.length - citations.length;
  if (citations.length === 0) return abstain(dropped);
  return { answer: parsed.data.answer, citations, abstained: false, dropped };
}
