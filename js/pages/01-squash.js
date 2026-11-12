// 01 Squash and stretch: Paul's ball with an amount slider, material presets and a volume check.
import '../core/toggles.js';
import { setSlider } from '../core/sliders.js';
import { bindTimeline } from '../core/timeline.js';

const $ = id => document.getElementById(id);
const stage = $('stage'), amount = $('amount'), note = $('materialNote');
const materials = [...$('materials').querySelectorAll('button')];

const tl = bindTimeline({
  track: $('track'), head: $('head'), tc: $('tc'), play: $('play'),
  getAnims: () => stage.getAnimations({ subtree: true }), frames: 25
});

// The bounce runs down-and-up (alternate), so one cycle is two durations.
// 0.5 s each way = 25 frames at 25 fps. Keys: contact (frame 0) and the top of the bounce.
function setDuration(seconds) {
  stage.style.setProperty('--dur', seconds + 's');
  const frames = Math.round(seconds * 2 * 25);
  tl.setFrames(frames);
  tl.setKeys([0, frames / 2]);
  return frames;
}

materials.forEach(b => b.addEventListener('click', () => {
  materials.forEach(x => x.setAttribute('aria-pressed', x === b));
  setSlider(amount, b.dataset.amount);
  const frames = setDuration(+b.dataset.dur);
  note.textContent = `${b.textContent}: ${b.dataset.amount}% squash, ${frames} frames.`;
}));

// Moving the slider by hand leaves the presets
amount.addEventListener('input', e => {
  if (!e.isTrusted) return;
  materials.forEach(x => x.setAttribute('aria-pressed', 'false'));
  note.textContent = `Your own: ${amount.value}% squash.`;
});

setDuration(0.5);
