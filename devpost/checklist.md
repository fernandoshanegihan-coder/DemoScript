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


  Becomes usable: The button calls Gemini. Each screenshot is read and returns a description plus a confidence flag; a low-confidence image asks "not clear — what does it show?" instead of inventing. One generation call returns the parsed criteria and the scenes. The storyboard fills with spoken lines, captions, timer chips, and a clock; criteria go red or green; the script copies to the clipboard as plain text.
  Why now: This is the kernel and the only external dependency, proven together — with the shell and inputs already good enough to land the output in. Start by verifying the model, so a quota surprise arrives before any UI is built on top of it.
  PRD ref: `prd.md > Making the script`, `prd.md > The criteria panel`, `prd.md > Copying the script`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > External Services and Dependencies`, `spec.md > Components` (`Storyboard`, `SceneCard`, `CriteriaPanel`), `spec.md > Data Model`, `spec.md > Important Failure Modes`
  Build: Scratch call to confirm the model ID and free-tier limits, recorded in the checklist; `lib/gemini.ts` and `lib/prompts.ts` with the response schemas; `app/api/analyze/route.ts` (one call per image, concurrency 2–3) and `app/api/script/route.ts` (criteria + scenes); wire the button with in-place progress; render real scenes; compute `seconds` in `lib/timing.ts`; criteria panel red/green with plain explanations for reds; copy to clipboard; plain error states for rate limit and malformed JSON with one retry.
  Verify (mechanical): The scratch call returns a valid structured response and the model ID is recorded; a generation from three sample screenshots returns three or more scenes and at least one parsed criterion; every scene has a non-zero duration and the clock total matches the sum; a deliberately blurred image produces the "not clear" path rather than an invented description; disabling the key produces the plain error state with inputs intact; clipboard content contains scenes in order with captions.
  Learner check: Run a script from two or three of your real project screenshots. Does the spoken text sound like something you'd actually say out loud — and did any red criterion surprise you?
  Commit: `Generate script and criteria from real screenshots`

- [ ] **3. Real screenshots become a script with a red criterion**
  Becomes usable: The button calls Gemini. Each screenshot is read and returns a description plus a confidence flag; a low-confidence image asks "not clear — what does it show?" instead of inventing. One generation call returns the parsed criteria and the scenes. The storyboard fills with spoken lines, captions, timer chips, and a clock; criteria go red or green; the script copies to the clipboard as plain text.
  Why now: This is the kernel and the only external dependency, proven together — with the shell and inputs already good enough to land the output in. Start by verifying the model, so a quota surprise arrives before any UI is built on top of it.
  PRD ref: `prd.md > Making the script`, `prd.md > The criteria panel`, `prd.md > Copying the script`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > External Services and Dependencies`, `spec.md > Components` (`Storyboard`, `SceneCard`, `CriteriaPanel`), `spec.md > Data Model`, `spec.md > Important Failure Modes`
  Build: Scratch call to confirm the model ID and free-tier limits, recorded in the checklist; `lib/gemini.ts` and `lib/prompts.ts` with the response schemas; `app/api/analyze/route.ts` (one call per image, concurrency 2–3) and `app/api/script/route.ts` (criteria + scenes); wire the button with in-place progress; render real scenes; compute `seconds` in `lib/timing.ts`; criteria panel red/green with plain explanations for reds; copy to clipboard; plain error states for rate limit and malformed JSON with one retry.
  Verify (mechanical): The scratch call returns a valid structured response and the model ID is recorded; a generation from three sample screenshots returns three or more scenes and at least one parsed criterion; every scene has a non-zero duration and the clock total matches the sum; a deliberately blurred image produces the "not clear" path rather than an invented description; disabling the key produces the plain error state with inputs intact; clipboard content contains scenes in order with captions.
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

## Hands-on Checkpoints

- [ ] Early usable behavior explored — after slice 2 (the look, the empty state, and the input column)
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
