// 03 Staging: every control is a toggle that writes a data attribute on the stage area.
// In 2D, CSS swaps the drawing level, the lights, the camera framing and the silhouette test.
// The 3D view (03-staging-3d.js) is only loaded the first time the learner picks 3D, so the
// 2D page never waits for Three.js or the models. It reads the same data attributes.
import '../core/toggles.js';

const main = document.getElementById('main');
const area = document.getElementById('stageArea');
const status = document.getElementById('status');
let view3d = null;   // a promise of the 3D view, once it has been asked for

async function showView() {
  const is3d = main.dataset.view === '3d';
  area.classList.toggle('is-3d', is3d);         // no backdrop blur behind a live canvas
  if (!is3d) { if (view3d) (await view3d)?.hide(); return; }
  if (!view3d) {
    status.textContent = 'Loading…';
    view3d = import('./03-staging-3d.js')
      .then(m => m.create({
        area,
        stageEl: document.getElementById('stage3d'),
        canvas: document.getElementById('canvas'),
        plot: document.getElementById('plot'),
        status
      }))
      .catch(e => { console.error(e); status.textContent = 'The 3D view could not start on this computer'; return null; });
  }
  const view = await view3d;
  if (main.dataset.view === '3d') view?.show();  // the learner may have switched back meanwhile
}

main.addEventListener('statechange', e => { if (e.detail.attr === 'view') showView(); });
