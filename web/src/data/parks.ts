import raw from '../../../db/parks.sample.json';
import imageMap from '../../../db/park-images.json';
import { loadParks } from '../../../shared/parks';
import { applyImageMap } from '../../../shared/imageMap';
import { imageUrl } from './imageFiles';

const { parks, warnings } = loadParks(raw);
for (const warning of warnings) console.warn(warning);

/** All parks, normalized once at startup, with local photos overlaid. Data is a constant, not state. */
export const PARKS = applyImageMap(parks, imageMap, imageUrl);
