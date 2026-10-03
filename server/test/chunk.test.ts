import { chunkPark } from '../src/rag/chunk';
import { fullPark, sparsePark } from './fixtures';

describe('chunkPark', () => {
  it('gives a full park one chunk per field group, each starting with the park name', () => {
    const chunks = chunkPark(fullPark);
    expect(chunks.map((c) => c.field)).toEqual([
      'overview',
      'amenities',
      'address',
      'hours',
      'size',
    ]);
    for (const chunk of chunks) {
      expect(chunk.text.startsWith('Oak Park. ')).toBe(true);
      expect(chunk.chunkId).toBe(`oak-park#${chunk.field}`);
      expect(chunk.parkId).toBe('oak-park');
    }
  });

  it('uses amenity labels, verbatim hours, and acreage plus rating', () => {
    const byField = Object.fromEntries(chunkPark(fullPark).map((c) => [c.field, c.text]));
    expect(byField.amenities).toBe('Oak Park. Amenities: Dog run, Restrooms.');
    expect(byField.hours).toBe('Oak Park. Hours: Dawn to dusk.');
    expect(byField.size).toBe('Oak Park. 12 acres. Rated 4.5 out of 5.');
  });

  it('yields no chunks (never an empty one) when every optional field is missing', () => {
    expect(chunkPark(sparsePark)).toEqual([]);
  });

  it('writes only the size facts that exist', () => {
    const [size] = chunkPark({ ...sparsePark, rating: 3 });
    expect(size?.text).toBe('Bare Lot. Rated 3 out of 5.');
  });
});
