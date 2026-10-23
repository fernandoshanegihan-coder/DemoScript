import { secondsFor } from "./timing";
import type { SampleProject, Scene } from "./types";

const shots = [
  {
    id: "shot-1",
    fileName: "campus-plate-landing.png",
    dataUrl: "/sample/landing.svg",
    note: "The pitch: know before you walk over",
    actions: [],
  },
  {
    id: "shot-2",
    fileName: "campus-plate-waits.png",
    dataUrl: "/sample/wait-times.svg",
    note: "Live wait times, sorted shortest first",
    actions: [],
  },
  {
    id: "shot-3",
    fileName: "campus-plate-map.png",
    dataUrl: "/sample/map.svg",
    note: "Same numbers, placed on the map",
    actions: [],
  },
];

type Draft = Omit<Scene, "seconds">;

const drafts: Draft[] = [
  {
    id: "scene-1",
    shotId: "shot-1",
    actionId: "shot-1",
    spokenLine:
      "Last week I walked to three dining halls before I found a line I was willing to stand in. By the time I ate, my study group had started without me.",
    caption: "Three halls. No idea how long the wait was.",
    description: "A landing page for a campus dining app with a search field and a card showing today's menu.",
    covers: ["crit-problem"],
  },
  {
    id: "scene-2",
    shotId: "shot-1",
    actionId: "shot-1",
    spokenLine:
      "This is Campus Plate. It answers one question: should I walk over right now? Every hall is listed with its hours, its stations, and a line estimate that updates every two minutes, pulled from the same door count the staff already keep. No account, no setup — you open it and the answer is already there. I built it because the official page tells you what's on the menu and nothing about whether it's worth the walk.",
    caption: "Campus Plate: hours, stations, and line estimates for every hall.",
    description: "The same landing page, with an 'Open now' badge and a four-minute wait chip.",
    covers: ["crit-problem"],
  },
  {
    id: "scene-3",
    shotId: "shot-2",
    actionId: "shot-2",
    spokenLine:
      "Wilson Hall is four minutes and two blocks from the library. North Quad is nine, and it's grab-and-go, so the line keeps moving even when it looks long. Tower is eighteen right now, because it's all-you-care-to-eat and everyone arrives at seven. The number beside each hall is the one thing I couldn't find anywhere else, and it's the only thing I actually needed. Sorted by shortest wait, so the answer is the top row. It refreshes every two minutes, and the timestamp at the top tells you how stale it is.",
    caption: "Sorted by shortest wait, refreshed every two minutes.",
    description: "A list of four dining halls with wait-time chips in green, amber and red.",
    covers: ["crit-working"],
  },
  {
    id: "scene-4",
    shotId: "shot-2",
    actionId: "shot-2",
    spokenLine:
      "Dietary filters persist across halls and across sessions, because re-selecting vegetarian on every screen is exactly the friction that made me stop using the old app. When the kitchen swaps a dish at four o'clock, the menu here changes at four o'clock too. Six stations, each with its own line, so you can skip the one that's jammed.",
    caption: "Filters stick. Six stations, six separate waits.",
    description: "The wait list again, scrolled to a hall's station breakdown.",
    covers: ["crit-working", "crit-design"],
  },
  {
    id: "scene-5",
    shotId: "shot-3",
    actionId: "shot-3",
    spokenLine:
      "The map is the part I use most. It puts those waits where I'm actually standing, so the decision becomes walking distance instead of building names. Three pins, three numbers, one glance, then I'm walking. This is the screen that replaced the group chat argument about where to eat.",
    caption: "Waits placed on the map, by walking distance.",
    description: "A campus map with three numbered pins in green, amber and red, plus a 'Near you' list.",
    covers: ["crit-working", "crit-design", "crit-problem"],
  },
  {
    id: "scene-6",
    shotId: "shot-3",
    actionId: "shot-3",
    spokenLine:
      "There's a lot more I want to build: saved halls, a friend group so we can agree on one place, and predictions for the lunch rush. Those are next, once the core loop is solid. I also want a weekly email that names the quietest hall on campus each Friday, because that is the kind of thing nobody wants to work out themselves.",
    caption: "What's next: saved halls, group picks, rush predictions.",
    description: "The map view, with the 'Near you' panel in the corner.",
    covers: [],
  },
];

const criteria = [
  {
    id: "crit-problem",
    label: "Clear problem framing",
    source: "Does the demo explain the problem before the solution?",
  },
  {
    id: "crit-working",
    label: "Working product",
    source: "Is there a working product demonstrated end to end?",
  },
  {
    id: "crit-design",
    label: "Design polish",
    source: "Is the interface coherent and usable?",
  },
  {
    id: "crit-depth",
    label: "Technical depth",
    source: "Does the demo show technical depth or difficulty?",
  },
];

export const sampleProject: SampleProject = {
  shots,
  scenes: drafts.map((draft) => ({ ...draft, seconds: secondsFor(draft.spokenLine) })),
  criteria,
  rubric:
    "Clear problem framing, working product, design polish, technical depth. Demo limited to 3 minutes.",
  lengthSeconds: 180,
  tone: "professional",
};

/** What no scene proves — used by the red criterion row. */
export const sampleRedNotes: Record<string, string> = {
  "crit-depth":
    "Nothing in this script explains how it's built. A judge sees a working app, not the difficulty behind it.",
};
