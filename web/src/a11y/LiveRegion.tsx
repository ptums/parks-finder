import { createContext, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

export const AnnounceContext = createContext<(text: string) => void>(() => {});

/** Renders the one polite status region and lets any child call announce(text). */
export function LiveRegionProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Clear first, then set after a short delay, so repeating the same text is read again.
  const announce = useCallback((text: string) => {
    clearTimeout(timer.current);
    setMessage('');
    timer.current = setTimeout(() => setMessage(text), 50);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <AnnounceContext.Provider value={announce}>
      {children}
      <div role="status" aria-live="polite" aria-atomic="true" className="visually-hidden">
        {message}
      </div>
    </AnnounceContext.Provider>
  );
}
