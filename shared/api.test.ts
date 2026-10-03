import {
  CapabilitiesResponseSchema,
  ErrorResponseSchema,
  SearchRequestSchema,
  SearchResponseSchema,
} from './api';

describe('api contract', () => {
  it('accepts a capabilities response and rejects a malformed one', () => {
    expect(CapabilitiesResponseSchema.safeParse({ ai: false }).success).toBe(true);
    expect(CapabilitiesResponseSchema.safeParse({ ai: 'yes' }).success).toBe(false);
  });

  it('accepts the error shape and rejects unknown codes', () => {
    const body = { error: { code: 'ai_unavailable', message: 'No key' } };
    expect(ErrorResponseSchema.safeParse(body).success).toBe(true);
    const bad = { error: { code: 'nope', message: 'x' } };
    expect(ErrorResponseSchema.safeParse(bad).success).toBe(false);
  });

  it('trims the search query and enforces 1..200 characters', () => {
    expect(SearchRequestSchema.parse({ query: '  dog run  ' }).query).toBe('dog run');
    expect(SearchRequestSchema.safeParse({ query: '   ' }).success).toBe(false);
    expect(SearchRequestSchema.safeParse({ query: 'a'.repeat(201) }).success).toBe(false);
    expect(SearchRequestSchema.safeParse({ query: 'a', limit: 13 }).success).toBe(false);
  });

  it('accepts a search response', () => {
    const body = {
      mode: 'hybrid',
      results: [{ parkId: 'p', score: 0.03, field: 'amenities', matchedText: 'P. Dog run' }],
      abstained: false,
      latencyMs: 4,
    };
    expect(SearchResponseSchema.safeParse(body).success).toBe(true);
  });
});
