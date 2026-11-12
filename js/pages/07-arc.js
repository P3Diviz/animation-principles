// 07 Arc: straight or arc, arc height (slider or handle), motion path with frame dots.
import '../core/toggles.js';
import { setSlider } from '../core/sliders.js';
import { bindTimeline } from '../core/timeline.js';

const $ = id => document.getElementById(id);
const main = $('main'), stage = $('stage'), height = $('height'), area = $('throw');
const dots = [...$('dots').children];
const FLIGHT = 25;   // frames from one side to the other

bindTimeline({
  track: $('track'), head: $('head'), tc: $('tc'), play: $('play'),
  getAnims: () => stage.getAnimations({ subtree: true }), frames: 50
});

// Arc height in % of the throw area (matches --hh in the CSS)
const arcHeight = () => main.dataset.path === 'straight' ? 0 : height.value * .65;

// Where the ball is at time t (0..1 of the flight), in % of the throw area.
// Across: linear. Up and down: a parabola, 4t(1 - t), highest in the middle.
const at = (t, h) => ({ x: 10 + 80 * t, y: 82 - h * 4 * t * (1 - t) });

function drawPath() {
  const h = arcHeight();
  dots.forEach((d, i) => {
    const p = at(i / FLIGHT, h);
    d.style.left = p.x + '%'; d.style.top = p.y + '%';
  });
  // The parabola as one quadratic Bézier: its control point sits at twice the arc height
  $('ballPath').setAttribute('d', `M10 82 Q50 ${82 - 2 * h} 90 82`);
  // The eyes' path on the head turn: across, dipping by the same amount as the CSS
  const dip = h * .45;
  $('headPath').setAttribute('d', `M64 102 Q100 ${102 + 2 * dip} 136 102`);
}

height.addEventListener('input', drawPath);
main.addEventListener('statechange', drawPath);

// Drag the handle up and down to set the arc height
const apex = $('apex');
function heightFromPointer(e) {
  const r = area.getBoundingClientRect();
  const pct = (82 - (e.clientY - r.top) / r.height * 100) / .65;
  setSlider(height, Math.round(Math.max(0, Math.min(100, pct))));
}
apex.addEventListener('pointerdown', e => { apex.setPointerCapture(e.pointerId); heightFromPointer(e); });
apex.addEventListener('pointermove', e => { if (apex.hasPointerCapture(e.pointerId)) heightFromPointer(e); });
apex.addEventListener('keydown', e => {
  const d = { ArrowUp: 5, ArrowDown: -5 }[e.key];
  if (!d) return;
  e.preventDefault();
  setSlider(height, Math.max(0, Math.min(100, +height.value + d)));
});

drawPath();
