// 10 Exaggeration: one slider (--k-set on the stage) pushes every keyframe further.
import { setSlider } from '../core/sliders.js';
import { bindTimeline } from '../core/timeline.js';

const $ = id => document.getElementById(id);
const stage = $('stage'), k = $('k');
const presets = [...$('presets').querySelectorAll('button')];

bindTimeline({
  track: $('track'), head: $('head'), tc: $('tc'), play: $('play'),
  getAnims: () => stage.getAnimations({ subtree: true }), frames: 50
});

presets.forEach(b => b.addEventListener('click', () => {
  presets.forEach(x => x.setAttribute('aria-pressed', x === b));
  setSlider(k, b.dataset.k);
}));
// A preset stays lit only while the slider is on its value
k.addEventListener('input', () => presets.forEach(x => x.setAttribute('aria-pressed', x.dataset.k === k.value)));
