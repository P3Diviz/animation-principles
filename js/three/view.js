// The 2D / 3D switch, shared by every principle page with a 3D view.
// The switch writes data-view on <main> (toggles.js); CSS shows one stage. This file:
//   - gives the stage area the is-3d class in the 3D view (no backdrop blur behind a live canvas),
//   - loads the page's 3D module the first time 3D is picked, so the 2D view never waits for
//     Three.js or the models,
//   - shows and hides it (its render loop stops while 2D is showing).
//
//   bindView(() => import('./02-anticipation-3d.js'), { onSwitch(is3d, view) { ... } });
//
// The 3D module exports create({ stageEl, canvas, status }) and returns { show(), hide(), ... }.
// onSwitch lets the page hand its timeline over to the 3D view's clock and back.
import { reducedMotion } from './stage.js';

const $ = id => document.getElementById(id);

export function bindView(load, { onSwitch = () => {} } = {}) {
  const main = $('main');
  const area = main.querySelector('.stage-area');
  const status = $('status');
  let view = null;   // a promise of the 3D view, once it has been asked for

  async function apply() {
    const is3d = main.dataset.view === '3d';
    area.classList.toggle('is-3d', is3d);
    if (!is3d) {
      const v = view && await view;
      v?.hide();
      onSwitch(false, v);
      return;
    }
    if (!view) {
      status.textContent = 'Loading…';
      view = load()
        .then(m => m.create({ stageEl: $('stage3d'), canvas: $('canvas'), status }))
        .catch(e => { console.error(e); status.textContent = 'The 3D view could not start on this computer'; return null; });
    }
    const v = await view;
    if (main.dataset.view !== '3d' || !v) return;   // the learner may have switched back meanwhile
    v.show();
    onSwitch(true, v);
  }

  main.addEventListener('statechange', e => { if (e.detail.attr === 'view') apply(); });
}

// A clock for a 3D view: a Web Animation on the canvas that changes nothing on screen,
// so the shared timeline can scrub, pause and step the 3D view like any 2D animation.
// The 3D view reads clock.currentTime each frame and poses the model from it.
export function clock3d(canvas, frames, fps = 25) {
  const clock = canvas.animate([{ opacity: 1 }, { opacity: 1 }], { id: 'clock3d', duration: frames * 1000 / fps, iterations: Infinity });
  if (reducedMotion) { clock.pause(); clock.currentTime = 0; }
  return clock;
}

// Seconds into the loop, from a clock
export function clockSeconds(clock) {
  const d = clock.effect.getTiming().duration;
  return ((((clock.currentTime ?? 0) % d) + d) % d) / 1000;
}

// Hand playback from one set of animations to another (2D to 3D and back): whatever was
// playing keeps playing, whatever was paused stays paused.
export function handOver(from, to) {
  const running = from.some(a => a.playState === 'running');
  from.forEach(a => a.pause());
  to.forEach(a => running ? a.play() : a.pause());
}
