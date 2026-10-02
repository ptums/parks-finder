import type { SearchResult } from '../../../shared/api';
import type { Park } from '../../../shared/parks';

/** Keeps only parks the AI search returned. */
export function narrowByAi(parks: Park[], results: SearchResult[]): Park[] {
  const ids = new Set(results.map((result) => result.parkId));
  return parks.filter((park) => ids.has(park.id));
}

/** Orders parks by the AI's ranking (best match first). */
export function aiRank(parks: Park[], results: SearchResult[]): Park[] {
  const rank = (park: Park) => results.findIndex((result) => result.parkId === park.id);
  return [...parks].sort((a, b) => rank(a) - rank(b));
}

/** The best (first) result for a park, used to show why it matched. */
export function matchFor(results: SearchResult[], parkId: string): SearchResult | undefined {
  return results.find((result) => result.parkId === parkId);
}
