import { applyImageMap, checkImageMap, type ImageMap } from './imageMap';
import type { Park } from './parks';

const toUrl = (file: string) => `/img/${file}`;
const mapped: Park = {
  id: 'a',
  name: 'A',
  amenities: [],
  images: [{ src: 'https://x.invalid/a.jpg' }],
};
const unmapped: Park = {
  id: 'b',
  name: 'B',
  amenities: [],
  images: [{ src: 'https://x.invalid/b.jpg' }],
};
const noImages: Park = { id: 'c', name: 'C', amenities: [], images: [] };
const map: ImageMap = {
  a: [{ file: 'a1.jpg', alt: 'A: one' }],
  c: [{ file: 'c1.jpg', alt: 'C: one' }],
};

describe('applyImageMap', () => {
  it('replaces the images of a mapped park, with alt text', () => {
    const [park] = applyImageMap([mapped], map, toUrl);
    expect(park?.images).toEqual([{ src: '/img/a1.jpg', alt: 'A: one' }]);
  });

  it('keeps the record images of an unmapped park', () => {
    const [park] = applyImageMap([unmapped], map, toUrl);
    expect(park?.images).toEqual([{ src: 'https://x.invalid/b.jpg' }]);
  });

  it('adds images to a park that had none, only when it is mapped', () => {
    const [park] = applyImageMap([noImages], map, toUrl);
    expect(park?.images).toEqual([{ src: '/img/c1.jpg', alt: 'C: one' }]);
    expect(applyImageMap([noImages], {}, toUrl)[0]?.images).toEqual([]);
  });
});

describe('checkImageMap', () => {
  it('accepts a valid map', () => {
    expect(checkImageMap(map, ['a', 'c'], ['a1.jpg', 'c1.jpg'])).toEqual([]);
  });

  it('reports a missing file', () => {
    expect(checkImageMap(map, ['a', 'c'], ['a1.jpg'])).toEqual([
      'park-images.json: "c1.jpg" is not in images/',
    ]);
  });

  it('reports an unknown park id', () => {
    expect(checkImageMap(map, ['a'], ['a1.jpg', 'c1.jpg'])).toEqual([
      'park-images.json: "c" is not a park id',
    ]);
  });

  it('reports a file listed twice', () => {
    const dup: ImageMap = { a: [{ file: 'x.jpg', alt: 'x' }], c: [{ file: 'x.jpg', alt: 'y' }] };
    expect(checkImageMap(dup, ['a', 'c'], ['x.jpg'])).toEqual([
      'park-images.json: "x.jpg" is listed more than once',
    ]);
  });
});
