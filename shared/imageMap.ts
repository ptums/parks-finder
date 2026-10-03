import { z } from 'zod';
import type { Park } from './parks';

/** db/park-images.json: park id -> ordered photo files (in images/) with alt text. */
export const ImageMapSchema = z.record(
  z.string(),
  z.array(z.object({ file: z.string().min(1), alt: z.string().min(1) })),
);

export type ImageMap = z.infer<typeof ImageMapSchema>;

/** Replaces the images of every mapped park. Parks not in the map keep their own. */
export function applyImageMap(
  parks: Park[],
  map: ImageMap,
  fileToUrl: (file: string) => string,
): Park[] {
  return parks.map((park) => {
    const entries = map[park.id];
    if (!entries) return park;
    return { ...park, images: entries.map((e) => ({ src: fileToUrl(e.file), alt: e.alt })) };
  });
}

/** Returns one plain-language message per problem; an empty list means the map is valid. */
export function checkImageMap(map: ImageMap, parkIds: string[], files: string[]): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const [id, entries] of Object.entries(map)) {
    if (!parkIds.includes(id)) problems.push(`park-images.json: "${id}" is not a park id`);
    for (const { file } of entries) {
      if (!files.includes(file)) problems.push(`park-images.json: "${file}" is not in images/`);
      if (seen.has(file)) problems.push(`park-images.json: "${file}" is listed more than once`);
      seen.add(file);
    }
  }
  return problems;
}
