---
doc: prd
status: approved
---

# DemoScript — Product Requirements

A light, calm web app that turns a pile of project screenshots plus an optional hackathon rubric into a demo script with captions — and tells you which criteria your demo does not yet prove.

Source: `scope.md > The Unique Kernel`, `The Core Loop`, `What "Working" Looks Like`, `The POC Boundary`.

## The Core Journey

1. **Arrive.** One page, no signup, no navigation. A small wordmark, one line under it: "Turn your screenshots into a demo script." Two columns: inputs left, output right.
2. **Understand the promise before doing anything.** The right column is not blank — it shows a ghosted storyboard: three empty scene cards and a clock reading `0:00 / 2:00`. Over it, one sentence: "Your script will appear here, scene by scene, with a checklist showing what each scene proves." No criteria circles yet — those appear only once a rubric exists.
3. **Optional shortcut.** "Try it with a sample project" fills both columns with a cached example in one click. This is where the demo video starts.
4. **Give it material.** Drop in screenshots, or capture a one-page project frame by frame — or, for the richer path, press **Record** and click through the project for up to three minutes. Each screenshot becomes a numbered, draggable thumbnail with a note field — "what do you do here?" — and a "+ add another action" link, so a one-page app can still produce several scenes.
5. **Paste a rubric, or don't.** The rubric box is optional and free text. A link fills in the course's own criteria as an example.
6. **Choose tone and length.** Professional / Energetic / Storytelling, and a length from 1 to 3 minutes defaulting to 2.
7. **Press "Make my script."** Scenes appear on the right: a spoken line, a caption, the thumbnail, and the description the app based the scene on. With a recording, every scene also has a moment in the footage.
8. **Fix what's wrong.** Editing a scene's description or line updates the scene and the criteria panel.
9. **Read the criteria panel.** Criteria covered by the current script are green; uncovered ones are red. Red is a to-do list.
10. **Cut.** Scenes that eat time and prove nothing are flagged as cut candidates.
11. **Rehearse it, if there's footage.** The recording plays beside the script, each scene jumping to its moment, and Rehearse runs the clock while highlighting the scene being read.
12. **Say it.** Add voice plays the clip from the start and records the user's own voice over it, handing back one video file. Or just copy the script.

Success: at least one criterion goes from red to green because the user added or reworded a scene, and the script reads like something a person would say out loud.

## Screens and Layout

One surface. No routing, no modals, no settings page.

**Top left:** small wordmark — DemoScript. Nothing else. No nav, no login, no pricing. One line under it: "Turn your screenshots into a demo script."

**Two columns, roughly 45/55.** Left is where things go in; right is where things appear.

**Left column, top to bottom:**

- **Upload area** — near-full column width, dashed border. "Drop screenshots here, in the order you'd show them." Below, smaller: "One screenshot is fine too. Add a note for each thing you'd do on it." Three buttons underneath: "Choose screenshots" (file picker), "Capture screenshots" (share your own screen and grab frames), and "Record screen" (up to three minutes of footage). A faint illustration of three stacked rectangles. In one corner, quiet small text: "Don't include passwords or personal data."
- **Recording strip** — once a recording exists, the buttons give way to a compact strip: a poster frame, the length (`1:42 of 3:00`), a play/pause control, "Replace recording", and "Remove". It sits where the thumbnails would, because a recording replaces them as the source of scenes.
- **Thumbnail row** — once screenshots land, the dashed area becomes numbered, draggable thumbnails. Each has a note field ("what do you do here?") and a "+ add another action" link that creates an additional action on the same screenshot.
- **Rubric box** — labelled as a question, not a form field: "What will your video be judged on?" Tall text area with grey placeholder examples ("Design, Innovation, Presentation" / "Technical depth 40%, Documentation 20%, Demo 20%"). Under it, a small link: "Use the Build With AI: Basics criteria," which fills it in.
- **Controls row** — tone segmented control (Professional / Energetic / Storytelling) and a length slider or stepper, 1–3 minutes, default 2.
- **"Make my script"** — one button, bottom of the column. Disabled until at least one screenshot is present; while disabled, a small line underneath says what's missing: "Add a screenshot to start."

**Right column:**

- **Empty state** — a ghosted skeleton storyboard at near-watermark contrast: three empty scene cards, each with a grey thumbnail box on the left, grey text bars on the right, and a timer chip reading `0:00`. Across the top, a thin clock bar labelled `0:00 / 2:00`. Centered over the skeleton, at normal contrast: "Your script will appear here, scene by scene, with a checklist showing what each scene proves." Below it, a quiet text link: "Try it with a sample project." The criteria circle column is **not** part of this state — it appears only after a rubric is pasted, so the app never shows labels the user didn't give it.
- **Filled state** — the clock bar tracks the script against the chosen length (`2:41 / 3:00`), scene cards stack in order with thumbnail, spoken line, caption, and per-scene description, and the criteria circles fill from red to green.
- **Recording state** — the clip plays at the top of the column with a thin timeline marked at each scene. Clicking a scene seeks the video to that moment and highlights it. A quiet strip above the script offers Script · Rehearse · Record; Rehearse takes over the column with the clock and the highlighted scene.
- **Voice pass state** — with a take, a panel offers "Add voice", a 3-2-1 countdown, a progress line while the clip plays, then a preview, a download link, and "Try the voice again". The take is never replaced by a failed pass.

The right column's empty state is not decoration. It is the whole product drawn in grey: clock, cards, criteria. Someone who saw only that screen would understand what the app does.

## Look and Feel

- **Light, warm off-white.** Not clinical white, not dark mode. The learner's words: "a quiet desk, not a dashboard."
- **Calm, low-chrome.** No shadows-as-decoration, no gradients, no dashboard cards with heavy borders. The surface should feel like a page, because the product is words you read aloud.
- **Hackathon-appropriate but not loud.** Light colors, restrained accent. Red and green appear only where they carry meaning — criteria coverage and warnings.
- **Small typography, generous spacing.** One wordmark, one line of positioning, then content. No feature badges.
- **The script is the visual hero.** Spoken lines should be set for reading at a glance: comfortable size, generous line height, scannable scene boundaries. A person should be able to glance at it mid-recording and find their place.
- **Skeleton as promise.** The empty state uses contrast deliberately: watermark-level for the ghosted structure, normal contrast for the one explanatory sentence.

## Features and Behavior

### Uploading and arranging screenshots

- Accepts several screenshots at once, and a single one.
- Each screenshot becomes a numbered thumbnail. Numbering follows the order they'd be shown, and drag reorders.
- Order the learner set is the default scene order; the script follows it.
- Each screenshot has a note field ("what do you do here?"). Notes are the strongest signal for the script's content — a human note outranks what the app can see in the image.
- "+ add another action" attaches an extra action to the same screenshot, so one long page can yield several scenes.
- The upload area states plainly not to include passwords or personal data.

- [ ] Dropping two screenshots produces two numbered thumbnails in drop order.
- [ ] Dragging the second thumbnail before the first changes the scene order in the generated script.
- [ ] Adding a second action to one screenshot produces two scenes from that one image.

### Capturing frames from your own screen

For projects that only have one page, a single screenshot can't show "before the filter" and "after the filter." Capture makes those states into separate frames.

- "Capture screenshots" sits beside "Choose screenshots" in the upload area.
- Pressing it asks the browser to share a screen or window. Once sharing starts, a small always-on-top bar appears with one "Capture frame" button, so the user never has to switch tabs between frames. The bar shows how many of the 6 remain.
- Where the browser can't float a window, the same bar appears inside the upload area instead, and everything still works.
- "Capture frame" grabs the current frame and adds it as the next numbered thumbnail, with an empty note field, exactly like a dropped file.
- The share stays open so several frames can come from the same page. "Stop sharing" ends it and returns the buttons.
- Every frame follows the 6-screenshot cap.
- If sharing is refused or unsupported, the app says so plainly and points at "Choose screenshots" — it never fails silently.
- Nothing is recorded: no video, no audio, no frames saved anywhere except the thumbnail list in memory.

- [ ] Sharing a window and pressing "Capture frame" twice produces two thumbnails in order.
- [ ] "Stop sharing" ends the share and returns the two buttons.
- [ ] Refusing the browser's share prompt shows a plain message and leaves the app usable.

### Recording your screen

- One button starts a screen recording. It stops when you press **Stop recording**, or on its own at 3:00.
- The clip stays in this browser tab, so a reload doesn't lose it. Nothing is uploaded anywhere except the one model call.
- Picture only — the first pass has no microphone. Your voice is added afterwards, over the clip, so a fumbled sentence never costs a retake of the screen.
- While recording, the button area shows the elapsed time and a stop control. The rest of the page stays usable; generation waits for the recording to end.
- One recording at a time. Recording again replaces the previous clip after a confirm.

- [ ] Recording stops on its own at 3:00 and the clip is saved to the tab.
- [ ] A reload returns the clip and its script without calling the model again.

### Playing the recording

- The clip is silent and plays beside the script. Each scene shows the moment it starts, and clicking the scene seeks there.
- A thin timeline under the player marks the scenes, so the shape of the demo is visible before pressing play.

- [ ] Clicking scene 3 seeks the video to scene 3's moment.
- [ ] The clip itself never carries sound; the only sound is the voice pass.

### Rehearsing it

- A quiet strip above the storyboard offers **Rehearse** and **Record** once a script exists. The page stays one page; the strip changes what the right column is doing.
- Rehearsal runs the clock from zero. The scene being read is highlighted and the rest stay legible; the highlight moves on when the scene's estimated seconds are up.
- Pause and stop are always available. Stopping early says where the read ended against the chosen length — "you stopped at 1:12 of 2:00" — without scolding.
- No camera, no microphone, nothing stored. It is a timer with eyes.

- [ ] Pressing Rehearse highlights scene one and moves to scene two after scene one's estimated time.
- [ ] Stopping at any point reports how far the read got against the chosen length.

### Recording your voice over it

- With a clip, **Add voice** counts 3-2-1, plays the clip from the start, and records the microphone over it. The result is one `.webm`: picture from the clip, sound from the user.
- One voice pass at a time. If it goes wrong, "Try the voice again" replaces it; the silent clip is still there.
- The pass runs in real time and needs the tab in front. If the tab is hidden, the pass stops and says so rather than recording a frozen picture; if the microphone is refused, the silent clip stays and the panel says what to allow.
- The finished file is previewed and downloadable. No editor, no trimming, no music.

- [ ] A voice pass produces a single playable file with both picture and sound.
- [ ] Refusing the microphone leaves the silent clip intact and explains what to allow.
- [ ] A second voice pass replaces the first without touching the clip.

### The rubric (optional)

- Free text, no required format. Percentages, comma lists, and pasted prose all go in one box.
- Parsed into a short list of criteria for the checklist panel.
- "Use the Build With AI: Basics criteria" fills the box with the course's criteria.
- Absent rubric: the app generates the script and the scene list exactly as normal, and the criteria panel does not appear. Nothing nags the user to add one.

- [ ] With a rubric, the checklist lists one entry per pasted criterion.
- [ ] With an empty rubric box, "Make my script" still runs and no criteria panel appears anywhere.

### Tone and length

- Tone: Professional / Energetic / Storytelling. **Professional starts selected**, so the button never blocks on a choice the user hasn't thought about yet; switching is one click.
- Length: 1–3 minutes, default 2. The user's chosen length is authoritative and drives the clock.
- If the rubric states a required demo time and it differs from the chosen length, the app says so in plain words and leaves the user's choice in place. It does not silently override it.

- [ ] Setting length to 2:00 and generating shows a clock whose denominator is 2:00.
- [ ] Pasting a rubric that says "3 minute demo" while the length is 2:00 produces a visible mismatch notice.
- [ ] Changing the length does not silently rewrite the user's number.

### Making the script

- One button, "Make my script," guarded only by the presence of at least one screenshot.
- Generation produces a scene list: each scene has a spoken line, a caption, a thumbnail reference, and the app's description of what it saw in that screenshot.
- Spoken lines are written to be said out loud — first person, short sentences, no "in this demo we will," no product-launch register.
- Captions are shorter than spoken lines and stand alone without audio.
- While generating, the right column shows progress in place rather than replacing the layout with a spinner.

- [ ] Pressing the button with one screenshot and no rubric produces a multi-scene script.
- [ ] Each scene's spoken line is speakable in roughly its share of the clock.
- [ ] No scene's script line contains filler like "In this demo, I will show you."

### Reviewing and fixing scenes

The confirm step happens **after** the button, not before — the learner's decision.

- Every scene displays the description the app based it on, in plain words ("I see a login form with email and password fields and a green Sign in button").
- That description is editable. Correcting it re-derives the spoken line and caption for that scene.
- The spoken line and caption are editable too.
- A scene can be removed.
- When the app could not read a screenshot, the scene says so plainly and asks for a note instead of inventing content.

- [ ] Editing a scene's description and confirming changes that scene's spoken line without touching other scenes.
- [ ] Deleting a scene removes its contribution from the clock and the criteria panel.

### The criteria panel

- Appears only when a rubric exists.
- One entry per criterion, red (unproven) or green (proven).
- Each scene shows which criteria it covers, so a person can see the mapping rather than trust a score.
- Red entries state what is missing in plain words — the product's core moment.
- The panel is a to-do list, not a grade: no total score, no percentage.

- [ ] A criterion no scene covers is red, and clicking or hovering it explains what no scene proves.
- [ ] Adding a scene that covers a red criterion turns it green without a page reload.

### The cut

- Scenes are flagged when they consume a large share of the clock and demonstrate nothing a criterion asks for.
- A flagged scene states the cost and the reason: "this eats 40 seconds and proves nothing."
- Flags are advisory. The app never deletes a scene on its own.

- [ ] An overlong, criterion-free scene is flagged with its rough time cost.
- [ ] Removing a flagged scene frees the clock and does not turn any green criterion red.

### The clock

- Denominator: the user's chosen length, or the rubric's stated time when the app adopted it.
- Numerator: the estimated spoken time of the current scene list, updated as scenes change.
- Passing the limit is visible immediately, not on submit.

- [ ] The numerator changes when a scene is added, deleted, or rewritten.
- [ ] Going over the limit is visually distinct from being under it.

### The sample project

- One link in the empty state: "Try it with a sample project."
- Fills the left column with a cached set of screenshots and notes and the right column with a finished storyboard, including a red criterion that goes green.
- Runs without calling a model — it is a staged example, and it must feel instant.
- This is the opening beat of the demo video.

- [ ] Clicking the link fills both columns and shows a storyboard within one second.
- [ ] The sample includes at least one red criterion, so the kernel is visible in the example.

### Copying the script

- One action copies the whole script as plain text, scenes in order, with captions included.
- Confirmation is quiet and local ("Copied").

- [ ] The copied text pastes into a plain text editor with scene order intact and captions present.

## States and Boundaries

- **First use** — ghosted skeleton storyboard on the right; left column empty; button disabled with "Add a screenshot to start."
- **Screenshot added, nothing generated** — thumbnails on the left; the right column still shows the skeleton, with the first card quietly showing the first thumbnail.
- **No rubric** — script and scenes work; criteria panel absent; no prompting to add one.
- **Rubric present, nothing covered yet** — criteria all red; the panel explains what is missing rather than scoring zero.
- **Unreadable or non-screenshot image** — the scene says it couldn't read the image and asks for a note; it does not invent a description.
- **Screen sharing blocked or unsupported** — a plain line in the upload area says sharing was refused or isn't available, and points at "Choose screenshots." The rest of the app is unaffected.
- **Floating capture unavailable** (Safari, Firefox, or the window fails to open) — the capture bar appears inside the upload area instead. No error, no lost work.
- **Screen share ends outside the app** (the user clicks the browser's own "Stop sharing") — the capture bar disappears on its own and the buttons return.
- **Empty rubric text after clearing** — panel disappears; existing scenes stay.
- **Time limit mismatch** — the rubric's stated time differs from the chosen length; a plain notice appears and the user's length stands.
- **Over the limit** — the clock and the cut flags show it immediately.
- **Generation failure** — a plain message with a retry, and the user's screenshots and notes stay put.
- **A recording reloads with its script** — the clip and the scenes it produced are kept in this browser tab, so a refresh doesn't destroy three minutes of work. Nothing else is stored: no accounts, no history, no second project.
- **Recording in progress, generation paused** — the button says "Stop the recording first" and the rest of the page stays usable.
- **Rehearsal running** — the clock advances, the current scene is highlighted, and the rest of the page stays put. No permission prompt appears.
- **Rehearsal stopped early** — a plain line says where the read ended against the chosen length.
- **Microphone refused during a voice pass** — the silent clip stays, the panel explains what to allow, and "Add voice" is still there to try again.
- **The tab is hidden during a voice pass** — the pass stops and says so, leaving the silent clip untouched; it never produces a file with frozen picture.
- **Voice pass finished** — a preview, a download, and "Try the voice again" beside them.

## Product Decisions

- **Recording, rehearsal, and a voice pass — but not video generation** — revised after slice 3. The first scope said the app ends where the camera starts; the learner then asked to record inside the app, rehearse against the clock, and add their own voice. The boundary that survives is no editing: one silent screen take, one voice pass, one file. *(Revised; was: script and captions only.)*
- **No signup, no configuration** — if it asks for much, it loses to winging the recording. *(scope)*
- **The kernel is the red criterion and the cut, not the prose** — anyone can get a script from a chatbot; the outside judgment is the product. *(scope)*
- **Rubric is optional, and the button does not require it** — the scope said the script still works with no rubric, but the walkthrough gated the button on a rubric. On being shown the conflict, the learner chose the scope's version: no rubric required.
- **User's length wins, with a mismatch notice** — revised during PRD: the scope said no stated limit meant no clock. The learner's resolution: the user sets the length (1–3 min, default 2), and if the rubric states a different required time, the app names the mismatch without overriding.
- **Confirm step lands after generation, not before** — cheaper to use, and it matches how people judge output. The app shows the description each scene was built from, and that description is editable.
- **Human notes outrank the model's reading of the image** — the learner's own insight: "this took me three days and nobody will notice" produces better lines than a vision description.
- **Screenshots can be captured inside the app, not only dropped in** — the learner's addition: a one-page project's flow only exists across several frames of the same page, so the app shares the user's screen and grabs a frame per state. Frames enter the same thumbnail list as dropped files.
- **The empty right column is a promise, not a blank** — ghosted clock and cards make the product legible before any input. Criteria circles are deliberately excluded from the empty state: they appear only after a rubric is pasted, so the app never displays labels the user didn't give it.
- **A sample project opens the demo** — a one-click example shows the payoff in two seconds and gives the demo video its first beat.
- **The voice is the user's own** — revised while planning the narration slice. A synthetic voice reads cleanly but sounds like a machine reading a list, and judges are listening to the person. The app plays the clip and records the user over it, so the demo sounds like them: no TTS, no voice cloning.
- **Rehearsal is a timer with eyes** — the learner asked for a way to practise before recording. It highlights the current scene and runs the clock; it deliberately has no camera or microphone, so it costs nothing to use and cannot make anyone self-conscious.

## What We're Building

- One light, calm page with the two-column layout above
- Screenshot upload with numbering, drag reorder, per-screenshot notes, and multiple actions per screenshot
- In-app screen capture: share a window, grab a frame per state, stop when done
- Optional free-text rubric, with a one-click course-criteria filler
- Tone selector and 1–3 minute length control
- Script generation producing scenes with spoken lines, captions, and visible source descriptions
- Editable descriptions and lines that update scenes in place
- Criteria panel, red to green, with plain-language explanations for reds
- Cut flags for time-eating scenes that prove nothing
- Running clock against the chosen length, plus the rubric mismatch notice
- Cached sample project filling both columns
- Copy the full script as plain text
- Screen recording up to three minutes, kept in the tab across reloads
- The clip playing beside the script, scenes seeking to their moments
- Rehearsal against the clock, with the current scene highlighted
- A voice pass over the clip, ending in one downloadable `.webm`

## Deferred From the POC

- **Saved projects across sessions** — a recording and its script survive a reload in the same tab; a project list with a name and a date would need identity and storage the app deliberately avoids.
- **Export to SRT or other caption formats** — captions are visible and copyable; a subtitle file is a convenience, not the kernel.
- **In-app teleprompter overlay** — rehearsal highlights the current scene; a floating word-for-word prompter is a second surface, and the script is meant to be glanced at.
- **Music, multiple audio tracks, or retaking one scene's voice** — one voice pass over the whole take is the decision; scene-level retakes are production polish.
- **Editing the rubric's weights or structure** — free text either parses or it doesn't; a rubric editor is configuration.

## Possible Later Enhancements

- A library of openings that don't sound like "Hi, I'm excited to present."
- Auditing a script the user already wrote against their rubric.
- Two-pass mode: a fast draft, then a "cut 30 seconds" pass that only deletes.
- Exporting the storyboard as a shot list for whoever does the actual recording.

## Non-Goals

- Generating footage — the app plays back what you recorded and captures your voice over it; it never invents the picture.
- Accounts, sign-in, or cross-session project history. A recording lives in the tab it was made in.
- Scoring the project or predicting whether it will win.
- Replacing the user's judgment about what matters in their own work. The app names gaps; the human decides.
- Polished marketing surface — no pricing page, no features page, no onboarding tour.

## Open Questions

1. **How the rubric's time limit is detected** when it is written in prose ("5 minutes including Q&A"). Affects the mismatch notice's reliability, not the layout. Resolve in `4-spec`.
2. **How precisely a model can timestamp scenes** in a three-minute recording. Seconds of drift are tolerable for the player, less so for cut flags. Check with the learner's own recording in slice 5, and fall back to even spacing if it is off by more than a few seconds.
3. **Whether the browser can record a canvas and a microphone in one stream for a full three minutes without drift.** The pass is real time, and the tab must stay in front. Check on the learner's machine in the voice slice, with a three-minute take; if drift or dropped frames exceed a second, cap the pass at the clip's length and say so.
4. **Voice-pass fidelity.** The canvas re-encode is real time; check that small text stays legible at 1280px in the downloaded file, and that Chrome (the demo browser) produces a `.webm` that plays on the learner's phone.
