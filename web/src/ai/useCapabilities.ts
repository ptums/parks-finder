import { useEffect, useState } from 'react';
import { useAnnounce } from '../a11y/useAnnounce';
import { env } from '../env';
import { useDispatch } from '../state/AppState';
import { fetchCapabilities } from './client';

export const RETRY_DELAYS_MS = [2000, 4000, 8000, 16000, 30000];

/**
 * Asks the service whether AI is on. Standard UI never waits for this.
 * No ragUrl: no request at all. {ai:true}: dispatches aiAvailable and announces it once.
 * Failures retry on a backoff, then stop. Returns true while an answer may still arrive.
 */
export function useCapabilities(): boolean {
  const dispatch = useDispatch();
  const announce = useAnnounce();
  const [pending, setPending] = useState(Boolean(env.ragUrl));

  useEffect(() => {
    if (!env.ragUrl) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function attempt(index: number) {
      try {
        const ai = await fetchCapabilities();
        if (cancelled) return;
        setPending(false);
        if (ai) {
          dispatch({ type: 'aiAvailable' });
          announce('AI search is available.');
        }
      } catch {
        if (cancelled) return;
        if (index >= RETRY_DELAYS_MS.length) return setPending(false);
        timer = setTimeout(() => attempt(index + 1), RETRY_DELAYS_MS[index]);
      }
    }

    attempt(0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [dispatch, announce]);

  return pending;
}
