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

- [x] **4. Fix it, and cut it**
  Becomes usable: Each scene shows the description it was built from, and correcting that description rewrites only that scene. Scenes can be deleted. A scene over 15 seconds or over 20% of the clock that covers no criterion is flagged with its cost. Going over the limit is visible immediately. Pasting a rubric that names a different required time produces a mismatch notice while the user's length stands.
  Why now: This is where the app stops generating and starts judging — the half of the kernel the first pass cannot show. It needs real scenes to act on, so it comes after they exist.
  PRD ref: `prd.md > Reviewing and fixing scenes`, `prd.md > The cut`, `prd.md > The clock`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > Components` (`Storyboard`, `SceneCard`, `ClockBar`), `spec.md > What Was Simplified and Why` (cut rule), `spec.md > External Services and Dependencies` (rewrite mode, time-limit detection)
  Build: Editable source description per scene calling the rewrite path for one scene only; editable spoken line and caption; delete a scene; `lib/cuts.ts` with the 15s / 20% / no-criterion rule and a plain flag line; over-limit styling on the clock bar; `lib/rubric.ts` time-limit detection with the mismatch notice; keep the user's chosen length authoritative. Rewrites run on the lite model so corrections do not spend the 20/day prose quota. The sample project's last scene was lengthened so the sample itself shows a cut flag.
  Verify (mechanical): **Verified 23 Oct 2026 in the browser** with a two-screenshot generation: correcting scene two's description and pressing "Rewrite this scene" changed only scene two (scenes one and three byte-identical, eight scenes, clock 1:40 → 1:39); deleting scene three removed exactly its 12 seconds (1:39 → 1:27); the edited scene crossed 15 seconds and showed "Cut this: 18 seconds, and it proves no criterion" while the 12-second scenes showed nothing; a rubric of "Demo limited to 3 minutes" at 2:00 showed "Your rubric names 3:00. The clock stays at 2:00…", and stepping the length to 3 min cleared it and changed the denominator to 3:00; the sample project shows a 25-second, no-criterion cut flag; `cutNote(10, [], 180)` returns null and `cutNote(45, [], 180)` flags; `detectTimeLimit` resolves "3 minutes", "2:30", "180 seconds", "between 2 and 3 minutes", "5 min including Q&A", and returns null for "keep it brief"; `npm run build` passes. A real rewrite call returned a line built from the corrected description.
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

- [x] **5b. Pause the take, from a floating bar**
  Becomes usable: While a screen recording runs, **Pause** freezes the take and **Resume** continues the same file. The paused stretch is cut from the clip and does not count against 3:00. A small always-on-top bar over the project carries Pause, Resume, and Stop, so pausing never requires switching back to DemoScript (that switch would be recorded). Where Document Picture-in-Picture is unavailable, the strip in the page has the same controls.
  Why now: The first take was one unbroken run; a setup break or a notification meant starting over. Pause is the difference between recording in one go and recording calmly, and it belongs to the recording slice before voice is built on top of it.
  PRD ref: `prd.md > Recording your screen`
  Spec ref: `spec.md > Components` (`Recorder`, `RecordingBar`, `RecordingStrip`, `RecordPanel`), `spec.md > Data Model` (`Recording.durationSeconds`), `spec.md > Important Failure Modes`
  Build: `lib/recorder.ts` tracks recorded milliseconds across pause and resume, only auto-stops at 3:00 of footage, and exposes `pause`/`resume`/`paused`; `lib/floatingBar.ts` gains `canFloatControls` and `openRecordingBar` (plain DOM, Pause/Resume/Stop, clock); `app/page.tsx` owns the bar ref and the paused state and closes the bar on finish; `RecordingStrip` gains pause/resume and the paused copy.
  Verify (mechanical): **Verified 23 Oct 2026.** Node harness against the real recorder with a fake `MediaRecorder`: the clock moved for 1.1 s, paused, held at 1.114 across a 1.2 s wait, resumed to 1.629, and the saved duration was 2 s against ~2.8 s of wall time; the fake recorder saw `new, start, pause, resume, stop`, ticks carried the paused flag, and `recordedSeconds` caps at 180. In the browser, with stubbed capture and a detached fake Document PiP document: the take opened the bar at `0:01 of 3:00` with Pause and Stop; Pause changed the bar to "Recording paused" and the strip to "Paused at 0:07 of 3:00", with the clock frozen across 1.3 s; Resume changed both back; Stop from the bar closed it and left "0:23 recorded" with "Record again"; firing the bar's `pagehide` left the recording running and the strip's own Pause/Resume still worked; `npm run build` passes. The real window picker and the real always-on-top window need a human click and are the learner check.
  Learner check: Record a take, pause to set up the next screen, resume, and stop. Does the clip jump straight from the pause to the resume with no dead air — and does the floating bar stay out of your project's way?
  Commit: `Pause the take from a floating bar`

- [x] **6. Rehearse it against the clock**
  Becomes usable: Once a script exists, a quiet strip above the storyboard offers Script and Rehearse. Rehearse runs the clock and highlights the scene being read, moving on when its estimated seconds are up. Pause and stop are always there, and stopping says how far the read got ("You stopped at 0:28 of 2:00 — 1:32 left"). No camera, no microphone, no storage.
  Why now: It is the cheapest of the modes the learner asked for, it builds the strip the voice pass will live in, and it needs no permissions — so if the rhythm is wrong, the expensive slice is not built on a bad base.
  PRD ref: `prd.md > Rehearsing it`, `prd.md > Screens and Layout`
  Spec ref: `spec.md > Components` (`ModeStrip`, `RehearsalPanel`), `spec.md > Data Model`
  Build: `mode` state in `app/page.tsx`; `ModeStrip` rendered only when scenes exist; `RehearsalPanel` with a 250 ms tick, pause and stop, a countdown against the chosen length, a closing line with where the read ended, and a read-only scene list where only the current scene is at full contrast; `lib/timing.ts` gains `sceneIndexAt` and `rehearsalSummary` so the advance and the summary are pure and testable; leaving the mode restores the full storyboard untouched; no media permission is requested anywhere in the path.
  Verify (mechanical): **Verified 23 Oct 2026 in the browser** with an eight-scene script: the strip is absent before a script exists and appears after; Rehearse marked scene one and no other, with the clock at 2:00 and "Start reading" offered; the clock reached 1:58 after 2.5 s; Pause froze it at 1:48 across a 2.2 s wait, with Resume and Stop replacing Pause; Resume advanced it and the mark moved to scene two at 1:45; Stop reported "You stopped at 0:28 of 2:00 — 1:32 left" and offered "Start again"; "Back to script" restored the storyboard with its Edit controls and Script marked current; no permission prompt appeared at any point; `sceneIndexAt([12,17,12], 0|11.9|12|41)` returns `0|0|1|2` and the summary handles under, exact, over, and zero; `npm run build` passes.
  Learner check: Read your script out loud once with rehearsal running. Does the highlight keep up with you, or does it race ahead?
  Commit: `Rehearse the script against the clock`

- [ ] **7. Say it in your own voice**
  Becomes usable: With a take, **Add voice** counts 3-2-1, plays the clip, records the microphone over it, and hands back one `.webm` with picture and sound, previewable and downloadable. A second pass replaces the voice without touching the clip. A refused microphone leaves the silent clip in place and explains what to allow. Hiding the tab stops the pass instead of producing a broken file.
  Why now: This is the output the learner actually wants — their own voice, not a synthetic one — and it depends on the take, the player, and the script already being right. It is also the riskiest piece (permissions, a real-time re-encode, a tab that has to stay visible), so it comes last and leaves everything before it standing on its own if it fails.
  PRD ref: `prd.md > Recording your voice over it`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > Components` (`OverdubPanel`), `spec.md > Data Model` (`Take`), `spec.md > External Services and Dependencies` (browser media APIs), `spec.md > Important Failure Modes`
  Build: `lib/overdub.ts` (hidden muted video → canvas at the take's dimensions, max 1280px wide; `canvas.captureStream(30)` plus `getUserMedia({ audio: true })` into one `MediaStream` and `MediaRecorder`; stop on video end and on `visibilitychange`; stop every track and revoke every object URL on finish, replace, and unmount); `OverdubPanel` with mic permission, 3-2-1 countdown, progress, preview, download, and "Try the voice again"; plain copy for a refused mic and a hidden tab; the mode strip disables the other modes while a pass runs.
  Verify (mechanical): a stubbed 10-second canvas take plus a synthetic audio track produces one file with both a video and an audio track and a duration within a second of the take; a `visibilitychange` during the pass stops it and leaves the silent take downloadable; a denied microphone returns to the take with its message and the file still downloadable; replacing a pass revokes the old URL and stops its tracks; `npm run build` passes. A real microphone and a real window take need a human, so the end-to-end run is confirmed in the learner check.
  Learner check: Record a real minute of your project, add your voice, and play the downloaded file on your phone. Does it sound like the demo you'd submit, or does it need one more pass?
  Commit: `Record your own voice over the clip`

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
- **Added screen recording after slice 3** — the learner asked whether they could record up to three minutes instead of collecting screenshots. In the clarifying questions they chose: recording as a *third* input alongside upload and capture, the clip playing beside the script with scene seeking, scenes with timestamps, and a clip that survives a reload in the same tab. Slice 4 stayed queued; slices 5+ add the recording path without removing the screenshot path.
- **The generated voice was cut before it was built** — the commit's plan had three TTS voices and a separate render-and-export slice. The learner then chose their own voice over the clip: it is what a judge expects to hear, and it needs no TTS route, no audio cache, and no separate export pass. Slices 6 and 7 were rewritten as rehearsal and one own-voice pass.
- **The voice pass re-records the clip in the browser** — a hidden video is drawn into a canvas, the mic rides along, and both go into one MediaRecorder. No ffmpeg download, one synced file, at the cost of a real-time pass (a 1:42 clip takes about 1:42) and a tab that has to stay in front.
- **Rehearsal is a timer, not a camera** — the learner asked for a way to practise; highlight plus clock needs no permissions and no storage, so it can be used without self-consciousness and costs nothing.
- **Slice 4 rewrites use the lite model** — a full script keeps the 20/day quota on `gemini-3.8-flash`; single-scene corrections run on `gemini-3.5-flash-lite` so an edit-heavy session cannot exhaust the good model before the demo is recorded.
- **The sample project now ends on a cut flag** — its final roadmap scene was lengthened past 15 seconds with no criterion coverage, so the kernel's second judgment is visible in the sample, not only after a real generation.
