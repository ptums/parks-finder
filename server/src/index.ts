import { buildApp } from './app';
import { loadConfig } from './config';

// Optional local file; real environment variables win. A missing file is fine.
try {
  process.loadEnvFile('.env.local');
} catch {
  // no .env.local: run without a key
}

const config = loadConfig();
const app = buildApp(config);
app.listen({ port: config.port, host: '0.0.0.0' }).catch((error) => {
  console.error(error);
  process.exit(1);
});
