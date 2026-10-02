import { CapabilitiesResponseSchema, ErrorResponseSchema } from './api';

describe('api contract', () => {
  it('accepts a capabilities response and rejects a malformed one', () => {
    expect(CapabilitiesResponseSchema.safeParse({ ai: false }).success).toBe(true);
    expect(CapabilitiesResponseSchema.safeParse({ ai: 'yes' }).success).toBe(false);
  });

  it('accepts the error shape', () => {
    const body = { error: { code: 'ai_unavailable', message: 'No key' } };
    expect(ErrorResponseSchema.safeParse(body).success).toBe(true);
  });
});
