// The only module that uses import.meta.glob. Jest swaps it for web/test/imageFilesStub.ts.
// Vite bundles every file in images/ and fingerprints its URL.
const urls = import.meta.glob('../../../images/*', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

/** Maps a file name from db/park-images.json to its bundled URL. */
export function imageUrl(file: string): string {
  return urls[`../../../images/${file}`] ?? file;
}
