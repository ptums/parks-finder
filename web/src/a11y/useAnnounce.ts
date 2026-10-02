import { useContext } from 'react';
import { AnnounceContext } from './LiveRegion';

/** Returns announce(text), which speaks text through the polite live region. */
export function useAnnounce(): (text: string) => void {
  return useContext(AnnounceContext);
}
