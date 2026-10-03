import type { Park } from '../../shared/parks';
import { chunkParks } from '../src/rag/chunk';

export const fullPark: Park = {
  id: 'oak-park',
  name: 'Oak Park',
  description: 'Shady meadows with a duck pond.',
  address: '1 Oak St',
  coords: { lat: 40, lng: -73 },
  amenities: ['dog-run', 'restrooms'],
  hours: 'Dawn to dusk',
  images: [],
  acreage: 12,
  rating: 4.5,
};

/** Every optional field missing. */
export const sparsePark: Park = { id: 'bare', name: 'Bare Lot', amenities: [], images: [] };

export const skatePark: Park = {
  id: 'skate',
  name: 'Ramp Yard',
  description: 'Concrete bowls and rails for skateboarding.',
  amenities: ['skate-park', 'lighting'],
  images: [],
};

export const testChunks = chunkParks([fullPark, sparsePark, skatePark]);
