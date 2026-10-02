// Downloads the embedding model into MODEL_CACHE_DIR and embeds every chunk once,
// so a Docker build can bake the model into the image. Prints chunk stats.
import { loadConfig } from '../src/config';
import { EMBEDDING_MODEL, loadEmbedder } from '../src/rag/embedder';
import { loadChunks } from '../src/rag/index';

const chunks = loadChunks();
const parks = new Set(chunks.map((chunk) => chunk.parkId));
const byField = new Map<string, number>();
for (const chunk of chunks) byField.set(chunk.field, (byField.get(chunk.field) ?? 0) + 1);
const avgLength = Math.round(chunks.reduce((sum, c) => sum + c.text.length, 0) / chunks.length);

console.log(`${chunks.length} chunks from ${parks.size} parks (average ${avgLength} characters)`);
for (const [field, count] of byField) console.log(`  ${field}: ${count}`);

const { modelCacheDir } = loadConfig();
const started = Date.now();
try {
  const embedder = await loadEmbedder(modelCacheDir);
  const vectors = await embedder.embed(chunks.map((chunk) => chunk.text));
  console.log(
    `${EMBEDDING_MODEL}: ${vectors.length} vectors of ${vectors[0]?.length} dimensions in ${Date.now() - started} ms (cache: ${modelCacheDir})`,
  );
} catch (error) {
  console.error(
    'Could not load the embedding model:',
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
}
