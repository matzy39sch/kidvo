import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
const root = new URL('./', import.meta.url);
const fields = (value, names) => value !== null && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).every(key => names.includes(key));
const id = value => typeof value === 'string' && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value) && value.length <= 40;
const visuals = ['window', 'mirror', 'prism', 'table', 'basin'];
function duplicateProperties(source) {
  const scopes = [];
  for (const match of source.matchAll(/("(?:\\.|[^"\\])*")\s*:|"(?:\\.|[^"\\])*"|[{}\[\]]/g)) {
    if (match[1]) { const key = JSON.parse(match[1]), keys = scopes.at(-1); if (keys.has(key)) return true; keys.add(key); }
    else if (match[0] === '{') scopes.push(new Set());
    else if (match[0] === '[') scopes.push(null);
    else if (match[0] === '}' || match[0] === ']') scopes.pop();
  }
  return false;
}
export function parseLesson(source, strings) {
  if (typeof source !== 'string' || Buffer.byteLength(source) > 24000) return null;
  let lesson;
  try { lesson = JSON.parse(source); } catch { return null; }
  if (duplicateProperties(source)) return null;
  const text = key => typeof key === 'string' && /^[a-z][a-z0-9_]*$/.test(key) && typeof strings[key] === 'string' && strings[key].trim().length > 0;
  const choices = list => Array.isArray(list) && list.length >= 2 && list.length <= 4 &&
    list.every(c => fields(c, ['label', 'correct']) && text(c.label) && typeof c.correct === 'boolean') &&
    list.filter(c => c.correct).length === 1 && new Set(list.map(c => c.label)).size === list.length;
  const guide = value => fields(value, ['prompt', 'hint', 'choices']) && text(value.prompt) && text(value.hint) && choices(value.choices);
  if (!fields(lesson, ['version', 'id', 'title', 'summary', 'objects', 'scenes', 'steps']) || lesson.version !== 2 || !id(lesson.id) ||
      !text(lesson.title) || !text(lesson.summary) || !Array.isArray(lesson.steps) || lesson.steps.length < 3 || lesson.steps.length > 8) return null;
  const percent = n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 100;
  const pair = value => Array.isArray(value) && value.length === 2 && value.every(percent);
  if (!Array.isArray(lesson.objects) || !lesson.objects.length || lesson.objects.length > 8) return null;
  const places = lesson.objects.map(object => object?.id);
  if (new Set(places).size !== places.length || !lesson.objects.every(object =>
    fields(object, ['id', 'visual', 'label', 'go', 'x', 'y', 'button', 'bounds']) && id(object.id) &&
    visuals.includes(object.visual) && text(object.label) && text(object.go) && percent(object.x) && percent(object.y) &&
    object.x >= 5 && object.x <= 95 && object.y >= 10 && object.y <= 95 && pair(object.button) &&
    object.button.every(n => n >= 10 && n <= 90) && Array.isArray(object.bounds) && object.bounds.length === 4 &&
    object.bounds.every(percent) && object.bounds[0] < object.bounds[1] && object.bounds[2] < object.bounds[3] &&
    object.x >= object.bounds[0] && object.x <= object.bounds[1] && object.y >= object.bounds[2] && object.y <= object.bounds[3])) return null;
  if (!fields(lesson.scenes, Object.keys(lesson.scenes || {})) || !Object.keys(lesson.scenes).length || Object.keys(lesson.scenes).length > 16 ||
      !Object.entries(lesson.scenes).every(([key, scene]) => id(key) && fields(scene, ['observations', 'effects']) &&
        fields(scene.observations, places) && Object.keys(scene.observations).length === places.length &&
        places.every(place => text(scene.observations[place])) && Array.isArray(scene.effects) &&
        scene.effects.length <= 4 && new Set(scene.effects).size === scene.effects.length && scene.effects.every(effect => ['air', 'daylight', 'vision', 'basin'].includes(effect)))) return null;
  const scene = key => typeof key === 'string' && Object.hasOwn(lesson.scenes, key);
  const ids = new Set();
  for (const step of lesson.steps) {
    const validExperiment = (value, place, sceneId) => value === undefined ||
      (['cw', 'ccw', 'both'].includes(value) && lesson.objects.find(object => object.id === place)?.visual === 'basin' && lesson.scenes[sceneId]?.effects.includes('basin'));
    if (!fields(step, ['id', 'place', 'scene', 'experiment', 'prompt', 'intro', 'observe', 'reply', 'choices', 'guide', 'ai']) || !scene(step.scene) ||
        !validExperiment(step.experiment, step.place, step.scene) ||
        !id(step.id) || ids.has(step.id) || !places.includes(step.place) || !text(step.prompt) || !text(step.reply) ||
        (step.intro !== undefined && !text(step.intro)) || (step.observe !== undefined && typeof step.observe !== 'boolean') ||
        !choices(step.choices) || !guide(step.guide) ||
        !fields(step.ai, ['kind', 'place', 'scene', 'experiment', 'text', 'coach', 'prompt', 'hint', 'reply', 'choices']) ||
        !validExperiment(step.ai.experiment !== undefined ? step.ai.experiment : step.experiment, step.ai.place, step.ai.scene || step.scene) ||
        (step.ai.scene !== undefined && !scene(step.ai.scene)) ||
        !['partial', 'wrong', 'complete'].includes(step.ai.kind) || !places.includes(step.ai.place) ||
        !['text', 'coach', 'prompt', 'hint', 'reply'].every(key => text(step.ai[key])) || !choices(step.ai.choices)) return null;
    ids.add(step.id);
  }
  if (!['partial', 'wrong', 'complete'].every(kind => lesson.steps.some(step => step.ai.kind === kind))) return null;
  return lesson;
}
export async function loadLessons(directory, strings) {
  const lessons = [], skipped = [];
  for (const file of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    if (!file.isFile() || !/^[a-z0-9]+(-[a-z0-9]+)*\.json$/.test(file.name)) continue;
    let lesson = null;
    try { lesson = parseLesson(await readFile(new URL(file.name, directory), 'utf8'), strings); } catch { /* Skip unreadable files too. */ }
    if (!lesson || lessons.some(item => item.id === lesson.id) || lessons.length >= 8) { skipped.push(file.name); continue; }
    lessons.push(lesson);
  }
  return { lessons, skipped };
}
export async function buildLessons() {
  let strings;
  runInNewContext(await readFile(new URL('lang/en.js', root), 'utf8'), { kidvoStrings: (_, values) => { strings = values; } }, { timeout: 1000 });
  const { lessons, skipped } = await loadLessons(new URL('lessons/', root), strings);
  await writeFile(new URL('lessons.js', root), '// Generated by build-lessons.mjs. Edit lessons/*.json and lang/*.js.\nwindow.workshopLessons = ' + JSON.stringify(lessons, null, 2).replace(/</g, '\\u003c') + ';\n');
  for (const file of skipped) console.warn('Skipped lesson: ' + file);
  console.log('Workshop: ' + lessons.length + ' lesson(s), ' + skipped.length + ' skipped.');
  return { lessons, skipped };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await buildLessons();
