import { z } from 'zod';

/** Lenient shape of one record in db/parks.sample.json: every field may be missing or null. */
export const RawParkSchema = z
  .object({
    id: z.unknown(),
    name: z.unknown(),
    description: z.unknown(),
    location: z
      .object({ lat: z.unknown(), lng: z.unknown(), address: z.unknown() })
      .partial()
      .nullish()
      .catch(undefined),
    amenities: z.unknown(),
    hours: z.unknown(),
    images: z.unknown(),
    acreage: z.unknown(),
    rating: z.unknown(),
  })
  .partial();

export type RawPark = z.infer<typeof RawParkSchema>;

/** One photo. `alt` comes from db/park-images.json; records have none. */
export interface ParkPhoto {
  src: string;
  alt?: string;
}

export interface Park {
  id: string;
  name: string;
  description?: string;
  address?: string;
  coords?: { lat: number; lng: number };
  amenities: string[];
  hours?: string;
  images: ParkPhoto[];
  acreage?: number;
  rating?: number;
}

function cleanString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function cleanStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(cleanString).filter((s): s is string => s !== undefined);
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function cleanCoords(lat: unknown, lng: unknown): Park['coords'] {
  const la = finiteNumber(lat);
  const ln = finiteNumber(lng);
  if (la === undefined || ln === undefined) return undefined;
  if (la < -90 || la > 90 || ln < -180 || ln > 180) return undefined;
  return { lat: la, lng: ln };
}

/** Returns a clean Park, or null when id or name is missing. Never invents values. */
export function normalizePark(input: unknown): Park | null {
  const parsed = RawParkSchema.safeParse(input);
  if (!parsed.success) return null;
  const raw = parsed.data;
  const id = cleanString(raw.id);
  const name = cleanString(raw.name);
  if (!id || !name) return null;

  const acreage = finiteNumber(raw.acreage);
  const rating = finiteNumber(raw.rating);
  return {
    id,
    name,
    description: cleanString(raw.description),
    address: cleanString(raw.location?.address),
    coords: cleanCoords(raw.location?.lat, raw.location?.lng),
    amenities: cleanStrings(raw.amenities),
    hours: cleanString(raw.hours),
    images: cleanStrings(raw.images).map((src) => ({ src })),
    acreage: acreage !== undefined && acreage > 0 ? acreage : undefined,
    rating: rating !== undefined && rating >= 0 && rating <= 5 ? rating : undefined,
  };
}

export interface LoadResult {
  parks: Park[];
  warnings: string[];
}

/** Normalizes every record; skipped records are reported in warnings. */
export function loadParks(raw: unknown): LoadResult {
  if (!Array.isArray(raw)) throw new Error('Park data must be an array');
  const parks: Park[] = [];
  const warnings: string[] = [];
  raw.forEach((item, index) => {
    const park = normalizePark(item);
    if (park) parks.push(park);
    else warnings.push(`Record ${index} skipped: missing id or name`);
  });
  return { parks, warnings };
}
