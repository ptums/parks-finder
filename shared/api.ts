import { z } from 'zod';

// Service contract. AI search is cut for now; only the capabilities response exists.
export const CapabilitiesResponseSchema = z.object({ ai: z.boolean() });
export type CapabilitiesResponse = z.infer<typeof CapabilitiesResponseSchema>;

export const ErrorResponseSchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
