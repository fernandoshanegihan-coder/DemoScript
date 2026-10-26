import test from 'node:test';
import assert from 'node:assert/strict';
import { generateTimedResult, mergeCoincidentScenes, orderVisualScenes, sceneAtVideoTime, SceneTimingError } from '../lib/sceneTimeline.ts';
import { videoScriptSchemaFor } from '../lib/gemini.ts';
import { mixTimeline, encodeWav, buildNarration } from '../lib/narration.ts';
import { EMPTY_BRIEF, hasStoryBrief, normalizeBrief, storyDirection } from '../lib/projectBrief.ts';
import { applyStoryLines, storyFlowInstruction } from '../lib/storyFlow.ts';
import { narrationBudget, narrationPattern, wordCount } from '../lib/narrationBudget.ts';
import { normalizeContextAnswers, normalizeStoryQuestions } from '../lib/storyContext.ts';
import { combineVideoAndNarration } from '../lib/videoExport.ts';
import { explanatorySchema, writeTimedPassages } from '../lib/timedPassages.ts';
import { speechMarkup, speechWavSeconds, fitSpeech, generateSpeech } from '../lib/azureSpeech.ts';
import { sampleScenes, SAMPLE_DURATION, isSampleSession } from '../lib/sampleDemo.ts';
import { saveSession, loadSession, clearSession } from '../lib/sessionStore.ts';
import { readFile } from 'node:fs/promises';

test('the bundled Launchpad script fits every scene and keeps the full recording timeline', () => {
  const scenes = sampleScenes();
  assert.equal(scenes[0].startSeconds, 0);
  for (let index = 0; index < scenes.length; index++) {
    const scene = scenes[index], budget = narrationBudget(scene.seconds);
    assert.ok(wordCount(scene.spokenLine) >= budget.minWords && wordCount(scene.spokenLine) <= budget.maxWords, scene.id);
    assert.ok(scene.visualDescription);
    if (index) assert.equal(scene.startSeconds, scenes[index - 1].startSeconds + scenes[index - 1].seconds);
  }
  assert.equal(scenes.at(-1).startSeconds + scenes.at(-1).seconds, SAMPLE_DURATION);
  scenes[0].spokenLine = 'Edited sample';
  assert.notEqual(sampleScenes()[0].spokenLine, scenes[0].spokenLine);
});

test('bundled narration matches the prepared words and fits each real audio slot', async () => {
  const manifest = JSON.parse(await readFile(new URL('../public/sample/launchpad/narration.json', import.meta.url), 'utf8'));
  assert.equal(manifest.length, sampleScenes().length);
  const segments = [];
  for (const scene of sampleScenes()) {
    const item = manifest.find(row => row.id === scene.id);
    assert.equal(item.spokenLine, scene.spokenLine);
    const bytes = await readFile(new URL(`../public/sample/launchpad/${scene.id}.wav`, import.meta.url));
    assert.equal(speechWavSeconds(bytes), item.seconds);
    assert.ok(item.seconds > 0 && item.seconds <= scene.seconds, scene.id);
    segments.push({ start: scene.startSeconds, slot: scene.seconds, samples: new Float32Array(Math.ceil(item.seconds * 48000)) });
  }
  assert.equal(mixTimeline(segments, SAMPLE_DURATION).length, Math.ceil(SAMPLE_DURATION * 48000));
});

test('sample preview cannot read, overwrite or erase an existing saved session', async () => {
  const oldWindow = globalThis.window, oldDb = globalThis.indexedDB;
  let opens = 0;
  globalThis.window = { location: { search: '?sample=launchpad' } };
  globalThis.indexedDB = { open() { opens++; throw new Error('Sample must not access saved work'); } };
  try {
    await saveSession({ recording: { blob: new Blob(['sample']) } });
    assert.equal(await loadSession(), null);
    await clearSession();
    assert.equal(opens, 0);
    assert.equal(isSampleSession('?sample=unknown'), false);
    assert.equal(isSampleSession(''), false);
  } finally {
    if (oldWindow === undefined) delete globalThis.window; else globalThis.window = oldWindow;
    if (oldDb === undefined) delete globalThis.indexedDB; else globalThis.indexedDB = oldDb;
  }
});

test('Azure speech escapes script text so it cannot inject SSML instructions', () => {
  const ssml = speechMarkup('A & B <audio src="bad">', 'en-US-JennyNeural');
  assert.ok(ssml.includes('A &amp; B &lt;audio src=&quot;bad&quot;&gt;'));
  assert.ok(!ssml.includes('<audio'));
});

test('generated speech uses the actual WAV duration and refuses corrupt audio', async () => {
  const bytes = new Uint8Array(await encodeWav(new Float32Array(24000), 24000).arrayBuffer());
  assert.equal(speechWavSeconds(bytes), 1);
  assert.throws(() => speechWavSeconds(bytes.subarray(0, 100)), /incomplete/);
  assert.throws(() => speechWavSeconds(new Uint8Array(50)), /unreadable/);
});

test('automatic voice adjusts pace to fit the scene without cropping any audio', async () => {
  const speeds = [];
  const result = await fitSpeech(10, async speed => {
    speeds.push(speed);
    return new Uint8Array(await encodeWav(new Float32Array(Math.round(11 / speed * 100)), 100).arrayBuffer());
  });
  assert.equal(speeds.length, 2);
  assert.ok(speeds[1] > 1 && speeds[1] <= 1.35);
  assert.ok(result.seconds <= 10 && result.seconds >= 9);
  assert.equal(speechWavSeconds(result.audio), result.seconds);
});

test('voice fitting refuses an overlong result instead of clipping the end', async () => {
  await assert.rejects(fitSpeech(3, async () => new Uint8Array(await encodeWav(new Float32Array(1000), 100).arrayBuffer())), /Shorten its script/);
});

test('Azure authentication errors do not expose credentials or provider response bodies', async () => {
  const originalFetch = globalThis.fetch;
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  process.env.AZURE_SPEECH_KEY = 'private-test-secret'; process.env.AZURE_SPEECH_REGION = 'centralindia';
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://centralindia.tts.speech.microsoft.com/cognitiveservices/v1');
    assert.equal(options.headers['Ocp-Apim-Subscription-Key'], 'private-test-secret');
    return new Response('private-provider-diagnostic', { status: 401 });
  };
  try {
    await assert.rejects(generateSpeech('Synthetic narration.', 10, 'en-US-JennyNeural'), error => {
      assert.equal(error.status, 503);
      assert.ok(!/private/.test(error.message));
      return true;
    });
  } finally {
    globalThis.fetch = originalFetch;
    if (key === undefined) delete process.env.AZURE_SPEECH_KEY; else process.env.AZURE_SPEECH_KEY = key;
    if (region === undefined) delete process.env.AZURE_SPEECH_REGION; else process.env.AZURE_SPEECH_REGION = region;
  }
});

test('timed writing constrains word arrays and silently skips brief transitions', async () => {
  const scenes = [{ seconds: .5, caption: 'Flash' }, { seconds: 30, caption: 'Results' }];
  const schema = explanatorySchema(scenes, [1]);
  const words = schema.properties.passages.properties.scene1.properties.spokenWords;
  assert.equal(words.minItems, '54');
  assert.equal(words.maxItems, '72');
  const result = await writeTimedPassages(scenes, async indexes => {
    assert.deepEqual(indexes, [1]);
    return { passages: { scene1: { visualEvidence: 'Results', spokenWords: Array(63).fill('word') } } };
  });
  assert.equal(result[0], '');
  assert.equal(wordCount(result[1]), 63);
});

test('timed writing repairs only rejected scenes and preserves accepted narration', async () => {
  const scenes = [{ seconds: 10, caption: 'Form' }, { seconds: 10, caption: 'Results' }];
  const calls = [];
  const result = await writeTimedPassages(scenes, async (indexes, correction) => {
    calls.push(indexes);
    if (calls.length === 1) return { passages: {
      scene0: { visualEvidence: 'Form', spokenWords: Array(21).fill('accepted') },
      scene1: { visualEvidence: 'Results', spokenWords: ['Too', 'short.'] },
    } };
    assert.match(correction, /accepted and locked/);
    return { passages: { scene1: { visualEvidence: 'Results', spokenWords: Array(21).fill('repaired') } } };
  });
  assert.deepEqual(calls, [[0, 1], [1]]);
  assert.equal(result[0], Array(21).fill('accepted').join(' '));
  assert.equal(wordCount(result[1]), 21);
});

test('timed writing cannot bypass duration or visual grounding with malformed word arrays', async () => {
  const scenes = [{ seconds: 10, caption: 'Results' }];
  for (const passage of [
    { visualEvidence: 'Results', spokenWords: Array(21).fill('two words') },
    { visualEvidence: 'Wrong scene', spokenWords: Array(21).fill('word') },
    { visualEvidence: 'Results', spokenWords: Array(25).fill('word') },
    { visualEvidence: 'Results', spokenWords: [] },
  ]) {
    let calls = 0;
    await assert.rejects(writeTimedPassages(scenes, async () => { calls++; return { passages: { scene0: passage } }; }), /saved/);
    assert.equal(calls, 3);
  }
});

test('all silent footage needs no writing request', async () => {
  assert.deepEqual(await writeTimedPassages([{ seconds: .5 }], async () => { throw new Error('Unexpected request'); }), ['']);
});

test('combined video export refuses empty media instead of producing a silent or blank download', async () => {
  await assert.rejects(combineVideoAndNarration(new Blob(), new Blob(['audio']), 4), /empty/);
  await assert.rejects(combineVideoAndNarration(new Blob(['video']), new Blob(), 4), /empty/);
  await assert.rejects(combineVideoAndNarration(new Blob(['video']), new Blob(['audio']), NaN), /empty/);
});

test('a cancelled export stops before touching the original video and narration', async () => {
  const controller = new AbortController(); controller.abort();
  const video = new Blob(['original video']); const voice = new Blob(['original voice']);
  await assert.rejects(combineVideoAndNarration(video, voice, 4, { signal: controller.signal }), error => error.name === 'AbortError');
  assert.equal(await video.text(), 'original video');
  assert.equal(await voice.text(), 'original voice');
});

test('a one-line summary is rejected for a long scene while a developed passage retains its timing', () => {
  const scenes = [{ id: 'long', startSeconds: 12, seconds: 30, spokenLine: '', caption: 'Review results' }];
  assert.throws(() => applyStoryLines(scenes, [{ sceneIndex: 0, spokenLine: 'We review the results here.' }], true), /Expand it to 54/);
  const explanation = Array.from({ length: 63 }, (_, index) => `word${index}`).join(' ');
  const result = applyStoryLines(scenes, [{ sceneIndex: 0, spokenLine: explanation }], true);
  assert.equal(result[0].seconds, 30);
  assert.equal(result[0].startSeconds, 12);
  assert.equal(wordCount(result[0].spokenLine), 63);
});

test('per-scene generation patterns allow breathing room, refuse short summaries and bound long speech', () => {
  assert.deepEqual(narrationBudget(30), { minWords: 54, targetWords: 63, maxWords: 72 });
  assert.deepEqual(narrationBudget(60), { minWords: 108, targetWords: 126, maxWords: 144 });
  const pattern = new RegExp(narrationPattern(30));
  for (const count of [54, 63, 72]) assert.equal(pattern.test(Array(count).fill('word').join(' ')), true);
  for (const count of [5, 53, 73]) assert.equal(pattern.test(Array(count).fill('word').join(' ')), false);
  assert.equal(new RegExp(narrationPattern(.5)).test(''), true);
  assert.equal(new RegExp(narrationPattern(.5)).test('A sentence.'), false);
});

test('follow-up questions are bounded and tied to real scene indexes', () => {
  const questions = normalizeStoryQuestions([{ sceneIndex: 1, question: 'What should the viewer infer from this result?' }, { sceneIndex: 1, question: 'What should the viewer infer from this result?' }], 3);
  assert.deepEqual(questions, [{ id: 'q1', sceneIndex: 1, question: 'What should the viewer infer from this result?' }]);
  assert.deepEqual(normalizeStoryQuestions([], 3), []);
  assert.throws(() => normalizeStoryQuestions([{ sceneIndex: 4, question: 'Question?' }], 3));
  assert.throws(() => normalizeStoryQuestions(undefined, 3));
});

test('creator follow-up answers remain bounded factual context and include explicit unknowns', () => {
  assert.deepEqual(normalizeContextAnswers([{ question: 'Result?', answer: '  Unknown; omit this claim.  ' }, { question: 'Missing', answer: '' }, null]), [{ question: 'Result?', answer: 'Unknown; omit this claim.' }]);
  assert.equal(normalizeContextAnswers([{ question: 'Purpose?', answer: 'x'.repeat(3000) }])[0].answer.length, 1800);
  assert.equal(normalizeContextAnswers(Array(12).fill({ question: 'Question?', answer: 'Answer.' })).length, 9);
});

test('whole-story editing preserves every video boundary and item of visual evidence', () => {
  const scenes = [
    { id: 'a', startSeconds: 0, seconds: 8, spokenLine: 'Old opening.', caption: 'Home', visualDescription: 'Landing page', covers: ['c1'] },
    { id: 'b', startSeconds: 18, seconds: 10, spokenLine: 'Old end.', caption: 'AI setup', visualDescription: 'Setup panel', covers: ['c2'] },
  ];
  const edited = applyStoryLines(scenes, [{ sceneIndex: 1, spokenLine: 'That help brings the experiment back to the original question.' }, { sceneIndex: 0, spokenLine: 'A theory needs testing against measurements.' }]);
  assert.deepEqual(edited.map(({ spokenLine, ...rest }) => rest), scenes.map(({ spokenLine, ...rest }) => rest));
  assert.equal(edited[0].spokenLine, 'A theory needs testing against measurements.');
  assert.equal(scenes[0].spokenLine, 'Old opening.');
});

test('story editing refuses missing, duplicate, invented or overlong scene lines', () => {
  const scenes = [0, 1].map(index => ({ startSeconds: index * 2, seconds: 2, spokenLine: 'Old.', caption: 'Scene' }));
  assert.throws(() => applyStoryLines(scenes, [{ sceneIndex: 0, spokenLine: 'One.' }]));
  assert.throws(() => applyStoryLines(scenes, [{ sceneIndex: 0, spokenLine: 'One.' }, { sceneIndex: 0, spokenLine: 'Two.' }]));
  assert.throws(() => applyStoryLines(scenes, [{ sceneIndex: 0, spokenLine: 'One.' }, { sceneIndex: 2, spokenLine: 'Two.' }]));
  assert.throws(() => applyStoryLines(scenes, [{ sceneIndex: 0, spokenLine: 'Too many words for this short scene.' }, { sceneIndex: 1, spokenLine: 'Two.' }]));
});

test('editor sees the whole story and explicitly handles revisiting the home page and a feature at the end', () => {
  const prompt = storyFlowInstruction([{ startSeconds: 0, seconds: 8, spokenLine: 'Old.', caption: 'Home' }, { startSeconds: 8, seconds: 10, spokenLine: 'AI setup.', caption: 'AI setup' }], EMPTY_BRIEF);
  assert.match(prompt, /ONE continuous spoken story/);
  assert.match(prompt, /Do not restart the pitch/);
  assert.match(prompt, /Reserve the conclusion for the final narratable scene/);
  assert.match(prompt, /visible capability back to the original problem/);
  assert.match(prompt, /"maxWords":19/);
  assert.match(prompt, /"maxWords":24/);
});

test('one-second flashes stay silent and the closing payoff belongs to the last usable slot', () => {
  const scenes = [
    { startSeconds: 0, seconds: 10, spokenLine: 'Intro.', caption: 'Home' },
    { startSeconds: 10, seconds: 1, spokenLine: 'Too long before.', caption: 'Flash' },
    { startSeconds: 11, seconds: 8, spokenLine: 'Closing.', caption: 'Upload' },
    { startSeconds: 19, seconds: .5, spokenLine: 'Too long ending.', caption: 'AI setup' },
  ];
  const lines = [{ sceneIndex: 0, spokenLine: 'Understand the problem.' }, { sceneIndex: 1, spokenLine: '' }, { sceneIndex: 2, spokenLine: 'Test your own data to answer that question.' }, { sceneIndex: 3, spokenLine: '' }];
  assert.equal(applyStoryLines(scenes, lines)[3].spokenLine, '');
  const prompt = storyFlowInstruction(scenes, EMPTY_BRIEF);
  assert.match(prompt, /closing payoff in sceneIndex 2/);
  assert.match(prompt, /"silent":true/);
  assert.throws(() => applyStoryLines(scenes, lines.map(line => line.sceneIndex === 3 ? { ...line, spokenLine: 'AI helps.' } : line)));
});

test('silent transitions export without a take and retain the exact video duration', async () => {
  globalThis.AudioContext = class { async close() {} };
  try {
    const blob = await buildNarration([{ id: 'flash', startSeconds: 0, seconds: .5, spokenLine: '', caption: 'Flash' }], new Map(), .5);
    const view = new DataView(await blob.arrayBuffer());
    assert.equal(view.getUint32(40, true), 24000 * 2);
    assert.equal(view.getInt16(44, true), 0);
  } finally { delete globalThis.AudioContext; }
});

test('project interview requires the problem, solution and demo highlights', () => {
  assert.equal(hasStoryBrief(EMPTY_BRIEF), false);
  assert.equal(hasStoryBrief({ ...EMPTY_BRIEF, problem: 'People struggle to present', solution: 'DemoScript', highlights: '  ' }), false);
  assert.equal(hasStoryBrief({ ...EMPTY_BRIEF, problem: 'People struggle to present', solution: 'DemoScript', highlights: 'Interview, script, narration' }), true);
});

test('project context accepts bounded text without trusting unknown input', () => {
  assert.deepEqual(normalizeBrief(null), EMPTY_BRIEF);
  assert.deepEqual(normalizeBrief({ problem: '  A real problem  ', solution: 4, unrelated: 'ignore' }), { ...EMPTY_BRIEF, problem: 'A real problem' });
  assert.equal(normalizeBrief({ difference: 'x'.repeat(2000) }).difference.length, 1200);
});

test('professional story uses supplied context beyond footage but keeps visual proof and timing separate', () => {
  const brief = { problem: 'Creators cannot find the words.', solution: 'DemoScript creates a story.', highlights: 'Interview and aligned narration.', difference: 'Scene-level takes.', takeaway: 'A stronger story.' };
  const direction = storyDirection(brief);
  for (const answer of Object.values(brief)) assert.ok(direction.includes(answer));
  assert.match(direction, /founder pitch.*product walkthrough/);
  assert.match(direction, /even when it is not literally visible/);
  assert.match(direction, /must be visible in that exact scene/);
  assert.match(direction, /An intended benefit is not a measured result/);
  assert.match(direction, /Rubric coverage still requires visible evidence/);
});

test('out-of-order scenes keep their visual description and narration attached', () => {
  const scenes = [{ startSeconds: 8, spokenLine: 'Results', visualDescription: 'Results screen' }, { startSeconds: 0, spokenLine: 'Enter a name', visualDescription: 'Form screen' }];
  assert.deepEqual(orderVisualScenes(scenes, 12).map(s => [s.startSeconds, s.spokenLine, s.visualDescription]), [[0, 'Enter a name', 'Form screen'], [8, 'Results', 'Results screen']]);
  assert.equal(scenes[0].startSeconds, 8);
});

test('bad timestamps are refused instead of inventing visual timing', () => {
  for (const times of [[0, 0], [0, NaN], [-1, 4], [0, 12]]) {
    assert.throws(() => orderVisualScenes(times.map(startSeconds => ({ startSeconds })), 12));
  }
  assert.equal(orderVisualScenes([{ startSeconds: 0.35 }], 0.9)[0].startSeconds, 0.35);
});

test('response schema enforces clip-specific numeric limits and at least one scene', () => {
  const schema = videoScriptSchemaFor(121.5);
  const scenes = schema.properties.scenes;
  assert.equal(scenes.minItems, '1');
  assert.equal(scenes.items.properties.startSeconds.minimum, 0);
  assert.equal(scenes.items.properties.startSeconds.maximum, 121.499);
  assert.equal(videoScriptSchemaFor(12).properties.scenes.items.properties.startSeconds.maximum, 11.999);
  assert.equal(schema.properties.scenes.items.properties.startSeconds.maximum, 121.499);
});

test('coincident scenes combine their evidence and speech without shifting any timestamps', async () => {
  const input = [
    { startSeconds: 0, visualDescription: 'A form.', spokenLine: 'Enter a name.', caption: 'Form', covers: ['c1'] },
    { startSeconds: 0, visualDescription: 'A button.', spokenLine: 'Submit it.', caption: 'Submit', covers: ['c1', 'c2'] },
    { startSeconds: 8, visualDescription: 'Results.', spokenLine: 'View results.', caption: 'Results', covers: [] },
  ];
  let calls = 0;
  const result = await generateTimedResult(async () => { calls++; return { scenes: mergeCoincidentScenes(input) }; }, 12);
  assert.equal(calls, 1);
  assert.deepEqual(result.scenes.map(scene => scene.startSeconds), [0, 8]);
  assert.equal(result.scenes[0].spokenLine, 'Enter a name. Submit it.');
  assert.equal(result.scenes[0].visualDescription, 'A form. A button.');
  assert.deepEqual(result.scenes[0].covers, ['c1', 'c2']);
  assert.equal(input[0].spokenLine, 'Enter a name.');
});

test('invalid Gemini timings trigger one grounded correction against the same clip', async () => {
  const prompts = [];
  const corrected = { scenes: [{ startSeconds: 8, spokenLine: 'Results' }, { startSeconds: 0, spokenLine: 'Form' }] };
  const result = await generateTimedResult(async correction => {
    prompts.push(correction);
    return correction ? corrected : { scenes: [{ startSeconds: 0 }, { startSeconds: 12 }] };
  }, 12);
  assert.equal(result, corrected);
  assert.equal(prompts.length, 2);
  assert.equal(prompts[0], undefined);
  assert.match(prompts[1], /12 exclusive/);
  assert.match(prompts[1], /Re-watch the attached footage/);
  assert.match(prompts[1], /do not nudge timestamps/);
});

test('valid results do not spend an extra generation call', async () => {
  let calls = 0;
  await generateTimedResult(async () => { calls++; return { scenes: [{ startSeconds: 0 }] }; }, 12);
  assert.equal(calls, 1);
});

test('failed correction surfaces a specific safe-clip error and stops retrying', async () => {
  let calls = 0;
  const issues = [];
  await assert.rejects(generateTimedResult(async () => {
    calls++; return { scenes: [{ startSeconds: 0 }, { startSeconds: 0 }] };
  }, 12, issue => issues.push(issue)), error => error instanceof SceneTimingError && /after an automatic correction attempt/.test(error.message) && /clip is safe/.test(error.message));
  assert.equal(calls, 2);
  assert.deepEqual(issues.map(issue => issue.starts), [[0, 0], [0, 0]]);
  assert.deepEqual(issues.map(issue => issue.pass), [1, 2]);
});

test('quota and network failures are preserved without timing retries', async () => {
  const quota = new Error('Quota exhausted'); let calls = 0;
  await assert.rejects(generateTimedResult(async () => { calls++; throw quota; }, 12), error => error === quota);
  assert.equal(calls, 1);
});

test('scene highlighting respects deleted gaps and exact boundaries', () => {
  const scenes = [{ id: 'a', startSeconds: 0, seconds: 2 }, { id: 'b', startSeconds: 5, seconds: 3 }];
  assert.equal(sceneAtVideoTime(scenes, 1.999), 0);
  assert.equal(sceneAtVideoTime(scenes, 2), -1);
  assert.equal(sceneAtVideoTime(scenes, 5), 1);
  assert.equal(sceneAtVideoTime(scenes, 8), -1);
});

test('export places takes at absolute video times with silent gaps and tail', () => {
  const samples = mixTimeline([{ start: 0, slot: 1, samples: new Float32Array([.25, .5]) }, { start: 2, slot: 1, samples: new Float32Array([-.25]) }], 4, 2);
  assert.deepEqual([...samples], [.25, .5, 0, 0, -.25, 0, 0, 0]);
});

test('export refuses overflowing and overlapping audio without trimming', () => {
  assert.throws(() => mixTimeline([{ start: 0, slot: 1, samples: new Float32Array(3) }], 3, 2));
  assert.throws(() => mixTimeline([{ start: 0, slot: 2, samples: new Float32Array(3) }, { start: 1, slot: 1, samples: new Float32Array(2) }], 3, 2));
  assert.throws(() => mixTimeline([{ start: 2, slot: 2, samples: new Float32Array(4) }], 3, 2));
});

test('WAV has correct duration, format and signed PCM samples', async () => {
  const wav = encodeWav(new Float32Array([-1, 0, 1]), 48000);
  const bytes = await wav.arrayBuffer(); const view = new DataView(bytes);
  assert.equal(new TextDecoder().decode(bytes.slice(0, 4)), 'RIFF');
  assert.equal(view.getUint16(22, true), 1);
  assert.equal(view.getUint32(24, true), 48000);
  assert.equal(view.getUint32(40, true), 6);
  assert.equal(view.getInt16(44, true), -32768);
  assert.equal(view.getInt16(48, true), 32767);
});

test('changed or missing takes are blocked and the audio context closes', async () => {
  let closed = 0;
  globalThis.AudioContext = class { async close() { closed++; } };
  const scenes = [{ id: 'a', spokenLine: 'New script', startSeconds: 0, seconds: 2 }];
  await assert.rejects(buildNarration(scenes, new Map(), 2), /Record scene 1/);
  await assert.rejects(buildNarration(scenes, new Map([['a', { blob: new Blob(['audio']), spokenLine: 'Old script' }]]), 2), /has changed/);
  assert.equal(closed, 2);
  delete globalThis.AudioContext;
});
