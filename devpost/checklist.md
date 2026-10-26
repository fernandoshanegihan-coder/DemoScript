---
doc: checklist
status: approved
updated: 2026-10-26
---

# DemoScript — Build Checklist

Build mode: fast mode.

5-build position: implementation recorded; final hands-on review, source-checkpoint audit and learning wrap-up pending. Resume those items rather than rebuilding checked slices.

This is the current implementation checklist. Checked items mean the implementation and evidence listed below exist; they do not certify every browser, every recording or the learner's final submission.

Earlier slices and abandoned designs remain in [the archived build history](archive/build-history-before-2026-10-26-sync.md). That log describes previous versions and is not the current specification. [scope.md](scope.md), [prd.md](prd.md) and [spec.md](spec.md) describe the app now.

## Slices

These are retrospective records of implemented behavior, not a claim that 5-build was invoked for each earlier change. Mechanical evidence is distinguished from learner checks. Historical per-slice commits are not reconstructed; the outstanding source-checkpoint audit is tracked under Final Review.

- [x] **1. One recording input and a working page**
  Becomes usable: Capture or upload one clip; warm, light two-column UI; poster, player and recording controls; presets and I/We. Screenshot input and cached sample project removed.
  Why now: Proves the input-to-storyboard journey before later media work.
  PRD ref: prd.md > Recording and Uploading; prd.md > Screens and Layout
  Spec ref: spec.md > Core Journey Through the System; spec.md > Components and Responsibilities
  Build: app/page.tsx, UploadColumn, RecordingStrip, VideoPlayer and the removed screenshot/sample paths.
  Verify (mechanical): Recorded browser checks accepted a synthetic WebM and displayed its poster/player; final app availability is checked below.
  Learner check: Open the app, add your own recording and confirm its preview and preset choices are clear.
  Commit: Make the recording the only input and upload existing clips (suggested historical message; exact per-slice checkpoint not verified)

- [x] **2. Capture and upload boundaries**
  Becomes usable: Capture pause/resume; three-minute cap on both capture and upload; 250 MiB upload cap; unreadable replacement preserves the current clip; floating capture controls with in-page fallback.
  Why now: Keeps real recordings inside the supported processing boundary.
  PRD ref: prd.md > Recording and Uploading
  Spec ref: spec.md > Core Journey Through the System; spec.md > Important Failure Modes
  Build: lib/recorder.ts and lib/floatingBar.ts; client and /api/video size/duration validation.
  Verify (mechanical): Code and recorded checks cover the 180-second and 250 MiB gates; earlier capture/pause checks are in the archive.
  Learner check: Record, pause and resume; try an unsupported or overlong file and confirm the current recording remains.
  Commit: Preserve capture timing and validate replacement uploads (suggested historical message; exact per-slice checkpoint not verified)

- [x] **3. Professional project interview**
  Becomes usable: Require problem/audience, solution and key moments. Keep difference and takeaway optional. Use context alongside footage rather than reading screen labels.
  Why now: Supplies the facts that footage cannot explain.
  PRD ref: prd.md > Project Context and Audience; prd.md > Analysis, Follow-ups and Writing
  Spec ref: spec.md > Components and Responsibilities; spec.md > Data Model and Persistence
  Build: ProjectInterview, lib/projectBrief.ts and brief state/API payloads.
  Verify (mechanical): Regression tests cover required brief fields, normalization and separation of creator context from visual evidence.
  Learner check: Answer the project questions and check that the script explains your project's purpose accurately.
  Commit: Use the creator brief to shape the demo story (suggested historical message; exact per-slice checkpoint not verified)

- [x] **4. Video analysis with defensible timing**
  Becomes usable: Gemini Files API, streamed stage feedback and stage timing logs. Keep complete scene/evidence pairs together; merge identical starts; one correction for invalid timings; no even-spacing or timestamp-nudging fallback.
  Why now: Prevents narration from moving away from the action it describes.
  PRD ref: prd.md > Analysis, Follow-ups and Writing
  Spec ref: spec.md > Script Generation and Timing Rules; spec.md > Core Journey Through the System
  Build: /api/video, lib/sceneTimeline.ts, model bounds, merged coincident starts and timing logs.
  Verify (mechanical): Regression tests cover sorting with evidence attached, invalid timestamps, coincident starts, one grounded correction and unchanged quota/network errors.
  Learner check: Seek to several scenes and compare their On screen observations with that exact footage.
  Commit: Keep scene evidence attached to validated video timings (suggested historical message; exact per-slice checkpoint not verified)

- [x] **5. Focused follow-up questions and recovery**
  Becomes usable: Ask up to three scene-specific questions when context is insufficient; preserve pending analysis and answers; continue writing without another video upload.
  Why now: Avoids guessing and repeating costly video uploads.
  PRD ref: prd.md > Analysis, Follow-ups and Writing; prd.md > Saving and Recovery
  Spec ref: spec.md > Core Journey Through the System; spec.md > API Routes; spec.md > Data Model and Persistence
  Build: storyPlanner, StoryQuestions, PendingStory and /api/story continuation.
  Verify (mechanical): Synthetic live context checks asked a focused question and resumed a 35-second scene after answers, without another video upload.
  Learner check: Answer a focused follow-up, reload after saving, and confirm you can continue from the same analysis.
  Commit: Ask focused questions before descriptive narration (suggested historical message; exact per-slice checkpoint not verified)

- [x] **6. Descriptive story fitted to scenes**
  Becomes usable: One connected spoken argument, supported explanations and natural transitions. Scenes at least three seconds use 1.8–2.4 words/second, targeting 2.1; shorter shots stay silent. Whole-story generation uses bounded word arrays, validates them and repairs rejected scenes only.
  Why now: Delivers the learner's main goal: explanatory speech rather than a summary.
  PRD ref: prd.md > Analysis, Follow-ups and Writing
  Spec ref: spec.md > Script Generation and Timing Rules
  Build: storyFlow, narrationBudget, timedPassages and storyEditor; fixed slots, silent short shots, bounded word arrays and targeted repair.
  Verify (mechanical): Regression tests check budgets, accepted-passage preservation and rejection of malformed/ungrounded arrays; live scenes of 15, 30, 20 and 35 seconds fitted their ranges.
  Learner check: Read a long scene aloud; check that it explains the action and its meaning throughout, with natural transitions.
  Commit: Fit connected descriptive passages to scene durations (suggested historical message; exact per-slice checkpoint not verified)

- [x] **7. Review, rewrite and expand**
  Becomes usable: Edit scene text/caption; single-scene rewrite receives evidence, neighboring lines and context; Expand explanations reuses cached observations. Keep fixed scene boundaries and newer edits.
  Why now: Lets the creator improve content without disturbing the footage or newer edits.
  PRD ref: prd.md > Reviewing and Fixing Scenes
  Spec ref: spec.md > Script Generation and Timing Rules; spec.md > API Routes; spec.md > Important Failure Modes
  Build: SceneCard edits, /api/script, Expand explanations and late-response guards in app/page.tsx.
  Verify (mechanical): Recorded regression checks preserve scene boundaries/evidence; source inspection confirms one-scene updates and rejection of stale whole-story responses.
  Learner check: Edit one scene, rewrite another and expand the story; verify unrelated text and footage boundaries stay in place.
  Commit: Preserve scene boundaries and newer edits during rewrites (suggested historical message; exact per-slice checkpoint not verified)

- [x] **8. Rubric and time review**
  Becomes usable: Optional normalized criteria and coverage mappings; advisory cut flags; clip running time compared with a recognizable rubric time limit. No target-duration selector or scoring system.
  Why now: Adds evidence and time review without making unsupported grading claims.
  PRD ref: prd.md > Rubric Coverage, Cut Advice and Running Time
  Spec ref: spec.md > Components and Responsibilities
  Build: CriteriaPanel, ClockBar, lib/criteria.ts, lib/cuts.ts and lib/rubric.ts.
  Verify (mechanical): Earlier criterion/cut/rubric checks are recorded in the archived build log; current code uses clip time and advisory coverage mappings.
  Learner check: Paste a rubric and review uncovered criteria and the time warning; do not treat a green label as a verified grade.
  Commit: Review rubric evidence and the recording time limit (suggested historical message; exact per-slice checkpoint not verified)

- [x] **9. Video-clock rehearsal**
  Becomes usable: Highlight by actual footage time, with pause/resume/stop and correct gap/boundary behavior.
  Why now: Tests the narrative against the actual footage before recording voice.
  PRD ref: prd.md > Rehearsal
  Spec ref: spec.md > Components and Responsibilities; spec.md > Script Generation and Timing Rules
  Build: RehearsalPanel, VideoPlayer and sceneAtVideoTime.
  Verify (mechanical): Regression tests cover exact scene boundaries and deleted gaps; previous browser checks covered pause/resume and seeking.
  Learner check: Rehearse, pause and seek; check that the highlighted scene follows the video.
  Commit: Follow the video clock during rehearsal (suggested historical message; exact per-slice checkpoint not verified)

- [x] **10. Per-scene voice capture and take protection**
  Becomes usable: Countdown, timer, level meter, playback, delete and download; preserve previous take on cancel/failure; retain stale or long audio but block invalid aligned export.
  Why now: Makes retakes local and prevents accidental loss or clipping of audio.
  PRD ref: prd.md > Recording Your Voice; prd.md > Reviewing and Fixing Scenes
  Spec ref: spec.md > Microphone Capture and Take Protection
  Build: VoiceRecordingMode, VoiceScene, voiceRecorder helpers and take replacement/staleness guards.
  Verify (mechanical): Recorded browser checks kept neighboring takes unchanged; regression tests block changed/missing takes and preserve original source data on cancelled export.
  Learner check: Record two scenes, cancel a replacement and change a script line; verify the old audio survives and stale export is refused.
  Commit: Protect per-scene microphone takes (suggested historical message; exact per-slice checkpoint not verified)

- [x] **11. Browser-local session persistence**
  Becomes usable: IndexedDB saves clip, brief, script, pending story, answers and takes. Save status and leave warnings; serialized writes; restoration without regeneration.
  Why now: Preserves work between visits to the same browser origin.
  PRD ref: prd.md > Saving and Recovery
  Spec ref: spec.md > Data Model and Persistence
  Build: lib/sessionStore.ts and page restoration, serialized writes, save indicators and beforeunload handling.
  Verify (mechanical): Earlier browser restoration checks are recorded; current StoredSession includes brief, pending analysis, answers and takes. Final real-session restoration is still open.
  Learner check: Wait for saved status, reload the same port and check that your clip, answers, script and takes return.
  Commit: Save the current recording, story and takes locally (suggested historical message; exact per-slice checkpoint not verified)

- [x] **12. Aligned narration WAV**
  Becomes usable: Decode and resample to mono 48 kHz; absolute scene offsets; silent gaps/tail; require every current spoken take; refuse overflow/overlap without cropping.
  Why now: Establishes the sound timeline used by every finished video.
  PRD ref: prd.md > Finished Video and Separate Files
  Spec ref: spec.md > Audio Alignment and Combined Export
  Build: lib/narration.ts; decoded/resampled mono audio, absolute offsets, silence and PCM WAV encoding.
  Verify (mechanical): Regression tests cover exact offsets, gap/tail silence, WAV format, stale/missing audio, overflow, overlap and audio-context cleanup.
  Learner check: Build the separate narration WAV and listen with the clip; later scenes should start at their original timestamps.
  Commit: Align narration takes without trimming or shifting them (suggested historical message; exact per-slice checkpoint not verified)

- [x] **13. Video download with sound**
  Becomes usable: Browser-side Mediabunny combines footage and narration; prefers MP4/AVC/AAC with supported WebM fallback; removes original source audio; validates both tracks; progress, cancel and invalidation; separate files are secondary.
  Why now: Fixes the reported silent download at the artifact users actually receive.
  PRD ref: prd.md > Finished Video and Separate Files
  Spec ref: spec.md > Audio Alignment and Combined Export
  Build: lib/videoExport.ts, NarrationExport, Mediabunny, codec fallback, track checks, progress/cancel and export invalidation.
  Verify (mechanical): Synthetic export checks decoded voice tones at scene offsets with silent gaps; the Azure acceptance download parsed as 16 seconds, AVC video and one AAC audio track.
  Learner check: Create and download the combined video, then play it outside the app to confirm sound and alignment.
  Commit: Export one video with aligned narration included (suggested historical message; exact per-slice checkpoint not verified)

- [x] **14. Azure automatic narration**
  Becomes usable: Server-only key/region; Jenny, Guy and Sonia; generate only empty scenes; skip existing takes; measure WAV duration and adjust speaking rate within bounds; cancel preserves completed takes; safe errors and basic process-local allowance.
  Why now: Adds hosted read-aloud audio while retaining the creator's recordings.
  PRD ref: prd.md > Automatic Narration
  Spec ref: spec.md > Azure Speech; spec.md > API Routes
  Build: /api/speech, lib/azureSpeech.ts, AutomaticNarration and source-aware take downloads.
  Verify (mechanical): Live Azure returned 9.8625 seconds of WAV for a 10-second scene; browser generation kept an existing voice take and skipped a silent shot. Regression tests cover XML escaping, actual duration, pace fitting and safe errors.
  Learner check: Generate missing narration, review pronunciation, stop a batch if desired, then continue without replacing completed takes.
  Commit: Add Azure narration with duration and take protection (suggested historical message; exact per-slice checkpoint not verified)

- [x] **15. Current documentation synchronized**
  Becomes usable: Scope, PRD, spec, checklist, learner notes and README updated on 26 October 2026. Historical decisions retained without presenting removed features as current.
  Why now: Makes the current app resumable without reviving removed features.
  PRD ref: prd.md > Acceptance Still Required; prd.md > Product Decisions and Non-Goals
  Spec ref: spec.md > Verification; spec.md > Runtime, Configuration and Deployment
  Build: Current scope, PRD, spec, checklist, README and ignored learner profile; retain the earlier build history as an archive.
  Verify (mechanical): Local document links and whitespace checks passed during the sync; this update additionally validates the 5-build field contract and real heading references.
  Learner check: Read the current journey and remaining checklist items; point out any mismatch with the app you are using.
  Commit: Synchronize current project docs and 5-build progress (current documentation checkpoint)

- [ ] **16. Visitors can try the real Launchpad sample**
  Becomes usable: A real 91-second recording opens in a separate sample tab with eight prepared scenes, project answers and voice takes. Visitors can rehearse and export it without waiting for analysis or risking their saved project.
  Why now: The learner explicitly requested a built-in visitor example and supplied the Launchpad recording, revising the earlier sample exclusion.
  PRD ref: prd.md > Built-in Launchpad Example
  Spec ref: spec.md > Built-in Sample; spec.md > Data Model and Persistence
  Build: lib/sampleDemo.ts, lib/loadSampleDemo.ts, sample-query initialization in app/page.tsx, sample links, public/sample media and defensive sessionStore guards. Prepare narration once with the authoring script.
  Verify (mechanical): Check every bundled passage/voice duration and script match; ensure sample persistence cannot touch saved work; run regression tests, type checking and production build; exercise sample loading, playback/export and saved-session isolation in the browser.
  Learner check: Select Try a sample demo, read the Launchpad scenes, play a take in Record mode and create the finished video. Return to your own project and confirm it is unchanged.
  Commit: Add an isolated Launchpad sample with prepared narration

## Recorded Verification

Latest implementation verification, 26 October 2026:

- [x] npm test: **39 passing regression tests**, including bundled narration and sample-session isolation.
- [x] TypeScript validation passed in the final production build.
- [x] npm run build -- --webpack passed after the temporary acceptance route was removed.
- [x] Final localhost:3001 app returned HTTP 200; the temporary /voice-check page returned 404.
- [x] Synthetic live story checks produced duration-fitting passages for 15-, 30-, 20- and 35-second scenes; sparse context prompted a focused question; supplied answers resumed writing without video.
- [x] Azure live connection used a synthetic script and returned a **9.8625-second WAV for a 10-second scene**, taking about two seconds on this machine.
- [x] Browser acceptance generated the empty scene, preserved an existing voice-source take, skipped a silent scene, and offered the combined download.
- [x] Downloaded acceptance MP4 parsed as **16 seconds, AVC video, one AAC audio track**.
- [x] Narration tests cover SSML escaping, WAV duration/corruption, pace adjustment, refusal to crop an overlong voice and safe authentication errors.
- [x] Export/timeline regression tests cover fixed timestamps, deleted gaps, stale/missing takes, overflow, overlap and cancellation before touching sources.
- [x] Narration endpoint rejected invalid scene/voice input and an explicit foreign origin.
- [x] Launchpad sample opened separately with all eight prepared takes; voice playback and combined MP4 creation succeeded in the browser. The final preview had sound enabled and was approximately 91 seconds long.
- [x] Sample storage regression confirmed load/save/clear never touch IndexedDB in preview mode. Bundled WAV lengths and exact prepared text match the scene manifest; the full mix fits browser playback duration.

Prior synthetic browser export checks also decoded audible tones at the expected offsets, confirmed silent gaps and source-audio removal, and exercised active export cancellation. These checks used generated fixtures, not the learner's personal footage.

scripts/narration-browser.cjs has updated UI wording but was not rerun in full for the Azure change. Automated checks do not replace a real microphone, real narration review or all-browser testing.

## Hands-on Checkpoints

- [x] Early usable behavior explored; learner feedback drove recording-only input, professional storytelling, descriptive duration use and export improvements.
- [ ] Final kick-the-tires exploration and feedback completed — use the checks below and record the learner response.
- [ ] Run the final version with the learner's own current recording and real project answers.
- [ ] Review every scene for supported claims, continuous flow and accurate correspondence with the footage.
- [ ] Review generated narration and/or a real microphone take for natural pace, pronunciation and alignment.
- [ ] Download the final video and play it in a normal player, ideally on a second device; confirm sound and final scene timing.
- [ ] Confirm local restoration of this real session and the intended take-replacement workflow.
- [ ] Resolve any remaining feedback and record the learner's explicit ready-to-ship confirmation.

The learner expressed satisfaction with the script direction before the silent-video issue and Azure addition. That is recorded feedback, not final acceptance of the finished export path.

## Final Review

- [ ] Review and checkpoint the currently uncommitted app changes before declaring 5-build complete. The current progress update checkpoints only project documentation; it does not include or retrospectively commit the app implementation.
- [ ] Final review complete — feedback resolved and learner confirms ready to ship.

Known limitations to review: browser codec/device differences; AI factual/story quality; browser-local storage; provider quotas/latency; process-local Azure allowance; deployment body-size and request-duration limits.

## Code Tour and App Map

These remain unfinished learning activities; updating the documents does not complete them.

- [ ] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap.
- [ ] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate.
- [ ] devpost/app-map.html generated from finished code, checked and shown, including a project-grounded practice to reuse.

- Activity and evidence: pending.
- Route and stops: pending.
- Edit outcome: pending.
- Reflection: pending.
- Activity mode: pending.

Suggested project-grounded route: app/page.tsx → project interview → video/context/story routes → fixed scene budgets → per-scene takes → narration/video export → IndexedDB. The learner should distinguish human product choices from generation, validation and browser/media constraints.

## Submission and Deployment

- [ ] Public repository and intended source files verified.
- [ ] Credentials excluded from the public repository; deployment environment configured separately if deploying.
- [ ] Demo video recorded and accessible through the submission's required format/link.
- [ ] Learner writes and completes the actual Devpost fields and required survey.
- [ ] If publicly deploying: verify hosting upload/time limits, HTTPS/browser media behavior and persistent shared usage limits/access controls.

No public deployment, repository link or completed submission is asserted by this checklist. The current local preview is localhost:3001. Azure resource setup and a successful API test do not mean the website is deployed.

## Superseded Plans

The original whole-clip overdub slice, screenshots, frame capture, cached samples, tone selector, separate target-duration control, Gemini/Kokoro/OpenRouter TTS, separate-files-only export and intentionally memory-only takes are historical. They are not unfinished requirements for this build.

No new feature expansion is required merely to finish the current proof of concept. Real acceptance, learning wrap-up and packaging take priority.


## Revisions

- Restored the 5-build checklist contract after the documentation sync condensed slices into summaries: each slice now has Becomes usable, Why now, PRD ref, Spec ref, Build, Verify (mechanical), Learner check and Commit. No product behavior or build mode changed.
- Preserved retrospective implementation evidence without asserting that earlier work followed 5-build or had a separate commit for every slice. The reusable skill itself was not edited.
- Resumed at final verification and learner review. All 36 regression tests and TypeScript checks passed again, and the running app returned HTTP 200 on port 3001. No paid-service requests were needed for this progress update.
- Retained incomplete learner acceptance, source-checkpoint review and learning activities as open work. Prior satisfaction with script direction does not certify the later Azure/export path.
- Added the learner-supplied Launchpad recording as one ready-made visitor example after an explicit request. It opens as a non-persistent sample session, with prepared words and voices rather than new AI calls, and does not revive screenshot input or a project library.
- The sample export check revealed MP4 track offsets made its reported end differ from browser playback. The sample uses the measured browser duration and a newly fitted final voice; the successful browser export and regression mix check cover that boundary.
