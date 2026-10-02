import { readFileSync } from 'node:fs';
import { loadParks } from '../shared/parks';

const path = new URL('../db/parks.sample.json', import.meta.url);
try {
  const { parks, warnings } = loadParks(JSON.parse(readFileSync(path, 'utf8')));
  for (const warning of warnings) console.warn(warning);
  console.log(`${parks.length} parks loaded, ${warnings.length} skipped.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
