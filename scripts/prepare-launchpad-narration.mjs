// Explicit authoring step only. Visitors load the resulting files without calling Azure.
import { mkdir, writeFile, access, readFile } from 'node:fs/promises';
import { generateSpeech, speechWavSeconds } from '../lib/azureSpeech.ts';
import { sampleScenes } from '../lib/sampleDemo.ts';
process.loadEnvFile('.env.local');
const directory = new URL('../public/sample/launchpad/', import.meta.url);
await mkdir(directory, { recursive: true });
const manifest = [];
const manifestUrl = new URL('narration.json', directory);
const previous = await readFile(manifestUrl, 'utf8').then(JSON.parse).catch(() => []);
for (const scene of sampleScenes()) {
  const destination = new URL(`${scene.id}.wav`, directory);
  let seconds;
  try {
    const old = previous.find(item => item.id === scene.id && item.spokenLine === scene.spokenLine);
    if (!old || old.slot !== scene.seconds) throw new Error('New or changed script timing');
    await access(destination); seconds = speechWavSeconds(await readFile(destination));
  }
  catch {
    const result = await generateSpeech(scene.spokenLine, scene.seconds, 'en-US-JennyNeural');
    await writeFile(destination, result.audio); seconds = result.seconds;
  }
  if (seconds > scene.seconds) throw new Error(`Scene ${scene.id} overruns; existing file kept for review.`);
  manifest.push({ id: scene.id, seconds, slot: scene.seconds, spokenLine: scene.spokenLine });
  await writeFile(manifestUrl, JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify({ scene: scene.id, seconds, slot: scene.seconds }));
}
