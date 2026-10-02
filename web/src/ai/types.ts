import { z } from 'zod';

// Contract for POST /v1/ask (REQUIREMENTS section 0, item 4). It lives here, not in shared/,
// until the server branch that implements it is merged.
export const CitationSchema = z.object({
  parkId: z.string(),
  chunkId: z.string(),
  quote: z.string(),
});
export type Citation = z.infer<typeof CitationSchema>;

export const AskResponseSchema = z.object({
  answer: z.string(),
  citations: z.array(CitationSchema),
  abstained: z.boolean(),
  mode: z.string().optional(),
  usage: z.unknown().optional(),
  latencyMs: z.number().optional(),
});
export type AiAnswer = z.infer<typeof AskResponseSchema>;
