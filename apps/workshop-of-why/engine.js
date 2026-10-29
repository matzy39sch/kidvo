(() => {
  'use strict';
  const line = (speaker, key, vars) => ({ speaker, key, vars });
  window.Workshop = { create(lesson) {
    let basin = WorkshopBasin.create();
    const state = { at: 0, mode: 'question', awaiting: true, focus: null, allowAI: false, requests: 0, checked: 0, done: false, round: 0 };
    const current = () => lesson.steps[state.at];
    const place = () => state.mode === 'complete' ? null : state.mode === 'check' ? current().ai.place : current().place;
    const prompt = () => state.mode === 'complete' ? 'finished' : state.mode === 'check' ? current().ai.prompt :
      state.mode === 'guide' ? current().guide.prompt : current().prompt;
    const experiment = () => state.mode === 'complete' ? null : state.mode === 'check' ? current().ai.experiment || current().experiment : current().experiment;
    const needsExperiment = () => !basin.has(experiment());
    const active = () => state.awaiting ? lesson.objects.find(object => object.id === place()).go :
      needsExperiment() ? 'basin_need_' + experiment() : prompt();
    const scene = () => lesson.scenes[state.mode === 'check' ? current().ai.scene || current().scene : current().scene];
    const message = (parts, extra = {}) => ({ parts, ...extra });
    function enter(fresh = false) {
      const q = current();
      state.awaiting = (fresh && q.observe === true) || state.focus !== place();
      return [...(q.intro ? [line('mira', q.intro)] : []), line('mira', active())];
    }
    function begin() {
      basin = WorkshopBasin.create();
      Object.assign(state, { at: 0, mode: 'question', awaiting: true, focus: null, allowAI: false, requests: 0, checked: 0, done: false, round: state.round + 1 });
      return message([line('mira', 'intro_mira'), line('tavi', lesson.title), line('mira', 'intro_follow'), ...enter(true)]);
    }
    function visit(id) {
      state.focus = lesson.objects.some(object => object.id === id) ? id : null;
      id = state.focus;
      if (!id) return null;
      if (state.awaiting && id === place()) state.awaiting = false;
      const observation = scene().observations[id];
      return message([line('tavi', observation), line('mira', active())]);
    }
    function options() {
      if (state.awaiting || needsExperiment()) return [];
      const token = state.round + '-' + state.at + '-' + state.mode;
      if (state.mode === 'complete') return [{ id: token + '-replay', label: 'replay', action: 'replay', token }];
      const q = current(), choices = state.mode === 'check' ? q.ai.choices : state.mode === 'guide' ? q.guide.choices : q.choices;
      const list = choices.map((choice, index) => ({ id: token + '-' + index, label: choice.label, action: 'reply', index, token }));
      list.push({ id: token + '-unsure', label: 'unsure', action: 'unsure', token });
      if (state.allowAI && state.mode !== 'check') list.push({ id: token + '-ai', label: 'ai_ask', action: 'ai', token });
      return list;
    }
    function act(option) {
      const token = state.round + '-' + state.at + '-' + state.mode;
      if (state.awaiting || needsExperiment() || option.token !== token) return message([line('mira', active())]);
      if (option.action === 'replay') return begin();
      const q = current();
      if (option.action === 'ai' && state.allowAI && state.mode !== 'check') {
        state.requests++; state.mode = 'check';
        state.awaiting = state.focus !== q.ai.place;
        return message([line('ai', q.ai.text), ...(state.requests <= 2 ? [line('mira', q.ai.coach)] : []), line('mira', active())],
          { ai: true, wrong: q.ai.kind === 'wrong', kind: q.ai.kind });
      }
      if (option.action === 'unsure') {
        if (state.mode === 'check') return message([line('mira', q.ai.hint), line('mira', q.ai.prompt)]);
        if (state.mode === 'guide') return message([line('mira', q.guide.hint), line('mira', q.guide.prompt)]);
        state.allowAI = true; state.mode = 'guide';
        return message([line('mira', q.guide.prompt)]);
      }
      const choices = state.mode === 'check' ? q.ai.choices : state.mode === 'guide' ? q.guide.choices : q.choices;
      const choice = choices[option.index];
      if (!choice) return message([line('mira', active())]);
      if (state.mode === 'check') {
        if (!choice.correct) return message([line('mira', q.ai.hint), line('mira', q.ai.prompt)]);
        state.checked++; state.mode = 'question';
        return message([line('mira', 'check_done'), line('mira', q.ai.reply), ...enter()], { checked: true });
      }
      if (state.mode === 'guide') {
        if (!choice.correct) return message([line('mira', q.guide.hint), line('mira', q.guide.prompt)]);
        state.mode = 'question';
        return message([line('mira', 'retry'), ...enter()]);
      }
      state.allowAI = true;
      if (!choice.correct) {
        state.mode = 'guide';
        return message([line('mira', 'smaller'), line('mira', q.guide.prompt)], { judged: false });
      }
      if (state.at + 1 < lesson.steps.length) {
        state.at++; state.allowAI = false;
        return message([line('mira', q.reply), ...enter(true)], { judged: true });
      }
      state.mode = 'complete'; state.awaiting = false;
      const done = !state.done; state.done = true;
      return message([line('mira', q.reply), line('mira', 'finish_mira'), line('tavi', lesson.summary),
        line('mira', 'checked', { n: state.checked }), ...(state.checked ? [line('mira', 'checker')] : [])], { judged: true, done });
    }
    return { state, current, place, prompt, active, scene, needsExperiment, begin, visit, options, act, get basin() { return basin; } };
  } };
})();
