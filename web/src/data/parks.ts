import raw from '../../../db/parks.sample.json';
import { loadParks } from '../../../shared/parks';

const { parks, warnings } = loadParks(raw);
for (const warning of warnings) console.warn(warning);

/** All parks, normalized once at startup. Data is a constant, not state. */
export const PARKS = parks;
