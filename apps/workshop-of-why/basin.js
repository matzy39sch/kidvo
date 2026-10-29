(() => {
  'use strict';
  function create() {
    const state = { direction: null, phase: 'full', trials: [] };
    return { state,
      stir(direction) {
        if (!['cw', 'ccw'].includes(direction) || !['full', 'stirred'].includes(state.phase)) return false;
        state.direction = direction; state.phase = 'stirred'; return true;
      },
      drain() {
        if (state.phase !== 'stirred') return false;
        state.phase = 'draining'; return true;
      },
      finish() {
        if (state.phase !== 'draining') return false;
        state.trials.push(state.direction); state.phase = 'empty'; return true;
      },
      refill() { if (state.phase === 'draining') return false; state.direction = null; state.phase = 'full'; return true; },
      has(requirement) { return !requirement || (requirement === 'both' ? ['cw', 'ccw'].every(d => state.trials.includes(d)) : state.trials.includes(requirement)); }
    };
  }
  function mount(root, { getModel, translate: t, onTrial }) {
    let timer = null, frame = null, rotation = 0, started = 0;
    const $ = selector => root.querySelector(selector);
    function stop() { clearTimeout(timer); cancelAnimationFrame(frame); timer = null; frame = null; }
    function render() {
      const model = getModel(); if (!model) return;
      const { phase, direction, trials } = model.state;
      root.dataset.phase = phase; root.dataset.direction = direction || '';
      $('[data-label]').textContent = t('basin_model');
      for (const action of ['cw', 'ccw', 'drain', 'refill']) {
        const button = $('[data-action="' + action + '"]'); button.textContent = t('basin_' + action);
        button.disabled = action === 'drain' ? phase !== 'stirred' : action === 'refill' ? phase === 'draining' : !['full', 'stirred'].includes(phase);
      }
      $('[data-status]').textContent = t('basin_' + phase) + (direction ? ' · ' + t('basin_direction_' + direction) : '');
      $('[data-trials]').textContent = t('basin_trials', { n: trials.length }) +
        (trials.length ? ' · ' + [...new Set(trials)].map(d => t('basin_direction_' + d)).join(' / ') : '');
    }
    function animate(model) {
      if (getModel() !== model || !['stirred', 'draining'].includes(model.state.phase)) return;
      const draining = model.state.phase === 'draining';
      const elapsed = Math.min(1, (performance.now() - started) / 1800);
      const radius = draining ? 48 - elapsed * 31 : 48;
      rotation += (model.state.direction === 'cw' ? 1 : -1) * (draining ? 2 + elapsed * 4 : 1.5);
      const radians = rotation * Math.PI / 180;
      const dot = $('[data-drop]');
      dot.setAttribute('cx', 100 + radius * Math.cos(radians)); dot.setAttribute('cy', 70 + radius * Math.sin(radians));
      frame = requestAnimationFrame(() => animate(model));
    }
    root.addEventListener('click', event => {
      const action = event.target.closest('[data-action]')?.dataset.action, model = getModel();
      if (!model || !action) return;
      if (action === 'cw' || action === 'ccw') {
        if (!model.stir(action)) return;
        stop(); if (!matchMedia('(prefers-reduced-motion: reduce)').matches) animate(model);
      } else if (action === 'drain') {
        if (!model.drain()) return;
        stop(); started = performance.now();
        const finish = () => {
          stop(); if (getModel() !== model || !model.finish()) return;
          render(); onTrial();
        };
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) finish();
        else { animate(model); timer = setTimeout(finish, 1800); }
      } else if (action === 'refill') {
        if (!model.refill()) return;
        stop(); rotation = 0; $('[data-drop]').setAttribute('cx', 148); $('[data-drop]').setAttribute('cy', 70);
      }
      render();
    });
    return { render, reset() { stop(); rotation = 0; $('[data-drop]').setAttribute('cx', 148); $('[data-drop]').setAttribute('cy', 70); render(); } };
  }
  window.WorkshopBasin = { create, mount };
})();
