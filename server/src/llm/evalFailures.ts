import { LlmError } from './types';

/** How many failed queries in a row, all alike, make eval:ask stop early. */
export const EARLY_STOP_AFTER = 3;

/** Short label for a failed call, e.g. "400 invalid_request_error". Never includes a message. */
export function failureLabel(error: unknown): string {
  if (error instanceof LlmError) {
    return (
      [error.status, error.providerType].filter((part) => part !== undefined).join(' ') ||
      'LlmError'
    );
  }
  return error instanceof Error ? error.name : 'unknown error';
}

/** True when the first EARLY_STOP_AFTER queries all failed with the same label (no successes). */
export function shouldStopEarly(labels: string[], succeeded: number): boolean {
  if (succeeded > 0 || labels.length < EARLY_STOP_AFTER) return false;
  return labels.slice(0, EARLY_STOP_AFTER).every((label) => label === labels[0]);
}
