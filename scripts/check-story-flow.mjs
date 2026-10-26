// Optional live text-only story edit using a synthetic physics-demo fixture.
import { applyStoryLines } from '../lib/storyFlow.ts';
const drafts = [
  ['Landing page', 'Equations appear next to a graph.', 'Equations work in class. Experiments have limits.'],
  ['Systems', 'Four physics-system choices are visible.', 'ModelScope compares models with data.'],
  ['Technical overview', 'The page explains deterministic analysis and AI setup assistance.', 'Analysis is deterministic. AI assists setup.'],
  ['Home', 'The landing page appears again.', 'ModelScope helps students see limits.'],
  ['Spring simulation', 'The Hooke law graph shows measurements diverging from the predicted line.', 'Measurements drift from predictions.'],
  ['Fit comparison', 'Alternative model fits and influence checks are shown.', 'The engine compares alternatives.'],
  ['Evidence', 'A modal shows evidence for a candidate transition, not a proven universal threshold.', 'There is a candidate transition.'],
  ['Systems', 'Other physics system options appear.', 'It works for other systems.'],
  ['Upload', 'A file upload interface accepts measurement data and variables.', 'Upload your own measurements.'],
  ['AI setup', 'The assistant helps configure an experiment from a description.', 'Gemini helps set up the experiment.'],
];
const scenes = drafts.map(([caption, visualDescription, spokenLine], index) => ({ caption, visualDescription, spokenLine, startSeconds: index * 12, seconds: 12 }));
const response = await fetch(process.env.TEST_URL || 'http://localhost:3000/api/story', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ scenes, preset: 'hackathon', narrator: 'i', brief: {
    problem: 'Physics students need to see where theoretical models stop fitting experimental data.',
    solution: 'ModelScope is a physics simulator for investigating model limits.',
    highlights: 'Investigate a spring model, inspect evidence, and use AI to help configure an experiment.',
    difference: 'AI assists setup; deterministic analysis produces the comparisons.', takeaway: 'Understand where a model stops describing the data.',
  } }),
});
const result = await response.json();
if (!response.ok) throw new Error(result.error);
applyStoryLines(scenes, result.lines.map((spokenLine, sceneIndex) => ({ spokenLine, sceneIndex })));
console.log(JSON.stringify({ valid: true, lines: result.lines }, null, 2));
