---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast mode

## Slices

- [x] **1. The promise: a real page, an empty storyboard, and a working sample**
  Becomes usable: A running app in the real look — wordmark, two columns, ghosted skeleton storyboard with the clock bar and the one explanatory sentence. One click on "Try it with a sample project" fills both columns with a finished storyboard, including a criterion that starts red and one that is green. This is already the opening of the demo video.
  Why now: Bootstrapping, the design direction, and the product's kernel all land in one slice. The red criterion is visible on screen before any AI is wired up, so the thing a reviewer remembers exists from step one.
  PRD ref: `prd.md > Screens and Layout`, `prd.md > Look and Feel`, `prd.md > The sample project`
  Spec ref: `spec.md > File Structure`, `spec.md > Components` (`SkeletonStoryboard`, `Storyboard`, `SceneCard`, `CriteriaPanel`, `ClockBar`), `spec.md > Look and Feel`
  Build: Scaffold Next.js + TypeScript + Tailwind per the structure; set the type and color tokens from a deliberate design pass (no generic AI-app defaults); build `app/page.tsx` with the wordmark, positioning line, and 45/55 columns; build `SkeletonStoryboard` and the sample-filled `Storyboard` with scene cards, clock bar, and criteria panel; add `lib/types.ts`, `lib/sampleProject.ts`, and sample images under `public/sample/`.
  Verify (mechanical): `npm install` completes; `npm run dev` starts with no errors; loading `/` shows the skeleton with no criteria circles and the single explanatory sentence; clicking the sample link fills both columns with at least three scenes, a non-zero clock, and at least one red criterion; `npm run build` passes.
  Learner check: Open `localhost:3000`. Look at the empty screen — does it read as "a quiet desk, not a dashboard" and does it explain itself? Then click "Try it with a sample project" and say whether the red criterion lands as the thing that matters.
  Commit: `Add page shell, empty-state storyboard, and sample project`

- [x] **2. Screenshots go in**
  Becomes usable: Drop screenshots and they become numbered thumbnails you can reorder, each with a "what do you do here?" note field and a "+ add another action" link. A seventh is refused with a plain line. Tone and length controls are live. The button says what's missing until there's an image. No network calls yet.
  Why now: The input column is where the human's knowledge enters the product, and notes outrank what the model can see. Getting it right before spending API calls means later debugging is about the model, not the form.
  PRD ref: `prd.md > Uploading and arranging screenshots`, `prd.md > Tone and length`, `prd.md > Screens and Layout`
  Spec ref: `spec.md > Components` (`UploadColumn`, `ThumbnailList`, `ToneLengthControls`), `spec.md > Data Model`
  Build: File drop and picker with image validation and client-side downscale to 1600px; page state for shots and actions; numbered, drag-reorderable thumbnails; per-shot note field; "+ add another action"; 6-image cap with a plain refusal; tone control (Professional preselected) and 1–3 minute length control; disabled button with "Add a screenshot to start."
  Verify (mechanical): Dropping two images produces two numbered thumbnails in drop order; dragging reorders and the order survives a re-render; a non-image file is rejected with a plain message; a seventh image is refused and the existing six remain; the button enables with one image; changing length updates the clock denominator in the skeleton.
  Learner check: Drop three of your own screenshots, add a short note to each, reorder one. Does this feel like something you'd use at 11pm, or is anything asking too much of you?
  Commit: `Accept screenshots with notes, ordering, and a six-image cap`

- [x] **2b. Capture frames from your own screen**
  Becomes usable: A second button under the drop area shares a window or tab and stays open while you click through your project. Each "Capture frame" adds the next numbered thumbnail with an empty note, so a one-page app can produce several frames. "Stop sharing" ends it.
  Why now: It changes where screenshots come from, which is input-side work. Doing it before the Gemini slices means the API work is built against the final input path, not one that changes underneath it.
  PRD ref: `prd.md > Capturing frames from your own screen`, `prd.md > Screens and Layout`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > Components` (`CaptureBar`), `spec.md > Important Failure Modes`, `spec.md > File Structure`
  Build: `lib/capture.ts` wrapping `getDisplayMedia`, a ref-held stream, and canvas frame grabbing at the same 1600px/JPEG sizing as uploads; a `CaptureBar` shown while sharing; "Capture screenshots" and "Stop sharing" controls in `UploadColumn`; plain messages for refusal and unsupported browsers; stop tracks on stop, unmount, and the browser's own "stop sharing."
  Verify (mechanical): The button renders next to "Choose screenshots"; where `getDisplayMedia` is unavailable or refused, clicking it shows the plain message and leaves the rest of the app working; the capture path adds a shot through the same state function as uploads, confirmed by the shared cap and numbering; no tracks remain after stop; `npm run build` passes. Real frame capture needs a human click in the browser picker, so it is confirmed in the learner check.
  Learner check: Share the window with your project running, walk through two or three states of your one-page app, and capture a frame at each. Does the flow of frames match how you'd actually demo it?
  Commit: `Capture frames from a shared screen`

- [x] **3. Real screenshots become a script with a red criterion**
  Becomes usable: The button calls Gemini. Each screenshot is read and returns a description plus a confidence flag; a low-confidence image asks "not clear — what does it show?" instead of inventing. One generation call returns the parsed criteria and the scenes. The storyboard fills with spoken lines, captions, timer chips, and a clock; criteria go red or green; the script copies to the clipboard as plain text.
  Why now: This is the kernel and the only external dependency, proven together — with the shell and inputs already good enough to land the output in. Start by verifying the model, so a quota surprise arrives before any UI is built on top of it.
  PRD ref: `prd.md > Making the script`, `prd.md > The criteria panel`, `prd.md > Copying the script`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > External Services and Dependencies`, `spec.md > Components` (`Storyboard`, `SceneCard`, `CriteriaPanel`), `spec.md > Data Model`, `spec.md > Important Failure Modes`
  Build: **Verified 23 Oct 2026 with the real key:** free tier is per model and per day — `gemini-3.8-flash` 5 rpm / **20 requests/day**, `gemini-3.5-flash-lite` 10 rpm / **500 requests/day**; `gemini-3-flash` and `gemini-2.5-flash` no longer exist, `gemini-flash-latest` aliases 3.8. Setup: `lib/gemini.ts` (two models, schema-enforced JSON, one retry, automatic fallback to flash-lite when the daily quota is gone) and `lib/prompts.ts`; `app/api/analyze/route.ts` (one call for all images — a per-image call would burn the 20/day cap before the script was written); `app/api/script/route.ts` (criteria + scenes, criterion ids renumbered so scenes and panel cannot disagree); wire the button with in-place progress; render real scenes; compute `seconds` in `lib/timing.ts`; criteria panel red/green; copy to clipboard; plain error states.
  Verify (mechanical): scratch call returned valid responses and the model IDs and daily limits are recorded above; a 3-screenshot generation returned 8 scenes, all 3 screenshots used, 4 parsed criteria (two green, two red in the first run) and a clock of 1:18 that equals the sum of the scene chips; a deliberately blurred screenshot produced "I couldn't read screenshot 2 — add a note for it" with the other screenshot's scenes written and nothing invented; an emptied `GEMINI_API_KEY` produced the plain setup message with the route returning 400 and the page's state untouched (checked at the API; the UI error path is the same one exercised by the rate-limit case); the copied text contains every scene in order with its caption and timer.
  Learner check: Run a script from two or three of your real project screenshots. Does the spoken text sound like something you'd actually say out loud — and did any red criterion surprise you?
  Commit: `Generate script and criteria from real screenshots`

- [ ] **4. Fix it, and cut it**
  Becomes usable: Each scene shows the description it was built from, and correcting that description rewrites only that scene. Scenes can be deleted. A scene over 15 seconds or over 20% of the clock that covers no criterion is flagged with its cost. Going over the limit is visible immediately. Pasting a rubric that names a different required time produces a mismatch notice while the user's length stands.
  Why now: This is where the app stops generating and starts judging — the half of the kernel the first pass cannot show. It needs real scenes to act on, so it comes after they exist.
  PRD ref: `prd.md > Reviewing and fixing scenes`, `prd.md > The cut`, `prd.md > The clock`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > Components` (`Storyboard`, `SceneCard`, `ClockBar`), `spec.md > What Was Simplified and Why` (cut rule), `spec.md > External Services and Dependencies` (rewrite mode, time-limit detection)
  Build: Editable source description per scene calling the rewrite path for one scene only; editable spoken line and caption; delete a scene; `lib/cuts.ts` with the 15s / 20% / no-criterion rule and a plain flag line; over-limit styling on the clock bar; `lib/rubric.ts` time-limit detection with the mismatch notice; keep the user's chosen length authoritative.
  Verify (mechanical): Editing scene two's description changes scene two's spoken line and leaves scenes one and three byte-identical; deleting a scene reduces the clock by that scene's duration; a 45-second no-criterion scene is flagged and a 10-second no-criterion scene is not; a rubric containing "3 minute demo" with length set to 2:00 shows the mismatch notice and the clock still reads `/ 2:00`; the app still starts clean with no rubric.
  Learner check: Deliberately upload a hard-to-read screenshot (a photo of your screen at an angle) and confirm the app asks instead of guessing. Then check that a cut flag feels fair rather than fussy.
  Commit: `Add scene rewrites, cut flags, and the time mismatch notice`

- [x] **5. Record three minutes, and put it beside the script**
  Becomes usable: A third input, "Record screen," captures up to 3:00 of the project and stops itself at the limit. The clip is kept in the tab and survives a reload. Pressing Make my script uploads the clip once, and one call returns scenes with the moment each one starts. The clip plays at the top of the right column, a thin timeline marks every scene, and clicking a scene seeks there. The screenshot path keeps working unchanged.
  Why now: This is the new input and the raw material for everything after it. Getting the recording, the timestamp and the player right before adding voice means narration is built against footage that already plays and seeks.
  PRD ref: `prd.md > Recording your screen`, `prd.md > Playing the recording`, `prd.md > Screens and Layout`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > Stack`, `spec.md > Components` (`Recorder`, `RecordingStrip`, `VideoPlayer`), `spec.md > Data Model` (`Recording`, `StoredSession`, `Scene.startSeconds`), `spec.md > External Services and Dependencies` (recording analysis), `spec.md > Important Failure Modes`
  Build: `lib/recorder.ts` (getDisplayMedia + MediaRecorder video-only, elapsed ticker, 3:00 auto-stop, stop tracks on stop/unmount); `lib/sessionStore.ts` (IndexedDB put/get/delete of the clip plus its script and settings); `app/api/video/route.ts` (Files API upload, poll to ACTIVE, one structured call, sort/clamp timestamps, delete the file in a `finally`); `Recorder` and `RecordingStrip` in the input column; `VideoPlayer` above the storyboard with scene marks and click-to-seek; restore a stored session on load with no model call.
  Verify (mechanical): **Verified 23 Oct 2026** with a synthetic 10-second canvas capture (a real window picker needs a human click): the clip weighed 105 KB, was written to IndexedDB, and came back after a reload with its settings and no network request; `/api/video` returned two timestamped scenes in 18 seconds, the first at `0:00`, all inside the clip, with the clock reading the clip's own `0:10`; clicking a scene moved `video.currentTime` to `0:02`; the player is muted; with the limit temporarily lowered to 5 seconds the recorder stopped on its own at `0:05` and kept the clip; an empty upload returned 400 with "No recording to read"; the screenshot path then generated a 1:34 script end to end, so the refactored criteria parsing still works; `npm run build` passes. Real screen capture, the window picker, and cue accuracy are confirmed in the learner check.
  Learner check: Record a minute of yourself clicking through your project, then press play and click three scenes. Do the scenes land on the moments you'd expect, and does the timing feel like your demo?
  Commit: `Record the screen and play it beside the script`

- [ ] **6. A voice that fits the moment**
  Becomes usable: A voice selector with three names. Pressing play speaks each scene's line over the muted clip, at a rate nudged between 0.85× and 1.15× so the line lands inside its scene. Changing the voice re-renders on the next play. A scene with no line stays silent; a long line is sped up rather than cut.
  Why now: Narration is the first output that uses both the script and the footage. It needs timestamps that already work; it does not need the export, which is the last and heaviest slice.
  PRD ref: `prd.md > Narration`, `prd.md > Product Decisions` (one voice at a time, stretch to fit)
  Spec ref: `spec.md > Components` (`NarrationPanel`), `spec.md > External Services and Dependencies` (TTS), `spec.md > Important Failure Modes`
  Build: `app/api/tts/route.ts` (line + voice → WAV, plain errors on quota); `lib/narration.ts` (three voices, per-scene audio cache keyed by scene + voice + line, decode to AudioBuffer, rate = clamp(window / duration, 0.85, 1.15), schedule against the video clock, stop all sources on pause/seek/unmount); `NarrationPanel` with the voice choice, play-with-narration control, and a quiet "voice unavailable" line.
  Verify (mechanical): a short line leaves silence until the next scene; a line longer than its window is played at ≤1.15× and still starts at its scene's moment; changing the voice produces new audio on the next play and reuses cache when unchanged; the recording's own audio is never heard while narration is on; a failed TTS call leaves the script and player usable and says so plainly; `npm run build` passes.
  Learner check: Listen to a full minute with the voice on. Does it sound like a narration of your demo, or like a machine reading a list — and is the speed-up ever noticeable enough to bother you?
  Commit: `Narrate scenes in three voices, stretched to fit`

- [ ] **7. One finished file**
  Becomes usable: "Export narrated video" renders the clip and the voice into a single `.webm` and offers it for download. A progress line shows the current second against the clip's length and asks the user to keep the tab visible. Hiding the tab pauses the render instead of producing a broken file. The downloaded file plays elsewhere with the generated voice and no original audio.
  Why now: This is the output the learner asked for, and it depends on playback and narration already being right. It is also the slice most likely to need tuning against a real file, so it comes after the parts it renders.
  PRD ref: `prd.md > Exporting the narrated video`, `prd.md > States and Boundaries` (export states)
  Spec ref: `spec.md > Components` (`ExportControl`), `spec.md > Stack` (canvas + WebAudio + MediaRecorder), `spec.md > Important Failure Modes`
  Build: `lib/exportVideo.ts` (hidden muted video → canvas at the clip's aspect ratio, max 1280px wide; narration buffers through a MediaStreamAudioDestinationNode; canvas stream + audio track into a MediaRecorder; progress from `currentTime`; pause on `visibilitychange`; revoke the object URL and stop tracks on finish/cancel); `ExportControl` with progress, stop, and the download link.
  Verify (mechanical): exporting a 20-second clip produces a file whose duration is within a second of the source and which plays in a second player with audible narration and no original audio; text-heavy frames stay legible at 1280px; hiding the tab pauses progress and returning resumes it; cancelling stops the recorder and leaves the script and clip untouched; the link only appears after `onstop`; `npm run build` passes.
  Learner check: Export a real one-minute demo, play the downloaded file on your phone or in another app, and say whether you'd submit it as your hackathon video.
  Commit: `Export the narrated demo as one video file`

## Hands-on Checkpoints

- [x] Early usable behavior explored — after slice 2 (the look, the empty state, and the input column; feedback produced screen capture and then the floating bar)
- [ ] Final kick-the-tires exploration and feedback completed

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [ ] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [ ] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: [pending]
Route and stops: [pending]
Edit outcome: [pending]
Reflection: [pending]
Activity mode: [pending]

## Revisions

- Added in-app screen capture (slice 2b) — the learner's project has one page, so a single screenshot cannot show the flow; frames captured from a shared window enter the same thumbnail list as uploads.
- Capture moved into a floating always-on-top window — the first version made the user switch back to DemoScript for every frame, which is the friction the product exists to remove. Browsers without `documentPictureInPicture` keep the in-page bar.
- Analysis collapsed into one call for all screenshots — the free tier is 20 requests/day on the good model, so one call per image would exhaust a demo before the script was written.
- Two models instead of one — reading uses `gemini-3.5-flash-lite` (500/day), writing prefers `gemini-3.8-flash` (20/day) and falls back to flash-lite when its quota is gone. The student never sees a dead end they cannot fix.
- The script brief now targets one scene per ~15 seconds and allows reusing a screenshot — the first real run filled 0:25 of a 2:00 video because it wrote exactly one short scene per image.
- **Added screen recording, generated narration, and one-file export after slice 3** — the learner asked whether they could record up to three minutes instead of collecting screenshots, hear a generated voice over it, and get a finished file. In the clarifying questions they chose: recording as a *third* input alongside upload and capture, the clip playing beside the script with scene seeking, scenes with timestamps, three selectable voices, stretch-to-fit rather than overlap, the recording's own voice removed entirely, export of the finished narrated video, and a clip that survives a reload in the same tab. Slice 4 stays queued; slices 5–7 add the recording path without removing the screenshot path.
- **Recording is picture-only** — the learner chose "remove speaking, only one at a time," so no microphone is requested and the generated narration is the only voice. This also avoids a transcription step and a second audio source to reconcile.
- **Video analysis is one call with timestamps, not frames plus transcript** — one request per generation keeps the 20/day cap in reach, and the model's scene boundaries are enough for seeking. Evident drift is handled in the player, not by a retiming UI.
- **Export re-records the playing clip in the browser** — canvas plus WebAudio plus MediaRecorder needs no ffmpeg download and produces one file, at the cost of real-time rendering (a 1:42 clip takes about 1:42) and a tab that has to stay visible.
