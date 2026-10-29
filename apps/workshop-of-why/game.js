(() => {
  'use strict';
  const $ = id => document.getElementById(id), t = (key, vars) => kidvo.t(key, vars);
  const lessons = window.workshopLessons || [];
  let lesson = null, game = null, places = {};
  const board = $('board'), bird = $('bird'), chat = $('conversation');
  let position = { x: 47, y: 80 }, drag = null, pendingMove = null, keyboard = false, viewRound = 0;
  const basinView = WorkshopBasin.mount($('basin-panel'), { getModel: () => game?.basin, translate: t,
    onTrial: () => { if (game) observe({ place: game.state.focus, repeat: true }); } });
  const render = msg => () => msg.parts.map(part => t('from_' + part.speaker, { text: t(part.key, part.vars) })).join('\n\n');
  const aiText = () => ({ tag: t('panel_tag'), ask: t(game && (game.state.awaiting || game.needsExperiment()) ? 'explore_label' : game?.state.mode === 'check' ? 'check_label' : 'reply_label'),
    notRight: t('flag'), caught: t('flagged_wrong'), fine: t('flagged_true'), other: t('other'), sparksLeft: () => '', costs: () => '', notEnough: '' });
  function scroll() { const log = chat.querySelector('.kai-log'); log.scrollTop = log.scrollHeight; }
  function placeBird(x, y) {
    position = { x: Math.max(5, Math.min(95, x)), y: Math.max(10, Math.min(95, y)) };
    bird.style.left = position.x + '%'; bird.style.top = position.y + '%';
  }
  function detect(x, y) {
    return Object.keys(places).filter(id => { const [left, right, top, bottom] = places[id].bounds;
      return x >= left && x <= right && y >= top && y <= bottom;
    }).sort((a, b) => ((places[a].x - x) ** 2 + (places[a].y - y) ** 2) -
      ((places[b].x - x) ** 2 + (places[b].y - y) ** 2))[0] || null;
  }
  function observe(move) {
    if (!game) return;
    if (ai.isBusy()) { pendingMove = move; return; }
    if (move.place === game.state.focus && !game.state.awaiting && !move.repeat) return;
    const msg = game.visit(move.place);
    if (msg) ai.say(render(msg));
    ai.refresh(); update(); scroll();
  }
  function move(x, y, repeat = false, target = null) {
    placeBird(x, y);
    const place = target || detect(position.x, position.y);
    board.dataset.focus = places[place]?.visual || '';
    observe({ ...position, place, repeat });
  }
  function answer(option) {
    const msg = game.act(option);
    if (msg.judged !== undefined) kidvo.emit('judged', { right: msg.judged });
    if (msg.checked) kidvo.emit('checked', {});
    if (msg.done) kidvo.emit('done', { lesson: lesson.id });
    return { text: render(msg), wrong: !!msg.wrong, flaggable: !!msg.ai };
  }
  const ai = kidvoAI.create(chat, {
    name: 'Workshop', sparks: null, thinkMs: 250, typeMs: 9,
    text: aiText(),
    questions: () => game ? game.options().map(option => ({ id: option.id, label: () => t(option.label), answer: () => answer(option) })) : [],
    onAnswer: () => {
      if (!game) return;
      if (game.state.round !== viewRound) {
        viewRound = game.state.round; pendingMove = null; placeBird(47, 80);
        basinView.reset();
      }
      if (pendingMove) {
        const move = pendingMove; pendingMove = null;
        const msg = game.visit(move.place);
        if (msg) ai.say(render(msg));
        ai.refresh();
      }
      update(); scroll();
      if (keyboard) chat.querySelector('.kai-chip:not(:disabled)')?.focus();
    },
    onFlag: () => {
      // A flag alone is not evidence-check credit and never changes lesson state.
      ai.say(render({ parts: [{ speaker: 'mira', key: 'flag_guide' }, ...(game ? [{ speaker: 'mira', key: game.active() }] : [])] }));
    }
  });
  function update() {
    $('title').textContent = t('title'); document.title = t('title'); document.documentElement.lang = kidvo.lang;
    $('restart').textContent = t('restart'); $('restart').disabled = ai.isBusy();
    $('doors-button').textContent = t('doors'); $('doors-button').disabled = ai.isBusy();
    $('doors-button').hidden = !game;
    $('restart').hidden = !game;
    $('hub-title').textContent = t(lessons.length ? 'choose_investigation' : 'empty');
    document.querySelectorAll('.door').forEach(button => { button.textContent = t(lessons.find(item => item.id === button.dataset.lesson).title); });
    $('room-label').textContent = t('room_title'); bird.setAttribute('aria-label', t('bird_label'));
    chat.setAttribute('aria-label', t('conversation'));
    chat.querySelector('.kai-name').textContent = t('panel_name');
    for (const id of Object.keys(places)) {
      const button = $('place-' + id); button.textContent = t(places[id].label);
      button.classList.toggle('required', !!game?.state.awaiting && game.place() === id);
    }
    $('objective').textContent = !game ? t('empty') : game.state.awaiting || game.needsExperiment() ? t(game.active()) :
      game.state.mode === 'complete' ? t('finished') : t('lesson_progress', { n: game.state.at + 1, total: lesson.steps.length, topic: t(lesson.title) });
    board.dataset.focus = places[game?.state.focus]?.visual || '';
    board.dataset.air = String(!!game && game.scene().effects.includes('air'));
    board.dataset.daylight = String(!!game && game.scene().effects.includes('daylight'));
    board.dataset.vision = String(!!game && game.scene().effects.includes('vision'));
    board.dataset.basin = String(!!game && game.scene().effects.includes('basin'));
    $('basin-panel').hidden = !(board.dataset.basin === 'true' && board.dataset.focus === 'basin');
    $('basin-close').textContent = t('basin_close'); basinView.render();
    ai.setText(aiText());
    if (game) {
      const options = game.options();
      chat.querySelectorAll('.kai-chip').forEach((chip, i) => {
        if (options[i]?.action === 'ai') chip.setAttribute('data-ai', '');
      });
    }
  }
  function begin(clear) {
    if (ai.isBusy()) return;
    pendingMove = null; drag = null; bird.classList.remove('dragging');
    if (clear) ai.reset({ sparks: null });
    placeBird(47, 80);
    if (game) { const msg = game.begin(); basinView.reset(); viewRound = game.state.round; ai.say(render(msg)); ai.refresh(); }
    else ai.say(() => t('empty'));
    update(); scroll();
  }
  function selectLesson(selected) {
    if (ai.isBusy()) return;
    lesson = selected; game = Workshop.create(lesson);
    places = Object.fromEntries(lesson.objects.map(object => [object.id, object]));
    document.querySelectorAll('.hotspot').forEach(button => button.remove());
    for (const object of lesson.objects) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'hotspot';
      button.id = 'place-' + object.id; button.style.left = object.button[0] + '%'; button.style.top = object.button[1] + '%';
      button.addEventListener('click', () => move(object.x, object.y, true, object.id)); board.append(button);
    }
    $('hub').hidden = true; $('investigation').hidden = false;
    begin(true); $('bird').focus();
  }
  function showDoors() {
    // Do not reset the shared panel during its typing phase (it has no cancel API).
    if (ai.isBusy()) return;
    pendingMove = null; drag = null; game = null; lesson = null; places = {};
    basinView.reset();
    ai.reset({ sparks: null }); $('investigation').hidden = true; $('hub').hidden = false;
    update(); document.querySelector('.door')?.focus();
  }
  for (const item of lessons) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'door'; button.dataset.lesson = item.id;
    button.addEventListener('click', () => selectLesson(item)); $('door-list').append(button);
  }
  $('doors-button').addEventListener('click', showDoors);
  $('basin-close').addEventListener('click', () => { move(30, 80); $('bird').focus(); });
  const pointer = event => {
    const rect = board.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / rect.width * 100, y: (event.clientY - rect.top) / rect.height * 100 };
  };
  bird.addEventListener('pointerdown', event => {
    if (event.button !== 0 || !game) return;
    const p = pointer(event); drag = { id: event.pointerId, dx: p.x - position.x, dy: p.y - position.y };
    bird.setPointerCapture(event.pointerId); bird.classList.add('dragging'); event.preventDefault();
  });
  bird.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    const p = pointer(event); placeBird(p.x - drag.dx, p.y - drag.dy);
  });
  const drop = event => {
    if (!drag || drag.id !== event.pointerId) return;
    drag = null; bird.classList.remove('dragging'); move(position.x, position.y);
  };
  bird.addEventListener('pointerup', drop); bird.addEventListener('pointercancel', drop);
  board.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.target.closest('button, #basin-panel')) return;
    const p = pointer(event); move(p.x, p.y);
  });
  bird.addEventListener('keydown', event => {
    const directions = { ArrowLeft: [-3, 0], ArrowRight: [3, 0], ArrowUp: [0, -3], ArrowDown: [0, 3] };
    const d = directions[event.key];
    if (d) { event.preventDefault(); move(position.x + d[0], position.y + d[1]); }
  });
  chat.addEventListener('click', update);
  chat.addEventListener('keydown', () => { keyboard = true; });
  chat.addEventListener('pointerdown', () => { keyboard = false; });
  $('restart').addEventListener('click', () => begin(true));
  showDoors();
  kidvo.onLang(() => { const log = chat.querySelector('.kai-log'); const atEnd = log.scrollHeight - log.scrollTop - log.clientHeight < 8; update(); if (atEnd) scroll(); });
})();
