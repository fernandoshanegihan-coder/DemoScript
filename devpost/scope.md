---
doc: scope
status: approved
updated: 2026-10-26
---

# DemoScript

DemoScript helps people who have a working project but cannot find the words for its demo. It turns a screen recording and the creator's project context into a continuous, descriptive presenter script. The creator can rehearse it, record their own voice or generate Azure narration, and download one video with sound.

This revision synchronizes the scope with the implemented app at the learner's request. It does not record a new final review or submission sign-off.

## Who It's For

The main audience is students, hackathon participants and other builders preparing a demonstration. The learner's immediate audience is judges. The same workflow also offers University project, Client pitch and Portfolio presets.

The central problem is finding a clear story, not merely describing interface labels. A useful demo explains what happens, why it matters and how to interpret the result while the corresponding action is on screen.

## The Unique Kernel

A professional story grounded in the creator's answers and the recording, fitted to the actual scene durations. Longer scenes receive developed explanations with short natural pauses instead of one-sentence summaries. The opening, example, transitions and payoff should feel like one presentation.

The optional rubric remains useful supporting evidence: it shows criteria that the footage and mapped scenes do or do not demonstrate. Mentioning a criterion in narration is not proof of it. Coverage is an AI-assisted review aid, not a judge's score.

## The Core Loop

1. Upload a screen recording or record the screen in the app. Both paths support up to three minutes; uploads are capped at 250 MiB.
   Visitors can instead select **Try a sample demo**: the learner's 91-second Launchpad recording opens separately with a prepared descriptive script, project answers and eight voice takes. Sample mode bypasses the saved project and resets on reload; no analysis or synthesis call is needed to load it.
2. Choose Hackathon, University project, Client pitch or Portfolio, and whether the presenter speaks as I or We.
3. Answer the required project questions: audience/problem, solution and key demo moments. Difference and takeaway are optional. Paste a rubric if available.
4. Select **Make my script**. Gemini reads the recording into timestamped visual observations and optional criterion mappings.
5. If important context is missing, answer up to three focused scene questions before narration is written. Analysis and answers are retained for continuation.
6. Read a descriptive script that follows the fixed footage. Meaningful scenes explain throughout; shots under three seconds stay silent.
7. Edit a scene or use its rewrite note. **Expand explanations** improves the connected story using cached observations rather than another video upload.
8. Rehearse against the actual video clock.
9. In **Record** mode, record individual voice takes or choose an Azure voice and **Generate missing narration**. Generation skips every existing take.
10. Select **Create video with narration** and download the combined MP4 or WebM. The separate original recording and aligned narration WAV remain available under **Separate files**.

## What Working Looks Like

A person can use a recording from their own project, supply enough factual context, and obtain a script that sounds like a presenter explaining the demonstration rather than a summary of the screen.

They can hear each take, replace one scene without disturbing the rest, and download a video whose narration starts at the original scene timestamps. Deleted scenes leave silent gaps rather than shifting later speech. Missing, outdated and overlong spoken takes block export until resolved.

The browser saves the current clip, context, pending analysis, script and takes. Saved work can be restored on the same browser origin; it is not a cloud account or project history.

## The POC Boundary

In scope:

- One recording at a time, captured picture only or uploaded from disk.
- One built-in Launchpad example using a real recording and prepared narration, isolated from the visitor's saved work.
- Pause/resume during capture and floating controls where supported.
- Four audience presets, I/We and a short project interview.
- Gemini video analysis, fixed scene timings, focused follow-ups and text-only writing retries.
- Connected descriptive narration targeted at 1.8–2.4 words per second, near 2.1, with brief silent transitions.
- Scene editing, scene rewrites, whole-story expansion, copy script, optional criterion coverage and advisory cut flags.
- Rehearsal following the footage.
- Per-scene microphone takes, WPM/duration feedback and protection of existing audio.
- Optional server-side Azure TTS: Jenny, Guy and Sonia; actual audio duration checks and bounded speaking-rate adjustment.
- Browser-local saving through IndexedDB.
- Aligned mono WAV and one combined video with narration, progress and cancellation.
- Server-only service credentials and basic process-local Azure usage safeguards.

Out of scope:

- Generating footage, a full timeline editor, reordering shots, trimming voice takes, music or burned-in captions.
- Screenshot input, a sample-project library or multiple input strategies beyond the single bundled recording example.
- Accounts, cloud project storage, collaboration and a multi-project library.
- Gemini, Kokoro or OpenRouter TTS in the current app.
- Voice cloning or custom voices.
- Unlimited public usage, guaranteed model latency or automatic scoring of a submission.

## Decisions That Changed During the Build

- The project name is DemoScript; it is no longer an unnamed working title.
- Recording became the sole input. Earlier screenshot and capture-frame work is historical. The learner later requested a built-in visitor example and supplied a Launchpad recording; its prepared script/voice are bundled for instant exploration without AI processing.
- Story quality became the main goal. The rubric panel supports the story instead of defining the entire product.
- The creator interview and focused follow-ups supply context silent footage cannot provide.
- The video's duration is authoritative. There is no separate 1–3 minute target-length selector.
- Per-scene takes replaced an all-or-nothing voice pass.
- Automatic voice is now Azure Speech. Earlier Gemini/Kokoro/OpenRouter narration plans do not describe the current implementation.
- Combined video export is implemented with Mediabunny in the browser; it is no longer deferred.
- Takes persist in IndexedDB. They are not intentionally discarded on reload.
- A take that exceeds its slot is preserved but refused by aligned export; it cannot spill into another scene.

## Later

Possible future work includes caption-file export, richer voice controls, take trimming, public-deployment usage controls backed by shared storage, and a project library. These are not prerequisites for the current proof of concept.

## Validation and Remaining Work

Automated checks and synthetic browser checks have exercised script duration fitting, follow-up continuation, timeline protection and combined video/audio export. The latest recorded implementation check passed 39 regression tests and a production build. A live Azure check generated 9.8625 seconds of narration for a 10-second scene; a browser acceptance fixture produced a 16-second MP4 with AVC video and AAC audio while keeping an existing take.

These are bounded checks, not proof of quality for every recording or device. A final run with the learner's own footage, downloaded-video playback, learning wrap-up and submission packaging remain open in [checklist.md](checklist.md).

The earlier build log is preserved in [the archived checklist](archive/build-history-before-2026-10-26-sync.md).
