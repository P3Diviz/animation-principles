// 05 Follow through: Draig hops right and back. His tail, wings and crest are springs pushed
// by his body's acceleration, so they lag behind, overshoot when he lands, and settle late.
// Watch: the springs are worked out ahead for the whole loop, so the timeline can scrub them.
// Drag it: the same springs run live while you move him.
import '../core/toggles.js';
import { showSlider } from '../core/sliders.js';
import { bindTimeline } from '../core/timeline.js';
import { rotatePart, scalePart, placeDraig, groundShadow, rigClock, runRig, ease, span, lerp } from '../core/draig.js';
import { bindView } from '../three/view.js';

const $ = id => document.getElementById(id);
const main = $('main'), svg = $('svg'), pos = $('draigPos'), stiffInput = $('stiff');
const LOOP = 2000, S = .42, FLOOR = 330;
const clock = rigClock($('clock'), LOOP);

bindTimeline({
  track: $('track'), head: $('head'), tc: $('tc'), play: $('play'),
  getAnims: () => [clock], frames: 50
});

// ----- The body: hop right on frames 9-19, hop back on 32-42 -----
function bodyAt(f) {
  const hop = (a, b, x0, x1) => {          // crouch 3 frames before, squash 4 frames after
    const p = span(f, a, b);
    return { x: lerp(x0, x1, ease(p)), lift: 4 * 90 * p * (1 - p) };
  };
  let b = f < 25 ? hop(9, 19, 220, 560) : hop(32, 42, 560, 220);
  let sy = 1;
  for (const [a, land] of [[9, 19], [32, 42]]) {
    if (f > a - 3 && f < a) sy = 1 - .12 * Math.sin(span(f, a - 3, a) * Math.PI);          // crouch
    if (f > a && f < a + 2) sy = lerp(1, 1.12, span(f, a, a + 2));                          // stretch up
    if (f >= a + 2 && f < land) sy = lerp(1.12, 1, span(f, a + 2, land - 3));
    if (f >= land && f < land + 4) sy = 1 - .2 * Math.sin(span(f, land, land + 4) * Math.PI); // squash on landing
  }
  return { ...b, sx: 1 / Math.sqrt(sy), sy };
}

// ----- The springs -----
// Angle (degrees) of each loose part: spin += (-k * angle - damping * spin + gain * push) * dt
// The tail is pushed by sideways acceleration, the wings and crest by up-and-down acceleration.
const PARTS = [
  { name: 'tail', gain: .22, axis: 'x' },
  { name: 'wings', gain: .4, axis: 'y' },
  { name: 'crest', gain: .3, axis: 'y' },
];
function springs() {
  const stiff = +stiffInput.value / 100;                     // 0 loose .. 1 stiff
  const k = 90 + stiff * 380;
  return { k, c: 2 * Math.sqrt(k) * (.11 + .3 * stiff) };     // stiffer: settles sooner
}
function stepSprings(state, ax, ay, dt) {
  const { k, c } = springs();
  PARTS.forEach((p, i) => {
    const s = state[i], push = p.axis === 'x' ? ax : ay;
    s.spin += (-k * s.angle - c * s.spin + p.gain * push) * dt;
    s.angle = Math.max(-45, Math.min(45, s.angle + s.spin * dt));
  });
}

// Work the springs out for the loop: run it three times so it settles into a repeat,
// and keep the last time round (100 samples a second).
let table = [];
function precompute() {
  const dt = 1 / 400, state = PARTS.map(() => ({ angle: 0, spin: 0 }));
  let prev = bodyAt(0), vx = 0, vy = 0;
  table = [];
  for (let i = 1; i <= 3 * 800; i++) {
    const f = (i * dt * 25) % 50, b = bodyAt(f);
    const nvx = (b.x - prev.x) / dt, nvy = (prev.lift - b.lift) / dt;   // y: positive is down
    stepSprings(state, (nvx - vx) / dt, (nvy - vy) / dt, dt);
    vx = nvx; vy = nvy; prev = b;
    if (i > 2 * 800 && i % 4 === 0) table.push(state.map(s => s.angle));
  }
}

function showParts(angles) {
  const on = main.dataset.follow === 'on';
  const [tail, wings, crest] = on ? angles : [0, 0, 0];
  rotatePart('tail', tail);
  rotatePart('wing-left', -wings); rotatePart('wing-right', wings);
  scalePart('crest', 1, Math.max(.6, Math.min(1.6, 1 + crest / 50)));
}
function showBody(x, lift, sx = 1, sy = 1) {
  $('rig').setAttribute('transform', `translate(200 380) scale(${sx} ${sy}) translate(-200 -380)`);
  placeDraig(pos, x, FLOOR - lift, S);
  groundShadow('shadow', lift, S);
}

// ----- Watch -----
function pose(ms) {
  if (main.dataset.mode === 'drag') return;
  const f = ms / 40, b = bodyAt(f);
  showBody(b.x, b.lift, b.sx, b.sy);
  showParts(table[Math.min(table.length - 1, Math.floor(ms / 10))]);
}
precompute();
const redraw = runRig(clock, LOOP, pose);
stiffInput.addEventListener('input', () => { showSlider(stiffInput); precompute(); redraw(); });

// ----- Drag it -----
let x = 220, target = 220, vel = 0, last = 0, live = null, running = false;
function dragStep(now) {
  if (!running) return;
  const dt = Math.min(.05, (now - (last || now)) / 1000) || .016; last = now;
  const nx = x + (target - x) * Math.min(1, dt * 14);   // he follows the pointer smoothly
  const nv = (nx - x) / dt, acc = (nv - vel) / dt;
  x = nx; vel = nv;
  stepSprings(live, acc, 0, dt);
  showBody(x, 0);
  showParts(live.map(s => s.angle));
  requestAnimationFrame(dragStep);
}
function toSvgX(e) {
  const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
  return p.matrixTransform(svg.getScreenCTM().inverse()).x;
}
const clampX = v => Math.max(110, Math.min(690, v));
svg.addEventListener('pointerdown', e => {
  if (main.dataset.mode !== 'drag') return;
  svg.setPointerCapture(e.pointerId); target = clampX(toSvgX(e));
});
svg.addEventListener('pointermove', e => {
  if (main.dataset.mode === 'drag' && svg.hasPointerCapture(e.pointerId)) target = clampX(toSvgX(e));
});
document.addEventListener('keydown', e => {
  if (main.dataset.mode !== 'drag' || e.target.closest?.('input')) return;
  if (e.key === 'ArrowLeft') { target = clampX(target - 90); e.preventDefault(); }
  if (e.key === 'ArrowRight') { target = clampX(target + 90); e.preventDefault(); }
});

// 2D / 3D. The 3D tail runs live physics, so the 3D view has no timeline;
// the 2D clock pauses while 3D is showing and carries on when the learner comes back.
let wasPlaying = false;
bindView(() => import('./05-follow-3d.js'), {
  onSwitch(is3d) {
    if (is3d) { wasPlaying = clock.playState === 'running'; clock.pause(); }
    else if (wasPlaying) clock.play();
  }
});

main.addEventListener('statechange', e => {
  if (e.detail.attr === 'view') return;
  if (e.detail.attr === 'mode' && e.detail.value === 'drag') {
    x = target = 220; vel = 0; last = 0; live = PARTS.map(() => ({ angle: 0, spin: 0 })); running = true;
    requestAnimationFrame(dragStep);
  } else if (e.detail.attr === 'mode') {
    running = false;
  }
  redraw();
});
