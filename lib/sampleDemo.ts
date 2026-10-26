import type { ProjectBrief } from "./projectBrief";
import type { Scene } from "./types";

export const SAMPLE_VIDEO = "/sample/launchpad.mp4";
// HTMLMediaElement playback duration (the MP4 also contains non-zero track offsets).
export const SAMPLE_DURATION = 90.6123;
export const SAMPLE_BRIEF: ProjectBrief = {
  problem: "Student teams need a shared view of what needs doing, who owns each task and how the project is progressing.",
  solution: "Launchpad is a team project board for creating tasks, assigning owners, setting priorities and moving work from To do through In progress to Done.",
  highlights: "Create the high-priority Record the demo task for Alex; move work through its stages; filter My tasks and High priority while watching whole-project progress.",
  difference: "This example uses fictional people and tasks. The progress bar describes the whole project even when a filter narrows the visible cards.",
  takeaway: "A shared board turns individual task updates into visible team progress.",
};

const passages = [
  [0, 18, "One shared view", "The Launchpad board shows To do, In progress and Done columns, task owners, priorities and project progress at 40%.", "Student projects can lose direction when tasks, owners and updates live in different places. Launchpad brings that work onto one shared board, so the team can see what is waiting, what is underway and what is finished."],
  [18, 26, "Give the next step an owner", "The Add task dialog opens. Record the demo is entered as the task name, Alex is selected as owner, and priority is changed to High before creating the task.", "To make the next step concrete, we add a task called Record the demo. We choose Alex as its owner and give it high priority. Naming both the responsibility and the urgency makes this more useful than a loose reminder: the board tells the team what needs attention and who is taking it forward."],
  [44, 12, "See the new work", "The new high-priority Record the demo card appears in To do, assigned to Alex. Project progress is recalculated for six tasks.", "The new task sits in To do with its owner and priority attached. Progress reflects the task list, keeping unfinished work visible rather than hiding it."],
  [56, 6, "Make active work visible", "Record the demo is changed from To do to In progress and moves into the middle column.", "We move Record the demo into progress, making active work visible."],
  [62, 3, "Completion changes progress", "Build the interactive prototype is marked Done. Overall project progress increases to 50%.", "Completed tasks increase project progress."],
  [65, 9, "Focus on your responsibilities", "My tasks is selected. Maya's tasks remain visible while whole-project progress stays at 50%.", "My tasks narrows the board to Maya’s work while the progress bar still represents the whole project."],
  [74, 12, "Find urgent work", "High priority is selected. High-priority tasks across owners are shown, including Record the demo, the prototype and the welcome-screen task.", "High priority switches the view to urgent work across the team. We can still see each task’s owner and stage without losing the project-wide progress measure."],
  [86, SAMPLE_DURATION - 86, "Turn updates into team progress", "Design the campus welcome screen is marked Done. Progress reaches 67%, and Record the demo remains In progress.", "That shared view turns individual updates into visible team progress."],
] as const;

export function sampleScenes(): Scene[] {
  return passages.map(([startSeconds, seconds, caption, visualDescription, spokenLine], index) => ({
    id: `launchpad-${index + 1}`, startSeconds, seconds, caption, visualDescription, spokenLine,
    description: "", covers: [],
  }));
}

/** Sample routes never read, replace or save the visitor's current IndexedDB session. */
export function isSampleSession(search: string): boolean {
  return new URLSearchParams(search).get("sample") === "launchpad";
}
