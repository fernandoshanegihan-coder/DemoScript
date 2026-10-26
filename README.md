# DemoScript

Turn your project’s story and screen recording into a professional demo, blending a confident pitch with a product walkthrough. Record your voice or generate narration, scene by scene.

No signup or server project database. One current clip, browser-local saving, and a finished video download.

**Try a sample demo** opens Launchpad, a real 91-second recording with a prepared descriptive script and eight voice takes. It opens separately, makes no analysis/synthesis requests just to load, and never reads or replaces your saved project. Sample changes reset on reload. Open Record mode to hear the prepared voices or create the finished video.

## What it does

1. **Record or upload a clip.** Up to three minutes of footage, picture only. Pause and resume while recording; the paused stretch is cut. A clip you already have can be dropped in instead.
2. **Pick the demo type, and who is speaking.** Hackathon, University project, Client pitch or Portfolio changes how the script argues, not just its adjectives. **I / We** sets the pronoun: a hackathon is normally a team, the other three usually one person.
3. **Answer a short project interview.** Explain who needs it and why, what you built, and which 2–3 moments matter. Optionally add what makes it different and what the audience should remember. These answers supply context the silent footage cannot explain. Add a rubric if you have one: criteria go green when visually proven, red when still missing.
4. **Analyze, clarify, then write.** Gemini reads the footage into detailed timestamped observations. Before writing the final narration, the app checks whether it has enough facts to explain what happens, why it matters, and how to interpret it. Missing details produce up to three focused follow-up questions tied to the scenes. Answers and analysis are saved across reloads. Continuing uses text only, with no repeat video upload.
5. **Read a descriptive presenter script.** Spoken scenes must contain 1.8–2.4 words per second of footage, aiming around 2.1 with natural pauses. A 30-second scene gets 54–72 words, not a one-line summary. Each scene has its own generation constraints and the result is checked; only passages outside their ranges are repaired. Scene cards show actual words and the target range. An unfinished narration is kept as cached analysis for retry, never presented as a finished short summary.
6. **Rehearse.** The video clock runs while the current scene is highlighted.
7. **Narrate, scene by scene.** Record your own voice or generate a voice for empty scenes. Each take shows Empty / Recorded / Too long / Too short, its measured length, and words per minute. Re-recording one scene never touches the others.
8. **Download a video with sound.** Create the combined video, review its preview and download it. The original recording and aligned narration WAV remain available separately.

## Run it

Use Node 24+ to run the app and its tests with the same runtime. The regression scripts use native TypeScript loading.

```bash
npm install
cp .env.example .env.local   # then add GEMINI_API_KEY
npm run dev
```

Open http://localhost:3000.

`GEMINI_API_KEY` is read only on the server. Get one from [Google AI Studio](https://aistudio.google.com/apikey). One optional override in `.env.local`:

| Variable | Default |
|---|---|
| `GEMINI_SCRIPT_MODEL` | `gemini-3.8-flash` (falls back to `gemini-3.5-flash-lite`) |

Provider allowances vary by model and account. Video analysis prefers the configured model and can fall back; context checks, whole-story writing and scene rewrites use the lite model. A complete workflow can make several bounded model calls.

For a production preview on another port, run `npm run build -- --webpack`, then `npm run start -- --port 3001`. The current local preview uses that port. Rebuild and restart after source changes when using `npm run start`.

For optional automatic narration, add `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION` to `.env.local` (and the deployed server's environment). Restart after changing credentials. Create a Speech resource with the Free F0 tier when available. In Record mode, choose Jenny, Guy or Sonia and click **Generate missing narration**. Script text is sent to Microsoft Azure; the key remains on the server. Audio is saved with the other takes in this browser and included in the combined video export.

Automatic narration skips every existing take, including outdated takes. Delete an individual take before generating its replacement, or record your own voice. Silent scenes are skipped. The server measures the returned WAV and adjusts synthesis speed up to three times within a natural range. It never crops speech or moves scene timestamps; if the passage still overruns, shorten it or record a take. Stop keeps completed scenes for the next attempt.

`AZURE_SPEECH_DAILY_CHAR_LIMIT` defaults to 10,000 reserved text characters per UTC day, including synthesis retries and failed provider attempts. This is a conservative safeguard, not an Azure billing meter. Requests are serialized per server process. The counter is stored in memory: restarts reset it and multiple server instances have separate counts. A public deployment needs persistent shared usage limits or account quotas to enforce one overall allowance. Azure resource quotas still apply.

## Notes and limits

- **Your session survives reloads.** IndexedDB keeps the clip, script, criteria, rubric, preset, voice takes, pending video analysis, follow-up questions and answers in this browser. A saving indicator confirms storage; leaving while recording or with unsaved takes or follow-up answers warns first. Replacing the recording clears its old analysis and follow-up context.
- **Takes are never trimmed.** A take over the scene's target is flagged "Too long" and kept exactly as recorded.
- **Own voice or Azure narration.** Microphone takes stay in the browser. Optional automatic narration sends scene text to Microsoft Azure and receives a WAV; credentials stay server-side. Video analysis sends the recording to Gemini, with best-effort uploaded-file cleanup afterwards.
- **Video with narration.** In Record mode, choose **Create video with narration**, then download the finished video with sound included. The app combines picture and the aligned voice track locally in the browser, preferring MP4/H.264/AAC and using WebM when needed for browser codec support. Original audio is replaced with the recorded/generated narration. Gaps remain silent; missing, outdated or overlong takes block export. Progress and cancellation are available. A track check prevents offering a file that has lost its video or audio track.
- **Separate files remain available.** The **Separate files** section offers the aligned mono 48 kHz WAV and the original recording, clearly labeled **without narration**. Individual takes can still be downloaded. The finished video preview uses its own embedded sound, so it matches the downloaded file.
- **A story supported by evidence.** Scripts follow problem → solution → proof → takeaway. The narration can use facts from your interview beyond the footage; actions described as happening now must match that exact scene. “On screen” observations stay limited to visible evidence. Rewrites use the same project context. Scene boundaries follow visual changes, and rewriting cannot extend a scene to fit prose. Review generated claims against your project; AI can still make mistakes.
- **A spoken presentation, not a summary.** The text-only writer develops a continuous explanation across the fixed intervals in any recording domain. Longer scenes explain the action, purpose and interpretation. Shots under three seconds stay silent. The closing payoff lands in the last narratable scene. **Expand explanations** applies the same context-checking and duration-fitting pipeline to existing scripts without re-uploading. Rewrites receive neighboring lines and follow-up facts and must fit the same word range. Existing takes are kept and flagged if their words change.
- **Reading time is measured, not estimated.** The number beside "Your script" is the wall time that generation actually took.
- **Light theme only.** No accounts, no analytics, no cloud storage.

## Project layout

- `app/page.tsx` — the one page; owns the clip, script, modes and takes.
- `app/api/video/route.ts` — clip → timestamped scenes and criteria, streamed stage by stage.
- `app/api/script/route.ts` — one scene rewrite.
- `app/api/story/route.ts` — follow-up questions and duration-fitted writing from cached observations.
- `app/api/speech/route.ts` — server-side Azure narration with measured duration fitting.
- `lib/` — recording, presets and prompts, timing and cut rules, take maths, IndexedDB.
- `components/` — the input column, storyboard, rehearsal, and the scene-by-scene recording UI.

Current project documents, synchronized 26 October 2026: [scope](devpost/scope.md), [product requirements](devpost/prd.md), [technical specification](devpost/spec.md) and [build/acceptance checklist](devpost/checklist.md). The checklist separates implemented behavior from final real-recording acceptance, learning wrap-up and submission work. Earlier decisions are preserved in the [archived build history](devpost/archive/build-history-before-2026-10-26-sync.md). The learner profile stays in the local, Git-ignored `devpost/learner-profile.md`.

The standalone [app map](devpost/app-map.html) explains the main pieces and follows video export through three source locations. Open it directly from the project folder to read it offline.

## Checks

`npm test` runs the timeline and WAV regression tests (Node 24+ for direct TypeScript loading). `npx tsc --noEmit` checks types. `npm run build -- --webpack` builds with Webpack if the default Turbopack process fails on this machine.

With Playwright and Chrome available, run `node scripts/narration-browser.cjs` against a running app (`TEST_URL`, default `http://localhost:3100`). It uses a disposable browser session, synthetic footage and a simulated microphone; it makes no Gemini requests. It checks real browser audio decoding, aligned export, video seeking, rehearsal, saved takes, changed-script protection and storage failure warnings.

`node scripts/check-descriptive-flow.mjs` is an optional live text-only Gemini integration test using synthetic inventory and tutoring fixtures. It verifies duration ranges, questions before writing, and continuation with answers. It consumes API requests and never uploads a user's video.

For a browser export check, run `node scripts/video-export-check-server.cjs` and open `http://127.0.0.1:3102`. The self-contained test page creates synthetic picture and tones, combines them using the real exporter, checks the video and audio tracks, decodes audible narration at both scene starts, verifies a silent gap and removal of original audio, and tests cancellation. It does not access saved sessions, microphones or Gemini.

`node scripts/check-azure-speech.mjs` optionally checks the real Azure connection with a short synthetic passage, reporting duration and elapsed time without revealing credentials. Pass an output WAV path to save the sample. This uses a small amount of the Speech allowance.
