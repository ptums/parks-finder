import { readFileSync, readdirSync } from 'node:fs';
import { loadParks } from '../shared/parks';
import { ImageMapSchema, checkImageMap } from '../shared/imageMap';

const readJson = (relative: string) =>
  JSON.parse(readFileSync(new URL(relative, import.meta.url), 'utf8'));

try {
  const { parks, warnings } = loadParks(readJson('../db/parks.sample.json'));
  for (const warning of warnings) console.warn(warning);
  console.log(`${parks.length} parks loaded, ${warnings.length} skipped.`);

  const imageMap = ImageMapSchema.parse(readJson('../db/park-images.json'));
  const files = readdirSync(new URL('../images/', import.meta.url));
  const problems = checkImageMap(
    imageMap,
    parks.map((p) => p.id),
    files,
  );
  if (problems.length > 0) throw new Error(problems.join('\n'));
  console.log(`Image map OK: ${Object.keys(imageMap).length} parks mapped.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
