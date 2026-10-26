---
doc: spec
status: approved
updated: 2026-10-26
---

# DemoScript — Technical Specification

This is the implemented architecture as of 26 October 2026. Product behavior is defined in [prd.md](prd.md); evidence and remaining checks are in [checklist.md](checklist.md).

## How This Works, In Plain Language

The browser holds one recording and the current work. A Next.js server keeps service keys private, sends the recording to Gemini for scene analysis, and uses text-only calls for context questions and narration writing. Optional Azure Speech converts each scene's text into audio. Browser media tools record the user's voice, align all takes and create a video with narration included.

There is no server project database, cloud media library or login. IndexedDB is local persistence, not a backup service.

## Built-in Sample

The learner-supplied Launchpad recording is served as public/sample/launchpad.mp4 (90.6123 seconds of browser playback, about 25.8 MB). Its MP4 track metadata includes offsets and reports a different end time, so scene budgets use the verified browser duration. lib/sampleDemo.ts supplies the factual project brief and eight fixed scene passages; public/sample/launchpad/ contains prepared WAV takes and narration.json with text/slot/duration metadata. lib/loadSampleDemo.ts fetches and validates these assets, inspects the clip and constructs the normal recording/scenes/takes state. The final scene is bounded to the inspected playback duration.

The /?sample=launchpad route is handled by the existing client page. It bypasses normal session restoration and never enables its save-ready flag. lib/sessionStore.ts additionally refuses load/save/clear while that sample query is active. This protects normal saved work even when the sample is edited or removed. A new tab and visible banner separate the example from the visitor's own project. Reload resets sample edits.

Initial sample loading makes no Gemini or Azure call. Explicit rewriting or regeneration still uses the configured service. scripts/prepare-launchpad-narration.mjs is an authoring-only Azure operation, not a visitor request: it reuses takes only when the prepared text matches and writes a resumable metadata manifest. Each bundled take must fit its actual scene duration. The supplied recording remains intact; combined export replaces its original audio using the normal narration mixer.

## Stack

| Area | Current implementation |
|---|---|
| App | Next.js 16.4.2 App Router, React 19.3.1, TypeScript |
| Styling | Tailwind CSS 3.4 and local CSS tokens |
| Video understanding / writing | @google/genai 2.31.0 |
| Automatic voice | Azure Speech regional REST API, called only by the server |
| Audio alignment | Web Audio decoding/resampling, PCM mixing and WAV encoding |
| Combined video export | Mediabunny 1.62.1 and browser codecs/WebCodecs |
| Capture | getDisplayMedia, getUserMedia and MediaRecorder |
| Persistence | IndexedDB, one current session |
| Verified tool runtime | Node 24.21.0; native TypeScript loading in the test scripts requires Node 24+ |

Version numbers reflect the installed snapshot; package.json and the lockfile control dependencies. No ffmpeg.wasm, Kokoro, OpenRouter TTS or Gemini TTS is used in the current app.

## Runtime, Configuration and Deployment

Local development: install dependencies, create .env.local from .env.example, set service credentials and run npm run dev. The default URL is http://localhost:3000. The current preview uses http://localhost:3001, started with npm run start -- --port 3001 after building.

Production build: npm run build -- --webpack. The Webpack option has been used successfully on this machine. npm run start serves that built snapshot; source changes require a rebuild/restart. Next's bundled documentation and AGENTS.md apply before framework code changes.

| Server variable | Purpose |
|---|---|
| GEMINI_API_KEY | Required for video analysis, context planning and writing |
| GEMINI_SCRIPT_MODEL | Optional preferred video-analysis model override |
| AZURE_SPEECH_KEY | Optional Azure Speech resource key for automatic narration |
| AZURE_SPEECH_REGION | Region belonging to that key, such as centralindia |
| AZURE_SPEECH_DAILY_CHAR_LIMIT | Positive character allowance per process per UTC day; defaults to 10000 |

Never use NEXT_PUBLIC_ for service keys. .env.local is ignored by Git. Credential changes require a server restart.

A public host must support Node route handlers, streamed responses, uploads and the processing duration needed for video analysis. The video route declares a 300-second maximum and a 250 MiB input cap; a host may impose smaller limits. Azure narration does not require a dedicated GPU server.

Public deployment is not verified. The Azure daily counter is memory-only and per process, resets on restart, and does not provide shared per-user or per-deployment enforcement. Persistent quotas/access controls and host body/time-limit validation remain deployment work. Provider availability and account quotas must be checked in the actual service accounts rather than treated as permanent free-tier guarantees.

## Core Journey Through the System

1. lib/recorder.ts captures or inspects a clip. Upload and server validation reject durations beyond 180 seconds and uploads above 250 MiB.
2. app/page.tsx owns recording, script, brief, preset, narrator, takes and pending story state.
3. POST /api/video receives multipart video, duration, rubric, preset, narrator and brief. Required brief fields are validated.
4. The server uploads through Gemini's Files API and polls processing, with a 90-second activation deadline. Stage events are streamed as newline-delimited JSON.
5. Video generation uses the configured preferred model, default gemini-3.8-flash, with gemini-3.5-flash-lite as fallback. generateJson provides bounded model attempts and maps quota/network failures.
6. Coincident timestamps are merged, complete scenes are sorted with their text/evidence, and timestamps are validated inside the actual clip. One invalid-timing correction can re-read the same uploaded footage.
7. Scene durations are derived from the next start or clip end. The app does not invent evenly spaced or nudged scene times.
8. prepareDescriptiveStory checks context through storyPlanner. Missing facts return questions; otherwise storyEditor writes descriptive narration.
9. A writing failure after successful analysis returns pending evidence with empty final passages and a recoverable writing message. It does not publish the analysis draft as a finished short summary.
10. The uploaded Gemini file is deleted in a best-effort finally block. Cleanup failure must not be described as guaranteed deletion.
11. POST /api/story continues from cached scene evidence and answers. It returns questions or ordered narration lines without another video upload.
12. Record mode creates local microphone takes or requests WAV audio from POST /api/speech. Browser alignment and export then create the final file.

Structured video timing logs use request IDs and stage durations to distinguish receive, upload, processing, generation, context/writing and cleanup. They do not log service keys.

## Script Generation and Timing Rules

- A scene stores its absolute start, fixed length, visualDescription, caption, spokenLine and criterion IDs.
- orderVisualScenes keeps evidence and narration attached to their original timestamp; invalid negative, repeated, non-finite or out-of-clip starts are refused after the bounded correction path.
- mergeCoincidentScenes combines descriptions and criterion references for identical starts without shifting footage.
- Shots shorter than three seconds are silent.
- narrationBudget returns minimum floor(seconds × 1.8), target floor(seconds × 2.1), maximum floor(seconds × 2.4).
- storyFlowInstruction supplies the whole narrative arc, creator brief, scene evidence and follow-up answers.
- Whole-story writing uses timedPassages: each requested scene has exact visualEvidence and a spokenWords array with structural item bounds. The model must return individual words, with punctuation attached; accepted arrays are joined into ordinary prose.
- Runtime validation checks token shape, word counts and evidence. Valid passages remain locked; only rejected indices are requested again, for up to three passes.
- applyStoryLines validates complete scene coverage and applies text without changing scene boundaries.
- Single-scene rewrites still use a bounded prose schema and up to three count-check attempts. They receive neighboring narration and context. This is separate from the whole-story word-array writer.
- Default context, story and rewrite calls use gemini-3.5-flash-lite. The preferred override is not a universal override for every text call.
- The context planner asks at most three focused questions in one response. Explicit unknown/omit answers are factual constraints, not invitations to invent details.

## API Routes

| Route | Input | Output / responsibilities |
|---|---|---|
| /api/video | Multipart recording, duration and project context | NDJSON stage/done/error events; timed observations, criteria, final narration or pending questions/writing state |
| /api/story | JSON scenes, brief, preset, narrator and contextAnswers | Questions or ordered narration lines; validates 1–40 scenes and bounded timings |
| /api/script | JSON rewrite request for one scene | spokenLine, caption and normalized covers; preserves prior line on failure |
| /api/speech | JSON text, seconds and allowlisted voice | audio/wav with X-Audio-Duration, or a safe JSON error |

The historical /api/analyze and /api/tts routes are absent.

## Components and Responsibilities

| Component | Responsibility |
|---|---|
| UploadColumn / RecordingStrip | Input choice, capture lifecycle, preset/narrator, interview and rubric |
| ProjectInterview | Three required project answers plus two optional ones |
| ProgressBar | Stage/status feedback during lengthy operations |
| StoryQuestions | Focused questions and text-only continuation |
| VideoPlayer | Clip preview, seeking, scene marks and video-clock updates |
| Storyboard / SceneCard | Script, editable scene text/caption, evidence, word budget, rewrite, delete and copy |
| CriteriaPanel / ClockBar | Mapped coverage, cut advice, clip running time and rubric limit |
| ModeStrip / RehearsalPanel | Script, rehearsal and recording modes; actual-clock rehearsal |
| VoiceRecordingMode / VoiceScene | Per-scene capture, countdown, playback, deletion, status and WPM |
| AutomaticNarration | Voice selection, missing-scene generation, stop/resume and existing-take protection |
| NarrationExport | Aligned WAV, combined video, progress/cancel, preview and separate downloads |

## Data Model and Persistence

| Type / store | Important fields |
|---|---|
| Recording | blob, mimeType, durationSeconds, posterDataUrl, createdAt |
| Scene | id, startSeconds, seconds, spokenLine, caption, visualDescription, rewrite description, covers |
| ProjectBrief | problem, solution, highlights, difference, takeaway |
| StoryQuestion | id, sceneIndex, question |
| ContextAnswer | question, answer |
| PendingStory | analyzed scenes, criteria, questions, current answers, accumulated contextAnswers, writingError |
| SceneTake | blob, spokenLine snapshot, durationSeconds, source: voice or tts, status, wpm, wpmOutOfRange |
| StoredSession | recording, scenes, criteria, rubric, preset, narrator, takes, brief, pendingStory, contextAnswers |

Sample preview uses the same in-memory state types but does not access StoredSession.

lib/sessionStore.ts serializes writes to IndexedDB database demoscript, version 1, store session, key current. app/page.tsx schedules saves after 150 ms and reports saving/saved/failed. Blobs are stored directly; no base64 media store or server database is used.

Restoration does not generate a new script or synthesize voice. Browser storage is scoped to origin, including port. Saving may fail; site-data deletion removes the session. Export blobs are cached in component state and rebuilt after reload.

## Microphone Capture and Take Protection

MediaRecorder uses supported WebM/Opus or MP4 audio. Capture offers a countdown, analyser-based level meter and timer. Its safety stop is min(180 seconds, max(8 seconds, 2 × scene length)). Finishing replaces only the target scene; cancellation and failed capture preserve the previous blob.

SceneTake stores the script text used for capture/generation. Text edits retain audio but make it stale. Replacement of the whole recording/script is guarded when takes exist; deleting a scene removes only its take. A missing take, changed script or overflowing decoded audio blocks aligned export.

Take status is Too long for any duration beyond the slot, Too short below half the target, otherwise Recorded. WPM outside 110–180 is flagged; it is guidance, not automatic trimming.

## Azure Speech

lib/azureSpeech.ts is used only by the server route. It reads AZURE_SPEECH_KEY and AZURE_SPEECH_REGION and posts SSML to the region's tts.speech.microsoft.com/cognitiveservices/v1 endpoint. The key is sent only as the Azure subscription-key header.

- Voices: en-US-JennyNeural, en-US-GuyNeural, en-GB-SoniaNeural.
- XML escaping prevents script text from injecting SSML.
- Input is limited to 4000 text characters and scenes between 3 and 180 seconds. Invalid voices/control characters are refused. Explicit foreign origins are rejected.
- Output format: riff-24khz-16bit-mono-pcm; responses use Cache-Control: no-store and X-Audio-Duration.
- WAV chunk parsing measures actual duration, including generated silence.
- fitSpeech targets approximately 92% of the slot, accepts a fitting natural read, and can adjust synthesis speed within 0.75–1.35 for at most three attempts. A fitting but short read may be accepted at the lower rate bound rather than padded with invented speech.
- Audio that still overruns is refused with 422; it is not cropped.
- Each provider fetch has a 40-second timeout and receives the request abort signal.
- One generation is active per server process; a UTC-day character counter defaults to 10000. Attempts reserve text characters conservatively, including failed provider requests. This is a local guard, not an exact Azure billing meter.
- Missing/bad configuration, rejected credentials, limits and service errors map to safe messages. Provider response bodies and keys are not forwarded or logged.
- The client generates sequentially, saves completed takes immediately, skips all existing audio, and rejects late results for changed/deleted scenes.
- Cancelling aborts the current request and keeps completed takes.

Microsoft documentation: [REST API](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-text-to-speech), [SSML voice controls](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-synthesis-markup-voice). Actual account usage is measured in Azure, not by the in-memory safeguard.

## Audio Alignment and Combined Export

lib/narration.ts decodes each current take, resamples/downmixes through OfflineAudioContext and places samples at absolute scene offsets. The output is 48 kHz mono, 16-bit PCM WAV with the exact requested timeline duration. Missing spoken takes, stale text, overlaps and overflow are refused. Deleted scenes and gaps remain silent.

lib/videoExport.ts uses Mediabunny with two composable conversions: picture from the original recording and audio from the aligned WAV. Original source audio is discarded.

It prefers MP4/AVC/AAC when supported, otherwise WebM with Opus and a supported VP8/VP9/AV1 video path. Compatible picture data may be copied; other inputs may require re-encoding. The app does not promise universal codec support or zero re-encoding.

Conversions advance together in one-second increments, then finalize. Abort cancels conversions/output and disposes inputs. A completed file must have both video and audio tracks. NarrationExport invalidates results when scene, take or recording references change. Separate-file links are secondary and label the original footage as without narration.

## Important Failure Modes

| Failure | Current response |
|---|---|
| Unsupported/unreadable/overlong upload | Refuse replacement; preserve current work |
| Gemini quota or processing failure | Keep clip and report actionable failure |
| Invalid scene timings | One footage-grounded correction; no invented timing fallback |
| Missing factual context | Ask focused questions before narration |
| Writing still invalid | Keep pending observations/answers for text-only continuation |
| Late rewrite/expansion response | Preserve newer edits |
| Microphone denied/cancelled | Keep previous take |
| Azure overrun or quota failure | Keep completed takes and offer shortening/manual recording |
| Stale/overlong/missing take | Block aligned export |
| Unsupported export codec | Explain browser limitation; preserve sources |
| Interrupted export | Cancel safely; source clip and takes remain |
| IndexedDB failure | Show save warning and warn before leaving |

## Sharing and Submission Links

- Public repository: https://github.com/fernandoshanegihan-coder/DemoScript — application publication and anonymous access verified on 26 October 2026 at commit d1d2374. The app, Launchpad video/audio sample and app map are present. The existing GitHub initial README commit is preserved in the merged history.
- The learner explicitly authorized publishing the reviewed local source, sample media and history on 26 October 2026. Secret environment files and the private learner profile are excluded. The separate untracked public/sample-app source folder was not uploaded.
- Submission demo video: https://www.youtube.com/watch?v=UTvgLxSsgRI — titled DemoScript, approximately 2:14. The page loaded signed out and playback started without a login requirement on 26 October 2026. Exact form constraints remain to be checked in the learner's submission form. The walkthrough shows DemoScript's upload/context/analysis start, an explicitly identified prepared sample, rehearsal, narration and video export. Original preview audio is preserved without overlapping added narration. The Launchpad clip alone is the app's built-in sample, not a replacement for this DemoScript walkthrough.
- Live deployment: optional; not performed or required for the local proof-of-concept demonstration.

## Verification

Latest recorded checks: 39 regression tests, TypeScript validation during production build, and final Webpack build passed. Synthetic live story tests covered 15-, 30-, 20- and 35-second scenes, missing-context questions and continuation without video.

Azure connection check: a synthetic 10-second scene produced a 9.8625-second WAV in about two seconds on this machine; this is a sample, not a latency guarantee. Browser acceptance generated one missing voice, kept an existing microphone-source take, skipped a silent transition and downloaded a 16-second MP4 with one AAC audio track and AVC video.

Commands:

    npm test
    npx tsc --noEmit
    npm run build -- --webpack

Optional live checks:

- scripts/check-descriptive-flow.mjs: synthetic Gemini story/context checks.
- scripts/check-azure-speech.mjs: synthetic Azure narration, optional WAV output.
- scripts/video-export-check-server.cjs and its HTML fixture: generated picture/tones, track presence, audible intervals, silent gap, source-audio removal and cancellation.
- scripts/narration-browser.cjs: browser regression harness; its latest wording is updated, but the full harness was not rerun during the Azure change.

Temporary acceptance routes have been removed. The learner subsequently confirmed final acceptance; this is user-reported review, separate from the agent's synthetic checks. No production deployment or all-device guarantee is claimed. The standalone app map describes source snapshot 5668640 and a reference export route; it is not an interactive code-tour record.
