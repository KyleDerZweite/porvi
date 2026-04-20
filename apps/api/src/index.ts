import { readApiEnv } from './env.js';
import { startApiServer } from './app.js';

const env = readApiEnv();

void startApiServer(env).then(() => {
  console.log(`Porvi API listening on ${env.publicApiUrl}`);
});
