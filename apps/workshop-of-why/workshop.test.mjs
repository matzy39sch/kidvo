import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { parseLesson, loadLessons } from './build-lessons.mjs';

const root = new URL('./', import.meta.url), dictionaries = {};
for (const lang of ['en', 'hu', 'ro']) runInNewContext(await readFile(new URL('lang/' + lang + '.js', root), 'utf8'), {
  kidvoStrings: (code, values) => { dictionaries[code] = values; }
});
const source = await readFile(new URL('lessons/sky-blue.json', root), 'utf8'), lesson = parseLesson(source, dictionaries.en);
const box = {};
runInNewContext(await readFile(new URL('basin.js', root), 'utf8'), { window: box });
runInNewContext(await readFile(new URL('engine.js', root), 'utf8'), { window: box, WorkshopBasin: box.WorkshopBasin });
const create = () => box.Workshop.create(lesson);
const option = (game, action) => game.options().find(item => item.action === action);
const choose = (game, correct) => {
  const q = game.current(), choices = game.state.mode === 'check' ? q.ai.choices : game.state.mode === 'guide' ? q.guide.choices : q.choices;
  return game.act(game.options().find(item => item.action === 'reply' && choices[item.index].correct === correct));
};

test('translations include every key and preserve placeholders', () => {
  const variables = value => [...new Set([...value.matchAll(/\{(\w+)\}/g)].map(m => m[1]))].sort();
  for (const lang of ['hu', 'ro']) {
    assert.deepEqual(Object.keys(dictionaries[lang]).sort(), Object.keys(dictionaries.en).sort());
    for (const [key, value] of Object.entries(dictionaries.en)) {
      assert.ok(dictionaries[lang][key].trim());
      assert.deepEqual(variables(dictionaries[lang][key]), variables(value), lang + '/' + key);
    }
  }
});

test('invalid JSON, duplicate properties and broken lesson data are rejected', () => {
  assert.ok(lesson);
  for (const value of ['{', '[]', 'null', '{}', source.replace('"version": 2', '"version": 0, "version": 2'),
    source.replace('"version": 2', '"version": 2, "ver\\u0073ion": 2')]) assert.equal(parseLesson(value, dictionaries.en), null);
  const mutations = [
    value => { value.steps[0].place = 'unknown'; },
    value => { value.steps[0].scene = 'missing'; },
    value => { value.steps[0].ai.scene = 'missing'; },
    value => { value.objects[0].bounds = [90, 10, 0, 100]; },
    value => { value.objects[0].button = [0, 200]; },
    value => { value.objects[1].id = value.objects[0].id; },
    value => { delete value.scenes.ordinary.observations.mirror; },
    value => { value.scenes.ordinary.effects = ['unknown']; },
    value => { value.steps[0].observe = 'yes'; },
    value => { value.steps[0].experiment = 'cw'; },
    value => { value.steps[0].ai.experiment = ''; },
    value => { value.steps[0].prompt = 'missing_key'; },
    value => { value.steps[0].choices[0].correct = true; },
    value => { value.steps[0].guide.choices = []; },
    value => { value.steps[0].ai.kind = 'always-right'; },
    value => { value.steps[0].ai.place = 'outside'; },
    value => { value.steps[0].ai.extra = true; },
    value => { value.steps[1].id = value.steps[0].id; },
    value => { value.steps = [value.steps[0]]; },
    value => { value.steps.push(...structuredClone(value.steps)); }
  ];
  for (const mutate of mutations) { const value = structuredClone(lesson); mutate(value); assert.equal(parseLesson(JSON.stringify(value), dictionaries.en), null); }
});

test('bad source files do not remove good lessons; bundle is fresh', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'kidvo-workshop-'));
  try {
    await writeFile(join(directory, 'a-valid.json'), source);
    await writeFile(join(directory, 'b-broken.json'), '{"steps":');
    await writeFile(join(directory, 'c-duplicate.json'), source);
    const variant = structuredClone(lesson); variant.id = 'json-only-door';
    await writeFile(join(directory, 'd-another.json'), JSON.stringify(variant));
    const result = await loadLessons(pathToFileURL(directory + '/'), dictionaries.en);
    assert.equal(result.lessons.length, 2);
    assert.equal(result.lessons[1].id, 'json-only-door');
    assert.deepEqual(result.skipped, ['b-broken.json', 'c-duplicate.json']);
  } finally {
    assert.equal(dirname(resolve(directory)), resolve(tmpdir()));
    assert.ok(basename(directory).startsWith('kidvo-workshop-'));
    await rm(directory, { recursive: true, force: true });
  }
  const result = await loadLessons(new URL('lessons/', root), dictionaries.en), window = {};
  runInNewContext(await readFile(new URL('lessons.js', root), 'utf8'), { window });
  assert.deepEqual(result.skipped, []);
  assert.deepEqual(JSON.parse(JSON.stringify(window.workshopLessons)), result.lessons);
});

test('objects supply observations and the entire lesson works without AI', () => {
  const game = create(); game.begin();
  assert.equal(game.options().length, 0);
  game.visit('mirror'); assert.equal(game.state.awaiting, true);
  let done = 0;
  for (const q of lesson.steps) {
    if (game.state.awaiting) game.visit(q.place);
    assert.equal(game.state.awaiting, false);
    assert.ok(!option(game, 'ai'), 'AI is not offered before the child thinks');
    const msg = choose(game, true); if (msg.done) done++;
  }
  assert.equal(done, 1); assert.equal(game.state.requests, 0); assert.equal(game.state.checked, 0);
  assert.equal(game.state.mode, 'complete');
});

test('wrong answers lead to smaller questions, then retry without advancing', () => {
  const game = create(); game.begin(); game.visit('window');
  for (const q of lesson.steps) {
    if (game.state.awaiting) game.visit(q.place);
    const before = game.state.at, msg = choose(game, false);
    assert.equal(game.state.mode, 'guide');
    assert.ok(!msg.parts.some(part => part.key === q.reply), 'no automatic main-answer reveal');
    choose(game, false); assert.equal(game.state.at, before);
    choose(game, true); assert.equal(game.state.at, before); assert.equal(game.state.mode, 'question');
    choose(game, true);
  }
});

test('AI checks require the right observation and are distinct from main answers', () => {
  const game = create(); game.begin(); game.visit('window');
  for (const q of lesson.steps) {
    if (game.state.awaiting) game.visit(q.place);
    game.act(option(game, 'unsure'));
    const before = game.state.at, count = game.state.checked, msg = game.act(option(game, 'ai'));
    assert.equal(msg.ai, true); assert.equal(msg.wrong, q.ai.kind === 'wrong'); assert.equal(game.state.mode, 'check');
    assert.ok(!option(game, 'ai'), 'no nested AI requests inside their check');
    if (game.state.awaiting) {
      assert.equal(game.options().length, 0);
      game.visit(q.ai.place);
    }
    choose(game, false); assert.equal(game.state.checked, count);
    const checked = choose(game, true);
    assert.equal(checked.checked, true); assert.equal(game.state.checked, count + 1);
    assert.equal(game.state.at, before); assert.equal(game.state.mode, 'question');
    assert.ok(!checked.parts.some(part => part.key === q.ai.text), 'do not republish the AI assertion on retry');
    if (game.state.awaiting) game.visit(q.place);
    choose(game, true);
  }
  assert.equal(game.state.checked, lesson.steps.length);
});

test('new diagrams require a fresh observation; retries do not repeat that gate', () => {
  const game = create(); game.begin(); game.visit('window');
  for (const q of lesson.steps) {
    if (q.observe) assert.equal(game.state.awaiting, true);
    if (game.state.awaiting) game.visit(q.place);
    if (q.id === 'white-light') {
      assert.ok(game.visit('window').parts.some(part => part.key === 'obs_window_light'));
      choose(game, false); choose(game, true);
      assert.equal(game.state.awaiting, false, 'returning to the question keeps the observation');
    }
    if (q.id === 'air') assert.ok(game.visit('window').parts.some(part => part.key === 'obs_window'));
    if (q.id === 'spread-blue') {
      assert.ok(game.visit('window').parts.some(part => part.key === 'obs_window_air'));
      assert.equal(q.intro, 'air_compare');
    }
    choose(game, true);
  }
});

test('AI has no quota, each request needs a check, old messages keep their keys', () => {
  const game = create(), opening = game.begin(), snapshot = JSON.stringify(opening);
  game.visit('window'); game.act(option(game, 'unsure'));
  for (let i = 0; i < 5; i++) {
    game.act(option(game, 'ai'));
    assert.equal(game.state.mode, 'check');
    choose(game, true);
    assert.equal(game.state.at, 0);
  }
  assert.equal(game.state.requests, 5); assert.equal(game.state.checked, 5);
  assert.equal(JSON.stringify(opening), snapshot);
});

test('stale replies and restarting cannot emit a completion', () => {
  const game = create(); game.begin(); game.visit('window');
  const stale = option(game, 'reply');
  game.begin(); game.visit('window');
  const result = game.act(stale);
  assert.ok(!result.done); assert.equal(game.state.at, 0); assert.equal(game.state.checked, 0);
});

test('a JSON-only variation uses its own title, scene and reordered steps', () => {
  const variant = structuredClone(lesson); variant.id = 'another-investigation'; variant.title = 's3_q';
  variant.steps = [variant.steps[2], variant.steps[1], variant.steps[0]];
  variant.steps[0].scene = 'air'; variant.steps[0].ai.scene = 'daylight';
  assert.ok(parseLesson(JSON.stringify(variant), dictionaries.en));
  const game = box.Workshop.create(variant), opening = game.begin();
  assert.equal(opening.parts[1].key, 's3_q');
  assert.deepEqual([...game.scene().effects], ['air']);
  game.visit('window');
  assert.equal(game.visit('window').parts[0].key, 'obs_window_air');
  game.visit('mirror'); game.act(option(game, 'unsure')); game.act(option(game, 'ai'));
  assert.deepEqual([...game.scene().effects], ['daylight']);
  choose(game, true);
  let completions = 0;
  for (const q of variant.steps) {
    if (game.state.awaiting) game.visit(q.place);
    if (choose(game, true).done) completions++;
  }
  assert.equal(completions, 1);
});

test('every bundled investigation completes with guidance and authored AI checks', async () => {
  const { lessons, skipped } = await loadLessons(new URL('lessons/', root), dictionaries.en);
  assert.deepEqual(skipped, []);
  for (const content of lessons) {
    const game = box.Workshop.create(content); game.begin();
    let completions = 0;
    for (const q of content.steps) {
      if (game.state.awaiting) game.visit(q.place);
      for (const direction of ['cw', 'ccw']) {
        if (game.basin.state.phase === 'empty') game.basin.refill();
        game.basin.stir(direction); game.basin.drain(); game.basin.finish();
      }
      choose(game, false); assert.equal(game.state.mode, 'guide');
      choose(game, false); choose(game, true);
      game.act(option(game, 'ai'));
      if (game.state.awaiting) game.visit(q.ai.place);
      const checkedBefore = game.state.checked;
      choose(game, false); assert.equal(game.state.checked, checkedBefore);
      assert.ok(choose(game, true).checked);
      if (game.state.awaiting) game.visit(q.place);
      if (choose(game, true).done) completions++;
    }
    assert.equal(completions, 1, content.id);
    assert.equal(game.state.checked, content.steps.length, content.id);
  }
});

test('basin requires stirring, preserves trial evidence on refill, and cannot finish twice', () => {
  const basin = box.WorkshopBasin.create();
  assert.equal(basin.drain(), false); assert.equal(basin.finish(), false);
  assert.equal(basin.stir('invalid'), false);
  assert.equal(basin.stir('cw'), true); assert.equal(basin.drain(), true);
  assert.equal(basin.has('cw'), false, 'unfinished animation does not earn evidence');
  assert.equal(basin.refill(), false); assert.equal(basin.stir('ccw'), false);
  assert.equal(basin.finish(), true); assert.equal(basin.finish(), false);
  assert.equal(basin.has('cw'), true); assert.equal(basin.has('both'), false);
  basin.refill(); assert.equal(basin.has('cw'), true);
  basin.stir('ccw'); basin.drain(); basin.finish();
  assert.equal(basin.has('both'), true);
});

test('experiment gates main and AI answers and resets on replay', () => {
  const content = structuredClone(lesson); content.objects[0].visual = 'basin';
  content.scenes.ordinary.effects = ['basin']; content.steps[0].experiment = 'cw';
  content.steps[0].ai.experiment = 'both';
  assert.ok(parseLesson(JSON.stringify(content), dictionaries.en));
  const game = box.Workshop.create(content); game.begin(); game.visit('window');
  assert.equal(game.active(), 'basin_need_cw'); assert.equal(game.options().length, 0);
  game.basin.stir('cw'); game.basin.drain(); game.basin.finish();
  game.act(option(game, 'unsure')); game.act(option(game, 'ai'));
  assert.equal(game.active(), 'basin_need_both'); assert.equal(game.options().length, 0);
  game.basin.refill(); game.basin.stir('ccw'); game.basin.drain(); game.basin.finish();
  assert.ok(choose(game, true).checked);
  game.begin(); game.visit('window');
  assert.equal(game.options().length, 0); assert.equal(game.basin.state.trials.length, 0);
});
