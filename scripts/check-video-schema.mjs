// Optional live smoke check: synthetic text only, no personal footage or project brief.
process.loadEnvFile('.env.local');
const { generateJson, SCRIPT_FALLBACK_MODEL, videoScriptSchemaFor } = await import('../lib/gemini.ts');
const { orderVisualScenes } = await import('../lib/sceneTimeline.ts');
const began = performance.now();
const result = await generateJson({
  parts: [{ text: 'Synthetic schema smoke test, not a real project. The clip duration is 121.5 seconds. Return empty criteria and exactly two scenes at 0 and 100 seconds, each with a short fictional test line, visualDescription, caption, and empty covers. Use the response schema limits.' }],
  schema: videoScriptSchemaFor(121.5),
  systemInstruction: 'Generate synthetic test data only. Follow the response schema.',
  temperature: 0,
  models: [SCRIPT_FALLBACK_MODEL],
});
orderVisualScenes(result.scenes, 121.5);
console.log(JSON.stringify({ schemaAccepted: true, starts: result.scenes.map(scene => scene.startSeconds), milliseconds: Math.round(performance.now() - began) }));
