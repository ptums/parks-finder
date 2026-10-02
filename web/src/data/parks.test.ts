import { PARKS } from './parks';

it('loads all sample parks', () => {
  expect(PARKS).toHaveLength(12);
  expect(PARKS.every((p) => p.id && p.name)).toBe(true);
});
