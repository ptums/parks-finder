import { readFileSync } from 'node:fs';
import { loadParks } from '../../../shared/parks';
import { chunkParks, type Chunk } from './chunk';

/** Reads db/parks.sample.json (the data of record, used verbatim) and chunks it. */
export function loadChunks(path = 'db/parks.sample.json'): Chunk[] {
  const { parks, warnings } = loadParks(JSON.parse(readFileSync(path, 'utf8')));
  for (const warning of warnings) console.warn(warning);
  return chunkParks(parks);
}
