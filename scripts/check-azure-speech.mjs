// Optional real-service check. Uses only a synthetic script; never prints credentials.
import { writeFile } from 'node:fs/promises';
import { generateSpeech } from '../lib/azureSpeech.ts';
process.loadEnvFile('.env.local');
const started = performance.now();
try {
  const result = await generateSpeech('DemoScript turns a screen recording into a clear spoken demonstration. Each explanation follows the scene, helping viewers understand what matters.', 10, 'en-US-JennyNeural');
  if (process.argv[2]) await writeFile(process.argv[2], result.audio);
  console.log(JSON.stringify({ connected: true, seconds: result.seconds, sceneSeconds: 10, bytes: result.audio.length, elapsedSeconds: Math.round((performance.now() - started) / 1000) }));
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Speech test failed');
  process.exitCode = 1;
}
