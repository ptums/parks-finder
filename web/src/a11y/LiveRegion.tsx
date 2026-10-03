import { createContext, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

export const AnnounceContext = createContext<(text: string) => void>(() => {});

/** How long each message stays before a newer one may replace it (ms). */
export const MIN_HOLD_MS = 1500;
const CLEAR_DELAY_MS = 50;

/**
 * Renders the one polite status region and lets any child call announce(text).
 * A message is held for MIN_HOLD_MS so a later message (e.g. "AI search is available.")
 * cannot overwrite it before a screen reader reads it. Only the latest waiting message is kept.
 */
export function LiveRegionProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('');
  const showTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const holdTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const holdUntil = useRef(0);

  // Clear first, then set after a short delay, so repeating the same text is read again.
  const show = useCallback((text: string) => {
    holdUntil.current = Date.now() + CLEAR_DELAY_MS + MIN_HOLD_MS;
    setMessage('');
    showTimer.current = setTimeout(() => setMessage(text), CLEAR_DELAY_MS);
  }, []);

  const announce = useCallback(
    (text: string) => {
      clearTimeout(holdTimer.current);
      const wait = holdUntil.current - Date.now();
      if (wait <= 0) {
        clearTimeout(showTimer.current);
        show(text);
      } else {
        // Still holding the current message: this text replaces any earlier waiting one.
        holdTimer.current = setTimeout(() => show(text), wait);
      }
    },
    [show],
  );

  useEffect(
    () => () => {
      clearTimeout(showTimer.current);
      clearTimeout(holdTimer.current);
    },
    [],
  );

  return (
    <AnnounceContext.Provider value={announce}>
      {children}
      <div role="status" aria-live="polite" aria-atomic="true" className="visually-hidden">
        {message}
      </div>
    </AnnounceContext.Provider>
  );
}
