import { failureLabel, shouldStopEarly } from '../src/llm/evalFailures';
import { LlmError, LlmTimeoutError } from '../src/llm/types';

describe('failureLabel', () => {
  it('uses status and provider type, never the message', () => {
    expect(failureLabel(new LlmError({ status: 400, providerType: 'invalid_request_error' }))).toBe(
      '400 invalid_request_error',
    );
  });
  it('handles an LlmError with no details and other errors', () => {
    expect(failureLabel(new LlmError())).toBe('LlmError');
    expect(failureLabel(new LlmTimeoutError())).toBe('LlmTimeoutError');
    expect(failureLabel('boom')).toBe('unknown error');
  });
});

describe('shouldStopEarly', () => {
  const same = '400 invalid_request_error';
  it('stops when the first three failures match and nothing succeeded', () => {
    expect(shouldStopEarly([same, same, same], 0)).toBe(true);
  });
  it('keeps going with fewer than three, mixed failures, or any success', () => {
    expect(shouldStopEarly([same, same], 0)).toBe(false);
    expect(shouldStopEarly([same, '429 rate_limit_error', same], 0)).toBe(false);
    expect(shouldStopEarly([same, same, same], 1)).toBe(false);
  });
});
