/**
 * In-memory daily request cap for /v1/ask, to protect API spend on the public deployment.
 * It resets at UTC midnight. Limitation: the count lives in one process, so each Fly
 * machine has its own count and a restart resets it. limit 0 means no cap.
 */
export interface DailyCap {
  /** Counts one request. Returns null if allowed, or the seconds until the next UTC midnight. */
  take(): number | null;
}

function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function secondsUntilUtcMidnight(date: Date): number {
  const midnight = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1);
  return Math.max(1, Math.ceil((midnight - date.getTime()) / 1000));
}

export function createDailyCap(limit: number, now: () => Date = () => new Date()): DailyCap {
  let day = utcDay(now());
  let count = 0;

  return {
    take() {
      if (limit <= 0) return null;
      const current = now();
      if (utcDay(current) !== day) {
        day = utcDay(current);
        count = 0;
      }
      if (count >= limit) return secondsUntilUtcMidnight(current);
      count += 1;
      return null;
    },
  };
}
