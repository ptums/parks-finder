import type { ChunkField } from '../../../shared/api';
import { amenityLabel } from '../../../shared/amenities';
import type { Park } from '../../../shared/parks';

/** One searchable piece of one park's record. */
export interface Chunk {
  chunkId: string; // "<parkId>#<field>"
  parkId: string;
  field: ChunkField;
  text: string; // always starts with the park name
}

function sizeText(park: Park): string | undefined {
  const parts: string[] = [];
  if (park.acreage !== undefined) parts.push(`${park.acreage} acres.`);
  if (park.rating !== undefined) parts.push(`Rated ${park.rating} out of 5.`);
  return parts.length > 0 ? parts.join(' ') : undefined;
}

/**
 * Splits one park into field-group chunks. A missing field yields no chunk:
 * we never write "unknown" or a default, so the model can't quote one.
 */
export function chunkPark(park: Park): Chunk[] {
  const amenities = park.amenities.map(amenityLabel).join(', ');
  const fields: [ChunkField, string | undefined][] = [
    ['overview', park.description],
    ['amenities', amenities === '' ? undefined : `Amenities: ${amenities}.`],
    ['address', park.address === undefined ? undefined : `Address: ${park.address}.`],
    ['hours', park.hours === undefined ? undefined : `Hours: ${park.hours}.`],
    ['size', sizeText(park)],
  ];

  const chunks: Chunk[] = [];
  for (const [field, body] of fields) {
    if (body === undefined) continue;
    chunks.push({
      chunkId: `${park.id}#${field}`,
      parkId: park.id,
      field,
      text: `${park.name}. ${body}`,
    });
  }
  return chunks;
}

export function chunkParks(parks: Park[]): Chunk[] {
  return parks.flatMap(chunkPark);
}
