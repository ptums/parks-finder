export const AMENITY_LABELS: Record<string, string> = {
  'accessible-paths': 'Accessible paths',
  basketball: 'Basketball',
  'bike-path': 'Bike path',
  boardwalk: 'Boardwalk',
  cafe: 'Cafe',
  'dog-run': 'Dog run',
  'event-lawn': 'Event lawn',
  fishing: 'Fishing',
  'food-vendors': 'Food vendors',
  gardens: 'Gardens',
  'gift-shop': 'Gift shop',
  'kayak-launch': 'Kayak launch',
  lake: 'Lake',
  lighting: 'Lighting',
  parking: 'Parking',
  'picnic-areas': 'Picnic areas',
  playground: 'Playground',
  restrooms: 'Restrooms',
  'skate-park': 'Skate park',
  'splash-pad': 'Splash pad',
  'sports-fields': 'Sports fields',
  trails: 'Trails',
  'water-fountain': 'Water fountain',
  waterfront: 'Waterfront',
  wifi: 'Wi-Fi',
  'wildlife-viewing': 'Wildlife viewing',
};

/** Known slugs use the map; unknown slugs become "Some slug" so they are never dropped. */
export function amenityLabel(slug: string): string {
  const known = AMENITY_LABELS[slug];
  if (known) return known;
  const words = slug.replace(/-/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
