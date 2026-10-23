---
doc: scope
status: approved
---

# Demo Script Desk (working name — no name chosen yet)

A web app that turns a pile of messy project screenshots plus a hackathon rubric into a demo script with captions, and tells you which criteria your demo does not yet prove.

## The Unique Kernel

Not the prose. **The red criterion, and the cut.** The app's job is to say "you built something real here and nothing in your video proves it" — and to say "drop this screen, it eats 40 seconds and proves nothing." That is the moment a stranger's eyes are borrowed. Anyone can paste screenshots into a chatbot and get a script; the value is the outside judgment about coverage and overstuffing.

## Who It's For

A student or hackathon participant at 11pm the night before a deadline. The project works, barely — the last feature was built at 3am. Fourteen tabs are open, the rubric is a PDF they've skimmed twice, and the screenshots are sitting in Downloads as `Screenshot 2026-10-21 at 22.43.png`.

They are not bad at talking. They are too close to their own work to know what a stranger needs to see. They tried recording once, ramble-explained the login page for forty seconds, and deleted it.

What they do today instead: wing the recording, go long, then either submit it anyway or give up and skip the video.

## The Core Loop

1. Open the app. No signup, no configuration.
2. Drop in screenshots — messy, out of order, several actions in one image is fine.
3. The app asks whether they have a rubric. If yes, paste it. If no, the criteria panel doesn't appear and the script still works.
4. For each screenshot the app shows **what it thinks it sees**, for a two-second confirm. Trust matters more than speed here: a confident wrong description at 11pm destroys the tool.
5. Scenes appear: a spoken line you could actually say out loud, plus a caption. The user sets the target length (1–3 minutes, default 2), and the clock counts toward it. If the rubric states a different required demo time, the app names the mismatch and keeps the user's choice.
6. A criteria panel shows which rubric items the current script covers, going red to green as scenes are added, cut, or reworded.
7. They cut, fix the reds, copy the script, and read it aloud while recording somewhere else.

Why they'd come back: the red list is a to-do list, and it is never empty on the first pass.

## Inspiration & Identity

Split screen. Thumbnails on the left; scenes with a running clock on the right (e.g. `2:41 / 3:00`), and a small criteria panel going red to green as the script comes together.

The output should read at a glance and sound like a person talking — not a product launch. The tool is glanced at while recording, so the script has to be scannable, not beautiful.

Friction is the enemy: if it asks for much, it loses to just winging the recording.

## Why This Matters to the Learner

The learner wants to understand how agentic coding and skills help developers optimize a workflow, and this project is a direct case study — where a skill changed a decision, where the agent saved time, and what the human still had to decide.

The project itself is about outsourcing judgment: a founder who has lost the outsider's eyes borrowing someone else's.

## What "Working" Looks Like

Someone opens the app, drops in three or four screenshots, pastes a rubric, and within a session has a scene list they can read aloud. On screen, at least one rubric criterion transitions from **red** (unproven) to **green** because they added or reworded a scene.

The "oh, that's useful" beat: a red criterion sitting next to a screenshot of a feature they spent three days on, with the app saying, in effect, *nothing in this script proves that.*

## The POC Boundary

In:

- Screenshot upload, tolerant of messy and out-of-order input
- Optional rubric paste
- A confirm step showing what the app read in each screenshot
- Generated scenes: spoken line plus caption
- Ordering the scenes into a running script
- Criteria coverage panel, red to green
- Copy the script out
- Clock counted against a length the user sets, with a warning when the rubric disagrees

Out of scope for now: generating or editing video, recording, voice, music, timing automation, accounts, saved history.

## Later

- Teleprompter / read-mode inside the app, once the script is good
- Export to SRT or caption files
- Saving projects and coming back to them
- A library of openings that don't sound like "Hi, I'm excited to present…"
- Importing a script someone already wrote and auditing *that* against the rubric

## Explicitly Cut

- **Video generation or in-app recording.** The learner's decision: it isn't a video tool. Recording happens elsewhere.
- **Accounts and signup.** Friction; it would lose to winging it.
- **Configuring the rubric format.** Paste free text or nothing.
- **Overriding the user's chosen length.** The user's number wins. If the rubric's stated time differs, the app says so instead of silently changing it.
- **A model-invented description of a screenshot the user can't correct.** The confirm step exists because a confident hallucination at 11pm is worse than no answer.
