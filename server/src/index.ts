import { buildApp } from './app';
import { loadConfig } from './config';
import { loadEmbedder } from './rag/embedder';
import { loadChunks } from './rag/index';
import { createRetriever } from './rag/retrieve';

// Optional local file; real environment variables win. A missing file is fine.
try {
  process.loadEnvFile('.env.local');
} catch {
  // no .env.local: run without a key
}

const config = loadConfig();
const retriever = createRetriever(loadChunks());
const app = buildApp({ config, retriever, logStream: process.stdout });

app
  .listen({ port: config.port, host: '0.0.0.0' })
  .then(() => {
    // Search works in lexical mode right away; dense joins once the model loads.
    // Without a key nothing can search, so the model is not loaded at all.
    if (config.anthropicKey === '') return;
    loadEmbedder(config.modelCacheDir)
      .then((embedder) => retriever.enableDense(embedder))
      .then(() => app.log.info('embedding model ready: hybrid mode'))
      .catch(() => app.log.warn('embedding model failed to load: staying in lexical mode'));
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
