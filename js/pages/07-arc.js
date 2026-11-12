// 07 Arc: straight or arc, arc height (slider or handle), motion path with frame dots.
// The ball is CSS keyframes; Draig's head turn is posed from a clock on the same timeline.
import '../core/toggles.js';
import { setSlider } from '../core/sliders.js';
import { bindTimeline } from '../core/timeline.js';
import { posePart, movePart, rigClock, runRig, ease, lerp } from '../core/draig.js';

const $ = id => document.getElementById(id);
const main = $('main'), stage = $('stage'), height = $('height'), area = $('throw');
const dots = [...$('dots').children];
const FLIGHT = 25;   // frames from one side to the other
const LOOP = 2000;
const clock = rigClock($('clock'), LOOP);

bindTimeline({
  track: $('track'), head: $('head'), tc: $('tc'), play: $('play'),
  getAnims: () => stage.getAnimations({ subtree: true }), frames: 50
});

// Arc height in % of the throw area (matches --hh in the CSS)
const arcHeight = () => main.dataset.path === 'straight' ? 0 : height.value * .65;

// Where the ball is at time t (0..1 of the flight), in % of the throw area.
// Across: linear. Up and down: a parabola, 4t(1 - t), highest in the middle.
const at = (t, h) => ({ x: 10 + 80 * t, y: 82 - h * 4 * t * (1 - t) });

// ----- Draig's head turn -----
// His face slides from one side of his head to the other (that's how a front-facing character
// turns). With an arc it dips in the middle of the turn, as a real head does; straight, it slides flat.
const TURN = 42, NOSE = 232;                       // how far the face slides; height of his nose (traced)
const dip = () => arcHeight() * .6;                // in Draig's units
function turnHead(ms) {
  const t = ms % LOOP, p = t < 1000 ? t / 1000 : 2 - t / 1000;   // there and back, like the ball
  const x = lerp(-TURN, TURN, ease(p)), y = 4 * dip() * p * (1 - p);
  posePart('face', { dx: x, dy: y });
  movePart('pupil-left', x * .18, 0); movePart('pupil-right', x * .18, 0);   // the eyes lead the turn
  movePart('crest', x * .35, 0); movePart('horns', x * .2, 0);
}
const redraw = runRig(clock, LOOP, turnHead);

function drawPath() {
  const h = arcHeight();
  dots.forEach((d, i) => {
    const p = at(i / FLIGHT, h);
    d.style.left = p.x + '%'; d.style.top = p.y + '%';
  });
  // The parabola as one quadratic Bézier: its control point sits at twice the arc height
  $('ballPath').setAttribute('d', `M10 82 Q50 ${82 - 2 * h} 90 82`);
  // The nose's path on the head turn: across, dipping in the middle
  $('headPath').setAttribute('d', `M${200 - TURN} ${NOSE} Q200 ${NOSE + 2 * dip()} ${200 + TURN} ${NOSE}`);
  redraw();
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
