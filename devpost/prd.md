---
doc: prd
status: approved
updated: 2026-10-26
---

# DemoScript — Product Requirements

A web app for turning a working project's screen recording into a professional, descriptive demonstration with a connected story and narration aligned to the footage.

Source: [scope.md](scope.md). This document describes the current implementation. Verification status and unfinished acceptance checks live in [checklist.md](checklist.md).

## The Core Journey

1. Arrive on one page with the input column and an empty storyboard.
   **Try a sample demo** opens the prepared Launchpad example in a separate tab; it does not replace the visitor's current work.
2. Upload or record a clip of up to three minutes.
3. Choose the demo type and I/We.
4. Answer the first three project questions; optionally provide difference, takeaway and a rubric.
5. Select **Make my script** and see processing stages.
6. Answer scene-specific follow-ups when needed; continue without uploading the recording again.
7. Review a continuous spoken story fitted to the footage.
8. Edit or rewrite one scene, or use **Expand explanations**.
9. Rehearse while the video clock highlights the matching scene.
10. Record voice takes or generate narration for empty scenes.
11. Review the takes, create the combined video and download it with sound included.

## Screens and Layout

One main page with no signup or settings page. The header names DemoScript and the selected audience preset. Inputs occupy the left column; the storyboard, follow-up questions, rehearsal or recording controls occupy the right.

Inputs include a recording picker/capture controls, four presets, I/We, the project interview and optional rubric. The **Make my script** button explains missing prerequisites. There is no independent target-duration selector.

The output includes the video player, scene timestamps, narration, captions, visual observations, word-count guidance and optional criterion mappings. Script, Rehearse and Record modes become available after a script exists. The empty state offers **Try a sample demo** plus the existing recording picker. A **Sample demo** header link also makes the example accessible when work already exists.

The visual direction stays light and calm: warm off-white, restrained accent, hairline borders, clear reading typography and meaningful warning/status colors.

## Features and Behavior

### Built-in Launchpad Example

- The supplied Launchpad recording (90.6123 seconds of browser playback) is bundled with project answers, eight timestamped descriptive passages and eight prepared Azure voice takes.
- The sample opens at /?sample=launchpad in a separate tab. It never restores, saves over or clears the visitor's IndexedDB project.
- A visible banner labels the example as prepared and explains that edits reset on reload. **Open your own project** opens the normal saved-work route separately.
- Loading uses static media and prepared text, without Gemini analysis or Azure generation requests. Explicit regeneration/rewrites remain normal service calls.
- Visitors can edit, rehearse, play the takes and export the combined video. Prepared takes are validated against script text and scene lengths.
- A sample loading failure leaves saved work unchanged. The app must not silently substitute a different clip or an ungrounded script.

### Recording and Uploading

- Screen capture records picture only, with Pause, Resume and Stop. Paused time is excluded.
- Capture stops at three minutes of recorded footage. Floating controls are offered when supported; in-page controls remain the fallback.
- Upload accepts supported video formats, including WebM, MP4 and MOV when readable by the browser.
- Both upload and capture are limited to three minutes; uploads are also limited to 250 MiB.
- Browser inspection checks duration/readability and obtains a poster. A bad replacement leaves the existing clip intact.
- Replacing or removing work that contains takes requires the existing take-protection confirmation. Recording, writing, narration generation and export must finish or be cancelled before conflicting actions.
- Original source audio is not the final soundtrack. Screen capture is silent, previews are muted where appropriate, and combined export replaces original audio with narration.

### Project Context and Audience

- Hackathon is the default preset; University project, Client pitch and Portfolio are alternatives.
- I/We controls the presenter's pronoun. Presets have default narrator choices.
- Required interview answers: who has the problem, what was built/how it helps, and the key moments to highlight.
- Optional answers: what makes the work different and what the audience should remember.
- The optional rubric accepts free text. No rubric is required for script generation.
- Changing context does not silently rewrite an existing script. Explicit generation, expansion or rewrite uses the current choices.

### Analysis, Follow-ups and Writing

- The first analysis uploads the recording to Gemini and reads the actual footage. Processing stages remain visible.
- Scene descriptions and timestamps remain tied to the observed interval. The app does not evenly redistribute scenes to repair bad timings.
- Identical scene starts may be merged while keeping their evidence together. Invalid timings receive one automatic correction attempt against the same footage; a further failure keeps the clip and reports the problem.
- Before writing, the app checks whether the observations and project answers support a developed explanation.
- Missing facts produce up to three focused questions tied to real scenes. Questions should address purpose, user task, interpretation or authorship, rather than inventing the missing context.
- The app retains pending observations and answers so continuation and writing retries are text-only.
- Writing should form one presentation: audience difficulty, product promise, relevant example, meaning of the evidence and final payoff.
- Narration explains what happens, why it matters and how to interpret it. It should not read interface labels or compress long scenes into summaries.
- Claims must be supported by footage or creator context. Present-tense actions must remain in the scene that shows them. A visible third-party app is not proof of authorship.
- Generated scenes of at least three seconds use floor(seconds × 1.8) to floor(seconds × 2.4) words, aiming at floor(seconds × 2.1). A 30-second scene therefore has 54–72 words, targeting 63.
- Shots shorter than three seconds have no narration. The closing payoff belongs in the last narratable scene.
- Whole-story writing uses bounded word arrays internally and joins them into normal prose. Accepted passages remain locked while rejected passages receive bounded repair attempts.
- Failure must not turn a short summary into an apparently finished script. Cached analysis remains available for retry.

### Reviewing and Fixing Scenes

- Each scene has an editable spoken passage and caption, a rewrite note, a timestamp and an on-screen observation.
- Editing the spoken text preserves its existing take but marks it outdated for export.
- A single-scene rewrite receives neighboring lines, visual evidence, project answers and the fixed word budget. It replaces only that scene after a valid response.
- **Expand explanations** uses cached scene evidence and the same follow-up/writing pipeline. It does not re-upload the footage or change its boundaries.
- If text changes while an expansion is pending, the app keeps the new edits rather than replacing them with an old response.
- Deleting a scene removes its take and coverage contribution. It does not cut the video or shift later narration.
- Copy script includes timestamps, spoken text, captions and visual descriptions.

### Rubric Coverage, Cut Advice and Running Time

- The criteria panel appears when generated criteria exist. Uncovered criteria are red; mapped criteria are green.
- Coverage reflects the current scene-to-criterion mappings. Typing a claim alone does not establish visual proof or automatically perform a new evidence analysis.
- Cut flags identify long scenes with no mapped criterion. They are advisory, not automatic deletion or a score.
- Running time follows the clip. A recognizable time limit in the rubric is displayed for comparison, with an overrun warning when appropriate.
- Deleting a script scene leaves a gap in narration; it does not shorten the recording or automatically resolve a rubric time overrun.

### Rehearsal

- Rehearsal uses the actual video's clock and scene intervals.
- Start, pause/resume and stop are available. Seeking and deleted gaps must not shift scene highlighting.
- It does not request a microphone or record a take.

### Recording Your Voice

- Each spoken scene offers Record/Re-record, Play, Delete and Download take.
- Optional 3-2-1 countdown defaults on. A timer and microphone level meter appear during recording.
- Stop and keep replaces only that scene after successful capture. Cancel or microphone failure keeps the previous take.
- Takes show duration and WPM; WPM outside 110–180 is flagged.
- A take beyond its scene duration is Too long; under half the target is Too short. Warnings do not crop the recording.
- Silent transitions need no take.
- Existing takes are saved locally with the script text they were recorded against.

### Automatic Narration

- Azure Speech is the current provider. Jenny (US English), Guy (US English) and Sonia (British English) are offered.
- **Generate missing narration** works sequentially on empty spoken scenes only. It skips every existing take, including outdated ones.
- To regenerate an existing scene, the user can download/delete that take first. They may instead re-record it themselves.
- The UI states that script text is sent to Microsoft Azure. The secret key stays on the server.
- The returned WAV duration is measured. Synthesis can adjust speaking speed between 0.75× and 1.35×, with at most three attempts, targeting room for natural pauses.
- Speech that still exceeds the slot is refused rather than cropped. The user can shorten the passage or record their own voice.
- Stop cancels the current request and retains completed scene voices for continuation.
- Late responses cannot replace an existing take or attach to a changed scene.
- Busy generation blocks conflicting recording, export and mode changes.
- Missing credentials, rejected credentials, quota limits and network failures produce useful messages without exposing provider diagnostics.
- Basic server-process usage limits exist; they are not a persistent public-account quota.

### Finished Video and Separate Files

- **Create video with narration** first builds the aligned voice track, then combines picture and sound in the browser.
- Every spoken scene needs a current, readable take that fits its slot. Missing, outdated, overlapping or overlong takes block export.
- Audio starts at each scene's absolute video timestamp. Deleted scenes, silent transitions and unused tail time stay silent.
- The narration mix is mono 48 kHz PCM WAV.
- Combined export prefers MP4 with AVC/H.264 and AAC, falling back to supported WebM codecs when needed.
- The source recording's audio is discarded and replaced with narration.
- Progress and cancellation are available. Cancelling preserves the clip and takes.
- The finished file must contain both video and audio tracks before its download is offered. It has an audible video preview.
- **Separate files** offers aligned narration WAV and the original recording, clearly labeled as without narration.
- Changing scenes, takes or clip invalidates the combined export. Reloading restores source material; the combined export can be built again.

### Saving and Recovery

- IndexedDB stores the single current session: clip, scenes, criteria, rubric, preset, narrator, brief, takes, follow-up answers and pending story.
- Save status is shown. A save failure or unfinished media operation warns before leaving.
- Local saving depends on browser storage. Clearing site data removes it; private browsing or storage restrictions can affect reliability.
- Browser origins are separate: localhost:3000 and localhost:3001 do not share the same saved session.
- There is no cloud backup or project history.

## Product Decisions and Non-Goals

The current workflow prioritizes story quality and footage alignment, supported by optional rubric review. It does not generate new footage, trim or reorder video, clone voices, add music, burn in captions or maintain accounts.

Earlier requirements for screenshots, a target-length stepper, Gemini/Kokoro/OpenRouter voices, separate-files-only delivery, overlapping audio and intentionally temporary takes are superseded. The learner explicitly added back one real recording example for visitors; this does not restore the old screenshot sample flow or a project library.

## Acceptance Still Required

Automated and synthetic checks are recorded in the checklist. The learner confirmed the final video review with "all done" and no further fix request. This records their acceptance, without claiming the agent observed every device or recovery branch. Deployment, public repository, accessible demo-video links and submission materials are not assumed complete.
