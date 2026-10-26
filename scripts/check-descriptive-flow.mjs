// Optional live integration checks: synthetic text fixtures, no personal footage.
import assert from 'node:assert/strict';
import { narrationBudget, wordCount } from '../lib/narrationBudget.ts';
const endpoint = process.env.TEST_URL || 'http://localhost:3000/api/story';
async function request(body) {
  const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const result = await response.json();
  assert.equal(response.ok, true, result.error);
  return result;
}
const scenes = [
  { startSeconds: 0, seconds: 15, spokenLine: '', caption: 'Inventory', visualDescription: 'StockDesk inventory table with item names, current quantities and reorder thresholds. Low-stock rows are visually marked.' },
  { startSeconds: 15, seconds: 30, spokenLine: '', caption: 'Review low stock', visualDescription: 'The user applies a low-stock filter. One item has quantity 4 and reorder threshold 10. The user opens its details and sees its supplier and stock fields.' },
  { startSeconds: 45, seconds: 20, spokenLine: '', caption: 'Supplier draft', visualDescription: 'A supplier message draft includes the selected item and requested quantity. The user edits the text. A send button is visible but not pressed.' },
];
const body = { scenes, preset: 'client-pitch', narrator: 'we', brief: {
  problem: 'Small stockroom teams need to identify items that need attention before running out.',
  solution: 'We built StockDesk to review low-stock items and prepare a supplier message for human review.',
  highlights: 'Filter low-stock items, inspect quantities and thresholds, then review and edit a supplier draft.',
  difference: 'Staff decide what to order and send; the app does not place orders or send messages automatically.',
  takeaway: 'Move from spotting a stock issue to preparing a clear supplier request while retaining human control.',
} };
const result = await request(body);
assert.ok(Array.isArray(result.lines), `Expected developed passages, received ${JSON.stringify(result)}`);
assert.equal(result.lines.length, scenes.length);
const counts = result.lines.map((line, index) => {
  const words = wordCount(line); const budget = narrationBudget(scenes[index].seconds);
  assert.ok(words >= budget.minWords && words <= budget.maxWords, `Scene ${index + 1}: ${words} outside ${budget.minWords}-${budget.maxWords}`);
  return { seconds: scenes[index].seconds, words };
});
console.log(JSON.stringify({ domain: 'inventory', durationFit: counts, lines: result.lines }, null, 2));

const sparse = { ...body, scenes: [{ startSeconds: 0, seconds: 35, spokenLine: '', caption: 'Assistant workspace', visualDescription: 'A third-party chat tool shows a prompt field and an answer. The answer is too small to read. A customization panel opens with several options.' }], brief: {
  problem: 'For anyone.', solution: 'An AI assistant for different tasks.', highlights: 'Quick answers and customization.', difference: '', takeaway: '',
} };
const needsContext = await request(sparse);
assert.ok(needsContext.questions?.length > 0 && needsContext.questions.length <= 3);
assert.equal(needsContext.lines, undefined, 'Do not write unsupported narration before questions are answered.');
console.log(JSON.stringify({ asksBeforeWriting: true, questions: needsContext.questions }, null, 2));
const answered = await request({ ...sparse, contextAnswers: needsContext.questions.map(item => ({ question: item.question, answer: 'The third-party tool is called Demo Assistant. We are demonstrating how a tutor uses it, not claiming to have built it. The task is turning lesson notes into practice questions, then customizing response style to use short sentences and examples for beginners. That is the purpose of the customization panel. The exact options and control names are unknown, so omit them rather than ask for them again. The generated draft is for a tutor to review; it is not verified correct or automatically published. We have not measured response speed, so omit instant-answer claims. The exact prompt text is unknown; explain the purpose without quoting it.' })) });
assert.ok(Array.isArray(answered.lines), `Expected script after focused answers: ${JSON.stringify(answered)}`);
const words = wordCount(answered.lines[0]); const budget = narrationBudget(35);
assert.ok(words >= budget.minWords && words <= budget.maxWords);
console.log(JSON.stringify({ domain: 'tutoring workflow', resumedWithoutVideo: true, words, narration: answered.lines[0] }, null, 2));
