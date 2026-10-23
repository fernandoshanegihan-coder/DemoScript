---
doc: spec
status: approved
---

# DemoScript — Technical Spec

## How This Works, In Plain Language

DemoScript is one web page. There is no database and no login.

When you drop a screenshot in, the page keeps it in the browser's memory and shows it as a thumbnail. When you press **Make my script**, the page sends your screenshots — plus your notes, your rubric, your tone, and your chosen length — to a small piece of code running on your own laptop. That piece is a **server route**: a file in the project that the browser can call, and the only place your Gemini API key ever lives.

The server route sends each screenshot to Gemini and asks for a fixed-form answer: what it sees, which interface parts it found, and whether it is confident. If the model isn't confident, the app says **"not clear — what does it show?"** instead of inventing something.

Then the server makes one more call with all of that, and gets back a list of scenes (a spoken line, a caption, which screenshot it belongs to, which criteria it covers), plus the parsed criteria. The page drops those into the right column. Editing a scene sends just that scene back for a rewrite.

With a **recording**, the flow is shorter and richer. The browser records the screen with `MediaRecorder`, keeps the clip in this tab (IndexedDB, so a reload doesn't lose it), and uploads it once through Gemini's file API. One call then returns the same scene list, plus the second each scene starts at. The page shows the clip beside the script; clicking a scene seeks the video. A quiet mode strip then runs a rehearsal — the clock ticks and the current scene is highlighted — and when the read is ready, **Add voice** plays the clip and records the microphone over it, redrawing the picture into a canvas so picture and voice leave as one `.webm`.

Nothing is saved anywhere except this browser tab: reload keeps a recording and its script, and closing the tab ends them. There is no account and no server-side storage.

The clock is arithmetic, not AI: the app counts words in the spoken lines and divides by about 2.5 words per second. The cut flags are arithmetic too: a scene that takes a big share of the clock and covers no criterion gets flagged. That keeps the app's two judgment calls cheap and predictable.

Nothing else is saved. Screenshot work is gone on reload; a recording survives it, because three minutes of clicking is too much to lose to a refresh.

## The Core Journey Through the System

`prd.md > The Core Journey`, traced through the pieces:

1. **Open the page** → `app/page.tsx` renders both columns. No data is fetched. The right column is `SkeletonStoryboard.tsx` — ghosted cards and clock, no criteria circles.
2. **Click "Try it with a sample project"** → `lib/sampleProject.ts` returns a finished storyboard from memory. **No model call.** This is what makes the example instant.
3. **Drop screenshots** → the browser turns each into a thumbnail and a data URL (the image encoded as text). They sit in page state; nothing is uploaded anywhere yet.
4. **Or record** → `getDisplayMedia` plus `MediaRecorder` produce a `.webm` blob (max 3:00 of footage, pause/resume with the gap cut, auto-stop). The blob is written to IndexedDB on stop, so a reload restores it without a model call.
5. **Add notes, reorder, "+ add another action"** → page state only. Order is the scene order.
6. **Paste a rubric** → page state. Criteria circles still don't appear; they appear after generation parses the text.
7. **Press "Make my script"** → with screenshots, the browser POSTs to `/api/analyze`; with a recording, it POSTs the blob to `/api/video`.
8. **`/api/analyze`** → one Gemini call for all images with structured output, `{ analyses: [{ index, description, elements, confident }] }`. Confident results pass through; low-confidence results become the "not clear" prompt.
9. **`/api/video`** → uploads the clip through the Files API, waits until it is `ACTIVE`, then one call returns `{ criteria, scenes: [{ shotId, startSeconds, spokenLine, caption, covers }] }`. The file is deleted from Gemini afterwards.
10. **Browser POSTs to `/api/script`** (screenshot path only) → with the descriptions, notes, rubric text, tone, and length.
11. **`/api/script`** → one Gemini call. Returns `{ criteria: [...], scenes: [...] }`. The route renumbers criterion ids so scenes and panel cannot disagree.
12. **Page renders the storyboard** → `Storyboard.tsx` and `SceneCard.tsx`. `lib/timing.ts` computes each scene's seconds and the total; `lib/cuts.ts` flags expensive scenes with no criteria coverage. With a recording, `VideoPlayer.tsx` sits above the cards and the timeline marks every scene.
13. **Rehearse** → `RehearsalPanel` runs a 250 ms interval against the scenes' `seconds`, highlighting the current scene and counting the clock. Pause and stop are local; no media permission is requested.
14. **Add voice** → `OverdubPanel` gets the microphone, plays the silent clip into a canvas at its own dimensions, records `canvas.captureStream(30)` plus the mic track into one `MediaRecorder`, and offers the finished `.webm` for preview and download. No server call, no upload.
15. **User edits a scene** → browser POSTs to `/api/script` with a `rewrite` payload. Only that scene changes; rewrites use the lite model so they don't spend the 20/day prose quota.
16. **Copy** → the page assembles plain text from page state and writes it to the clipboard. No server call.

The key boundary: **images and video leave the browser only when the button is pressed**, and the API key never leaves the server route.

## Stack

| Piece | Choice | Why | Docs |
|---|---|---|---|
| Framework | Next.js (App Router), TypeScript | One project holds both the page and the server route that protects the key | https://nextjs.org/docs |
| Styling | Tailwind CSS | Fast, consistent spacing and color without hand-writing CSS | https://tailwindcss.com/docs |
| Model | Gemini 3.5 Flash-Lite (analysis) and 3.8 Flash (script), free tier | Vision plus structured output; limits verified and recorded in the checklist | https://ai.google.dev/gemini-api/docs |
| SDK | `@google/genai` | Official current SDK; handles structured output and file upload | https://googleapis.github.io/js-genai/ |
| Recording | `getDisplayMedia` + `MediaRecorder` (WebM) | Already used for frame capture; no plugin, no server | https://developer.mozilla.org/docs/Web/API/MediaRecorder |
| Tab storage | IndexedDB | Holds a 50–150MB clip across reloads without a server | https://developer.mozilla.org/docs/Web/API/IndexedDB_API |
| Voice pass | canvas + microphone + `MediaRecorder` | One real-time pass gives picture and voice in one file, with no ffmpeg download | https://developer.mozilla.org/docs/Web/API/MediaStream_Recording_API |
| Runtime | Node 20+ | Local dev server | https://nodejs.org |

**Tradeoff accepted:** Next.js is heavier than this app needs. In exchange, the API key stays server-side and there is one command to run.

**Unverified, check first:** whether Gemini's video timestamps land within a second or two on a real recording. It is checked in the first recording slice before the UI depends on it.

**Fallback if the free tier is too tight:** OpenRouter's free vision models, behind the same server route. The route's interface doesn't change, so the UI is unaffected.

## Where It Runs and How Someone Tries It

- **Environment:** Node 20+, `GEMINI_API_KEY` in `.env.local` (never committed; already covered by `.gitignore`).
- **Start:** `npm install`, then `npm run dev`. Open `http://localhost:3000`.
- **Recording:** the demo video is recorded from this local instance. No deploy is needed for submission.
- **Deployment:** optional and deferred. Vercel is the natural target if wanted later; it needs the same environment variable set in the project settings.
- **Repo:** public GitHub repository required at submission, containing the app. `.env.local` must never be committed.

## Look and Feel

Carried from `prd.md > Look and Feel`:

- **Palette:** warm off-white background (`#FAF8F5`-ish), near-black text (`#1C1917`), one restrained accent for interactive elements. Red and green are reserved for criteria coverage and warnings — nowhere else, so they always mean something.
- **Typography:** one humanist sans for the interface, plus a slightly larger, generously leaded setting for spoken lines so they can be read mid-recording. Scene lines are the largest text on the page.
- **Density:** spacious and calm. Generous padding, few borders, no drop shadows. It should read as a page, not a dashboard.
- **Copy tone:** plain and direct, second person. "Add a screenshot to start." "This scene eats 40 seconds and proves nothing." No exclamation marks, no marketing register.
- **Skeleton:** the empty right column is near-watermark contrast; the one explanatory sentence over it is normal contrast. Criteria circles are absent until a rubric exists.
- **Light only.** No dark mode toggle — it would double the styling work for no demo value.

## Components

Each maps to a PRD heading.

### `UploadColumn` — inputs
Holds the upload area, thumbnail list, rubric box, tone/length controls, and the "Make my script" button. Owns the disabled state and the "what's missing" line.
PRD ref: `prd.md > Screens and Layout`, `prd.md > Uploading and arranging screenshots`.

### `ThumbnailList` — screenshots and their notes
Numbered thumbnails with drag reorder, a note field per screenshot ("what do you do here?"), and "+ add another action" which appends a second action to the same image. Each action becomes a scene candidate.

**Cap: 6 screenshots.** A seventh is refused with a plain line — "6 at a time — that's already a full 3-minute script" — and the existing six stay untouched. The cap exists to protect the demo from rate limits and long waits, not to limit the product.
PRD ref: `prd.md > Uploading and arranging screenshots`.

### `CaptureBar` — frames from the user's own screen
Two buttons sit under the drop area: "Choose screenshots" and "Capture screenshots." Capture calls `navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })`, keeps the returned stream alive in a ref, and shows a small bar with one "Capture frame" button, a remaining count, and "Stop sharing."

Where `documentPictureInPicture` is available, that bar opens as a small always-on-top window so the user can stay focused on the project they're demoing; otherwise it renders inside the upload area. The floating window is built with plain DOM and inline styles — it is a separate document, so React handlers and Tailwind classes don't apply there. Its buttons call back into the page's capture and stop functions through refs.

Each "Capture frame" draws the current video frame to a canvas, encodes a JPEG like an upload, and appends a shot with an empty note. "Stop sharing" stops every track and unmount stops them too. Closing the floating window ends the share. No recording, no audio, no persisted frames.
PRD ref: `prd.md > Capturing frames from your own screen`.

### `Recorder` — three minutes of footage
"Record screen" calls `getDisplayMedia` and feeds the stream into `MediaRecorder` (`video/webm;codecs=vp9`, no audio track). A ticking strip shows elapsed time, pause/resume, and stop. The 3:00 limit counts recorded footage: `pause()` stops writing frames and `resume()` continues the same file, so the paused stretch is cut and paused time doesn't spend the budget. `MediaRecorder.stop()` is called automatically at the limit. On stop, the blob is written to IndexedDB with its duration, mime type, and capture date, and becomes the active recording. Only one is kept. Recording again replaces it after a confirm.
PRD ref: `prd.md > Recording your screen`.

### `RecordingBar` — controls over the project
Where `documentPictureInPicture` is available, the take opens a small always-on-top window with the elapsed time, Pause/Resume, and Stop. It is plain DOM and inline styles, like the capture bar. The point is that pausing never requires switching back to DemoScript — that switch would be recorded. Closing the window leaves the recording running; the in-page strip still has the controls. Browsers without Document Picture-in-Picture use the strip alone.
PRD ref: `prd.md > Recording your screen`.

### `RecordingStrip` — the clip in the input column
While recording: the elapsed time, Pause/Resume, Stop, and the 3:00 limit, with a paused line that says the stretch is cut. When a recording exists: a poster frame, `1:42 of 3:00`, "Record again", "Remove". Removing deletes the IndexedDB entry and clears the script that came from it.
PRD ref: `prd.md > Screens and Layout`.

### `VideoPlayer` — footage beside the script
A `<video>` element bound to an object URL from the stored blob, muted. A thin timeline under it marks every scene at its `startSeconds`. Clicking a scene card seeks to that moment and highlights the row that contains the playhead. No trimming, no scrubbing controls beyond the native bar.
PRD ref: `prd.md > Playing the recording`.

### `ModeStrip` — script and rehearsal
A quiet row above the storyboard, shown only once a script exists: **Script · Rehearse**. Record joins the strip when the voice pass exists; it is not offered before there is something to record. It switches what the right column is doing without leaving the page.
PRD ref: `prd.md > Rehearsing it`, `prd.md > Recording the screen`.

### `RehearsalPanel` — the clock with eyes
Takes over the script column while rehearsal runs: the remaining time, the current scene highlighted in place, pause and stop. A 250 ms interval advances the active scene once its `seconds` have elapsed. On stop it reports where the read ended against the chosen length. No camera, no microphone, no storage.
PRD ref: `prd.md > Rehearsing it`.

### `RecordPanel` — silent screen take
Owns the existing recorder strip inside `UploadColumn`: start, elapsed time, pause/resume, stop, the 3:00 auto-stop of recorded footage, the take preview, remove, and replace.
PRD ref: `prd.md > Recording your screen`.

### `OverdubPanel` — one voice pass
With a take, **Add voice** counts 3-2-1, asks for the microphone, and plays the take in a hidden `<video>`. Each frame is drawn into a canvas at the take's dimensions; `canvas.captureStream(30)` plus the mic track feed one `MediaRecorder`, and the result is a single `.webm` with picture and voice. If the tab is hidden, the pass stops and says so; the silent take is untouched. "Try the voice again" replaces the file, never the take.
PRD ref: `prd.md > Recording your voice over it`.

### `RubricBox` — optional criteria
Free-text area, question-style label, placeholder examples, and a link that fills in the course's own criteria from a constant. Parsing happens on the server, not here.
PRD ref: `prd.md > The rubric (optional)`.

### `ToneLengthControls` — tone and clock target
Segmented control for Professional / Energetic / Storytelling, and a 1–3 minute length control defaulting to 2. Changing length changes the clock's denominator immediately.
PRD ref: `prd.md > Tone and length`.

### `SkeletonStoryboard` — the promise
Ghosted scene cards, an empty clock bar labelled `0:00 / 2:00`, and the one normal-contrast explanatory sentence. Includes the "Try it with a sample project" link. No criteria circles.
PRD ref: `prd.md > Screens and Layout`.

### `Storyboard` / `SceneCard` — the output
Scene cards in order: thumbnail, spoken line, caption, editable source description, timer chip, covered criteria, and a cut flag when flagged. Editing the description calls the rewrite endpoint for that scene only.
PRD ref: `prd.md > Reviewing and fixing scenes`, `prd.md > The cut`.

### `CriteriaPanel` — red to green
One row per parsed criterion. Red with a plain-language explanation of what no scene proves; green when a scene covers it. No scores or percentages.
PRD ref: `prd.md > The criteria panel`.

### `ClockBar` — time
Numerator from `lib/timing.ts`, denominator from the chosen length. Shows the mismatch notice when the rubric names a different required time.
PRD ref: `prd.md > The clock`, `prd.md > Tone and length`.

## Data Model

All interactive data lives in React state in `app/page.tsx`, with one exception: a recording and the script it produced are kept in IndexedDB so a reload does not lose three minutes of work. There is no database, no `localStorage`, and no server-side session. Screenshot work is gone on reload.

```ts
type Shot = {
  id: string;            // generated in the browser
  fileName: string;
  dataUrl: string;       // base64 image, downscaled to max 1600px wide
  note: string;          // "what do you do here?"
  actions: Action[];     // one screenshot can produce several scenes
};

type Action = { id: string; note: string };

type Analysis = {
  shotId: string;
  description: string;   // "a login form with email, password, green button"
  elements: string[];    // what the model actually found
  confident: boolean;    // false → app asks instead of inventing
};

type Criterion = {
  id: string;
  label: string;         // short form for the panel
  source: string;        // the original line from the rubric
};

type Scene = {
  id: string;
  shotId: string;
  actionId: string;
  spokenLine: string;
  caption: string;
  description: string;   // editable; correcting it rewrites this scene
  covers: string[];      // criterion ids
  seconds: number;       // word-count, or the clip's span for a recording scene
  startSeconds?: number; // recording path only: where this scene begins
};

type ScenePatch = Partial<
  Pick<Scene, "spokenLine" | "caption" | "description" | "covers">
>;

type Recording = {
  blob: Blob;            // WebM, video only, max 3:00
  mimeType: string;
  durationSeconds: number; // recorded footage; paused time excluded
  posterDataUrl: string; // first frame, for the player and the thumbnail
  createdAt: number;
};

type StoredSession = {
  recording: Recording;
  scenes: Scene[];
  criteria: Criterion[];
  tone: Tone;
  minutes: number;
  rubric: string;
};

type Take = {
  blob: Blob;            // the voice pass: picture + mic, never uploaded
  url: string;           // object URL, revoked on replace and unmount
  seconds: number;
  mimeType: string;
};
```

**Stored only for recordings.** `StoredSession` lives in IndexedDB under one key, so a reload restores the clip and the script together. Screenshot work stays in React state and disappears on reload, as before. Nothing goes to a server.

**Derived, never asked of the model:** `seconds` (word count, or the span between timestamps for a recording) and the cut flag are computed in `lib/timing.ts` and `lib/cuts.ts`. This keeps two of the product's judgment calls deterministic, free, and explainable.

**What happens on leaving and returning:** screenshot work is gone. A recording and its script are restored from IndexedDB, and the voice pass is not stored — a reload means saying it again, which is honest about a file that was never uploaded.

## File Structure

```
demoscript/
├── app/
│   ├── layout.tsx              # shell, fonts, metadata
│   ├── page.tsx                # the one page; owns all state
│   ├── globals.css             # Tailwind entry + the few custom tokens
│   └── api/
│       ├── analyze/route.ts    # POST: screenshots → descriptions + confidence
│       ├── video/route.ts      # POST: recording → scenes with timestamps
│       └── script/route.ts     # POST: everything → criteria + scenes (or one rewrite)
├── components/
│   ├── UploadColumn.tsx
│   ├── Recorder.tsx
│   ├── RecordingStrip.tsx
│   ├── CaptureBar.tsx
│   ├── VideoPlayer.tsx
│   ├── ModeStrip.tsx
│   ├── RehearsalPanel.tsx
│   ├── OverdubPanel.tsx
│   ├── ThumbnailList.tsx
│   ├── RubricBox.tsx
│   ├── ToneLengthControls.tsx
│   ├── SkeletonStoryboard.tsx
│   ├── Storyboard.tsx
│   ├── SceneCard.tsx
│   ├── CriteriaPanel.tsx
│   └── ClockBar.tsx
├── lib/
│   ├── gemini.ts               # two models, schema-enforced JSON, fallback
│   ├── prompts.ts              # the exact prompts and response schemas
│   ├── types.ts                # the types above
│   ├── timing.ts               # words → seconds
│   ├── capture.ts              # getDisplayMedia + frame grabbing
│   ├── recorder.ts             # screen recording, pause/resume, 3:00 of footage
│   ├── sessionStore.ts         # IndexedDB: clip + script survive a reload
│   ├── overdub.ts              # canvas + mic → one WebM
│   ├── floatingBar.ts          # always-on-top capture and recording controls
│   ├── cuts.ts                 # cut-flag rules
│   ├── rubric.ts               # time-limit detection
│   └── sampleProject.ts        # cached example (no model call)
├── public/
│   └── sample/                 # sample screenshots used by the sample project
├── scripts/
│   └── check-model.mjs         # which models this key can use, and why not
├── .env.local                  # GEMINI_API_KEY (gitignored)
├── .env.example                # names only, no secrets
├── package.json
├── tsconfig.json
└── README.md                   # how to run, where the key goes
```

## External Services and Dependencies

**Gemini API — image analysis**

- SDK: `@google/genai` v2, `ai.models.generateContent({ model, contents, config })`. The key stays in `.env.local`.
- Model: `gemini-3.5-flash-lite` (free tier: 10 rpm, 500 requests/day per project, verified 23 Oct 2026).
- One call for **all** screenshots, not one per image: every image goes in as an `inlineData` part, and the response schema is `{ analyses: [{ index, description, elements, confident }] }`. The free tier counts requests per day, and six separate calls is the easiest way to exhaust it before the script is written.
- Config: `temperature: 0.2`, `thinkingLevel: low`, `responseMimeType: "application/json"`, `responseSchema`, with an explicit instruction that abstaining (`confident: false`) is a valid answer.
- Cost on free tier: no charge; the daily cap is the real limit.

**Gemini API — script generation**

- Model: `gemini-3.8-flash` (free tier: 5 rpm, **20 requests/day**), falling back to `gemini-3.5-flash-lite` (500/day) when its daily quota is gone, so the app never dead-ends on a quota the student cannot see.
- Same SDK call, text-only, containing: all descriptions, all notes, rubric text (if any), tone, length, and the instruction set.
- `responseSchema` for `{ criteria: [{ id, label, source }], scenes: [{ shotId, actionId, spokenLine, caption, covers }] }`.
- One call for the whole script, not one per scene — fewer calls, fewer chances to fail, and the model can balance time across scenes. The brief asks for roughly one scene per 15 seconds and lets the model reuse a screenshot when there are fewer images than scenes, which is the normal case for a one-page project.
- Rewrite mode: same endpoint, one scene's context plus its target duration, returning a single scene.

**Gemini API — recording analysis**

- Upload with `ai.files.upload({ file, config: { mimeType } })`, then poll `ai.files.get({ name })` until `state === "ACTIVE"` (a 1–2 minute WebM usually activates in a few seconds).
- One call with the file plus the rubric text, tone, length, and the same scene brief. Response schema: `{ criteria: [...], scenes: [{ shotId: "video", startSeconds, spokenLine, caption, covers }] }`.
- Timestamps are the model's estimate, not frame-accurate. The route sorts them, clamps them to the clip's duration, and forces the first to 0. If two scenes land on the same second, the later one is nudged forward by one second.
- The uploaded file is deleted (`ai.files.delete`) in a `finally`, so nothing is left in the project's file storage.
- The clip is picture-only, so the model works from the visuals; no transcription step exists.
- Free-tier cost: one request per generation, ~50–60k tokens for three minutes, well inside the per-minute limit.

**Browser media APIs — the voice pass**

- The silent take plays in a hidden `<video>` (muted, `playsInline`), and each frame is drawn to a canvas at the take's own dimensions, capped at 1280px wide.
- `canvas.captureStream(30)` supplies the picture; `getUserMedia({ audio: true })` supplies the voice. A new `MediaStream([videoTrack, audioTrack])` is recorded for exactly the take's duration, so the file is in sync with no muxing library.
- Output: `video/webm;codecs=vp9,opus`. The file is previewed from an object URL, downloaded through a link, and never uploaded.
- The pass is real time and needs the tab in front. If `visibilitychange` fires during the pass, it stops and says so rather than recording a frozen canvas over live audio.
- Everything is released on finish, replace, and unmount: tracks stopped, object URLs revoked.

**Time limit detection** — `lib/rubric.ts` looks for a duration in the rubric text (`3 minute`, `2:30`, `180 seconds`, `5 min including Q&A`) with a small set of patterns. If nothing is found, no notice. Deliberately simple; prose like "keep it brief" won't match and shouldn't.

**Documentation:** https://ai.google.dev/gemini-api/docs/image-understanding · https://ai.google.dev/gemini-api/docs/structured-output · https://ai.google.dev/gemini-api/docs/rate-limits

## Important Failure Modes

- **A recording the browser refuses to make** (no display capture, a blocked permission, Safari without MediaRecorder support) → a plain line: "This browser can't record the screen — use Chrome, or drop screenshots instead." The screenshot path stays available.
- **The always-on-top recording controls can't open** (no Document Picture-in-Picture, or the browser denies the window) → the in-page strip still has pause, resume, and stop; the take is unaffected. Closing the floating window on purpose does not stop the recording.
- **A clip that never finishes uploading or activating** (slow link, a stuck file state) → a progress line with a cancel; after 90 seconds the app says it can't read the clip right now and leaves it in the tab to retry.
- **A recording longer than the model can usefully read** → the recorder stops itself at 3:00, so this cannot reach the model. A file dropped in its place is measured first and refused with the same limit.
- **Timestamps that drift** → scenes still seek, but a scene may land a second or two off. The player is the source of truth and the user can see the moment; there is no per-scene retiming control in the POC.
- **Microphone refused during a voice pass** → the silent take stays, the panel explains what to allow, and "Add voice" is still there to try again.
- **The tab is hidden during a voice pass** → the pass stops, says why, and leaves the silent take untouched; it never produces a file with frozen picture.
- **The voice pass runs long** → it ends when the take ends. There is no trimming and no second track; a mistake means "Try the voice again".
- **Free-tier rate limit or quota hit** → "Gemini's free quota is used up for now — try again in a minute, or after midnight Pacific if it keeps happening." The user's screenshots and notes stay, and a retry is one click. The script call first tries the better model and falls back to flash-lite, so a used-up daily cap on one model does not block the generation.
- **A screenshot the model can't read** (blurry, a photo of a phone, a mostly-empty page) → `confident: false` produces "I couldn't read this one — what does it show?" with the note field focused. No invented content.
- **Generation takes long enough to feel broken** (10–20s with several screenshots) → the right column shows progress in place ("reading screenshot 2 of 4", then "writing scenes"), never a full-screen spinner that hides the layout.
- **Image too large** → the browser downscales to 1600px wide before sending; if the file isn't an image, it's rejected at drop with a plain line.
- **Malformed model JSON** → one retry with the same prompt; on a second failure, a plain error and the user's input untouched.
- **Too many screenshots** → a seventh drop is refused with "6 at a time — that's already a full 3-minute script." Existing screenshots are unaffected.
- **Screen sharing refused or unavailable** → a plain line in the upload area: "Screen sharing was blocked. Use Choose screenshots instead." Nothing else changes, and no state is lost.
- **The user ends the share from the browser's own bar** → the stream's `ended` event fires; the capture bar disappears and the buttons return without an error.

## What Was Simplified and Why

- **No database or persistence** — everything lives in page state, because the PRD explicitly chose "a reload starts clean." A stored project would add storage and identity for no demo value.
- **The sample project is a hardcoded constant** (`lib/sampleProject.ts` plus images in `public/sample/`) instead of a real cached model run — it must feel instant, and it's the opening beat of the demo video. It is labeled as a sample in the UI.
- **Cut flags are computed locally** from time cost and criteria coverage instead of asking the model to judge them — deterministic, free, and explainable in one sentence. **Rule: a scene longer than 15 seconds, or more than 20% of the chosen length, that covers no criterion is flagged.** Both numbers are deliberately conservative so the first flag a user sees is obviously right, and both live in `lib/cuts.ts` for tuning after the sample project.
- **The clock is word-count arithmetic**, not audio analysis — no audio work belongs in this app.
- **One generation call for all scenes** instead of a call per scene — fewer rate-limit hits, and the model can distribute time sensibly.
- **The course's own criteria are a constant**, filled by a link, rather than being fetched from anywhere.
- **Screen capture shares a window and grabs frames** instead of recording video — the product needs stills with notes, and recording would add permission, storage, and trimming work for no demo value. Captured frames are encoded exactly like uploads.
- **The voice pass is a real-time canvas re-encode, not a muxer** — ffmpeg in the browser is ~25MB and slow to boot; drawing the take into a canvas and capturing it with the mic gives one synced file with no dependency. The cost is that the pass takes as long as the take and needs the tab in front.
- **One silent screen take, one voice pass, no editing** — trimming or re-recording by scene would turn this into an editor. "Try the voice again" is the whole retry model.

## Decisions and Open Issues

**Learner decisions (agreed in conversation):**

- **Next.js + Tailwind + Gemini** — accepted after being shown that the browser must not hold the API key. Tradeoff: a larger framework than the app needs.
- **Gemini free tier**, with OpenRouter free models as the documented fallback.
- **Local only for now**; deployment deferred until after it works, so hosting never blocks the demo video.
- **The app asks when it can't read a screenshot** — the learner's instruction: if it isn't clear, ask what it is, and say it isn't clear. No guessing.
- **Tone is the user's choice among three, with Professional preselected** — the learner's resolution of the default-tone question: the user picks. Preselecting one keeps the button usable without an extra decision.
- **The cut threshold: 15 seconds or 20% of the clock, covering no criterion** — chosen after being shown a short filler scene that would not be flagged; the learner preferred catching real waste over noticing every small thing.
- **Screenshot cap: 6** — the learner's number, after a mix-up with "6 minutes." The length control stays 1–3 minutes as approved in `prd.md > Tone and length`.
- **Confirm step after generation** — carried from `prd.md > Product Decisions`.

**Implementation choices derived from those decisions:**

- One image call per screenshot with concurrency capped, and one script call per generation.
- `seconds` and `flaggedCut` computed locally, not by the model.
- Structured output with a confidence flag and an explicit "unknown" path.
- The API key is read only inside `app/api/*/route.ts`.

**The genuine uncertainty, discussed and resolved:** the learner's own worry — a model confidently describing a button that isn't there. Clarified with three concrete mechanisms: low temperature, a fixed response schema with a `confident` field, and explicit permission to abstain. The learner's response added a requirement: when it isn't clear, the app asks rather than guesses. **Check during the build:** run one deliberately bad screenshot (a photo of a screen at an angle) and confirm the app asks instead of inventing.

**Open issues:**

1. **Exact model ID and current free-tier limits** — deferred by the learner: decided at the start of the build with one scratch call, before any app code depends on it. Candidate: Gemini 3 Flash on the free tier, with 3.1 Flash-Lite or OpenRouter free vision as fallbacks.
2. **How reliably prose time limits are detected** — accepted as deliberately simple. If detection misfires on a real rubric, the mismatch notice is wrong but the user's length still wins, so the failure is harmless.
