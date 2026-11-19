// 01 Squash and stretch: Paul's ball with an amount slider, material presets and a volume check.
import '../core/toggles.js';
import { setSlider } from '../core/sliders.js';
import { bindTimeline } from '../core/timeline.js';
import { bindView } from '../three/view.js';

const $ = id => document.getElementById(id);
const stage = $('stage'), amount = $('amount'), note = $('materialNote');
const materials = [...$('materials').querySelectorAll('button')];
let view3d = null;   // the 3D view while it's showing (01-squash-3d.js)
let frames = 25;

const cssAnims = () => stage.getAnimations({ subtree: true });
const tl = bindTimeline({
  track: $('track'), head: $('head'), tc: $('tc'), play: $('play'),
  getAnims: () => view3d ? [view3d.clock] : cssAnims(), frames
});

// The bounce runs down-and-up (alternate), so one cycle is two durations.
// 0.5 s each way = 25 frames at 25 fps. Keys: contact (frame 0) and the top of the bounce.
function setDuration(seconds) {
  stage.style.setProperty('--dur', seconds + 's');
  frames = Math.round(seconds * 2 * 25);
  view3d?.setFrames(frames);
  tl.setFrames(frames);
  tl.setKeys([0, frames / 2]);
  return frames;
}

materials.forEach(b => b.addEventListener('click', () => {
  materials.forEach(x => x.setAttribute('aria-pressed', x === b));
  setSlider(amount, b.dataset.amount);
  setDuration(+b.dataset.dur);
  view3d?.setLook(b.dataset.look);
  note.textContent = `${b.textContent}: ${b.dataset.amount}% squash, ${frames} frames.`;
}));

// Moving the slider by hand leaves the presets (the 3D ball keeps its surface)
amount.addEventListener('input', e => {
  if (!e.isTrusted) return;
  materials.forEach(x => x.setAttribute('aria-pressed', 'false'));
  note.textContent = `Your own: ${amount.value}% squash.`;
});

setDuration(0.5);

// ----- 2D / 3D: the timeline follows the clock of the view on screen -----
// The 2D ball is a CSS animation, and hiding the 2D stage throws it away, so its place and
// play state are noted just before the switch (a capture listener runs before toggles.js).
let before2d = null;
document.querySelector('.seg[data-attr="view"]').addEventListener('click', () => {
  if (view3d) return;
  const a = cssAnims()[0];
  before2d = a ? { t: a.currentTime, running: a.playState === 'running' } : null;
}, true);

bindView(() => import('./01-squash-3d.js'), {
  onSwitch(is3d, v) {
    if (is3d) {
      view3d = v;
      v.setFrames(frames);
      v.setLook(materials.find(b => b.getAttribute('aria-pressed') === 'true')?.dataset.look || 'rubber');
      if (before2d) { v.clock.currentTime = before2d.t; before2d.running ? v.clock.play() : v.clock.pause(); }
    } else {
      view3d = null;
      if (!v) return;
      // The 2D ball starts again from scratch: put it on the 3D clock's frame and play state
      const t = v.clock.currentTime, running = v.clock.playState === 'running';
      v.clock.pause();
      cssAnims().forEach(a => { a.currentTime = t % (frames * 40); running ? a.play() : a.pause(); });
    }
    tl.setFrames(frames);
    tl.setKeys([0, frames / 2]);
  }
});
