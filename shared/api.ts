import { z } from 'zod';

// Service contract between web/ and server/ (ARCHITECTURE.md section 9).

export const CapabilitiesResponseSchema = z.object({ ai: z.boolean() });
export type CapabilitiesResponse = z.infer<typeof CapabilitiesResponseSchema>;

export const ErrorCodeSchema = z.enum([
  'bad_request',
  'rate_limited',
  'daily_cap_reached',
  'ai_unavailable',
  'timeout',
  'internal',
]);
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export const ErrorResponseSchema = z.object({
  error: z.object({ code: ErrorCodeSchema, message: z.string() }),
});
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

/** The field group a chunk of park text came from. */
export const ChunkFieldSchema = z.enum(['overview', 'amenities', 'address', 'hours', 'size']);
export type ChunkField = z.infer<typeof ChunkFieldSchema>;

export const SearchRequestSchema = z.object({
  query: z.string().trim().min(1).max(200),
  limit: z.number().int().min(1).max(12).optional(),
});
export type SearchRequest = z.infer<typeof SearchRequestSchema>;

export const SearchResultSchema = z.object({
  parkId: z.string(),
  score: z.number(),
  field: ChunkFieldSchema,
  matchedText: z.string(),
});
export type SearchResult = z.infer<typeof SearchResultSchema>;

export const RetrievalModeSchema = z.enum(['hybrid', 'lexical']);
export type RetrievalMode = z.infer<typeof RetrievalModeSchema>;

/** results is [] exactly when the service abstained (nothing in the data matches). */
export const SearchResponseSchema = z.object({
  mode: RetrievalModeSchema,
  results: z.array(SearchResultSchema),
  abstained: z.boolean(),
  latencyMs: z.number(),
});
export type SearchResponse = z.infer<typeof SearchResponseSchema>;

export const AskRequestSchema = z.object({ query: z.string().trim().min(1).max(200) });
export type AskRequest = z.infer<typeof AskRequestSchema>;

/** parkId is derived by the server from chunkId; quote is verified against that chunk's text. */
export const CitationSchema = z.object({
  parkId: z.string(),
  chunkId: z.string(),
  quote: z.string(),
});
export type Citation = z.infer<typeof CitationSchema>;

/** One JSON body (no streaming). abstained: true means citations is [] and answer is the fixed sentence. */
export const AskResponseSchema = z.object({
  answer: z.string(),
  citations: z.array(CitationSchema),
  abstained: z.boolean(),
  mode: RetrievalModeSchema,
  latencyMs: z.number(),
  usage: z.object({ inputTokens: z.number(), outputTokens: z.number() }).optional(),
});
export type AskResponse = z.infer<typeof AskResponseSchema>;
