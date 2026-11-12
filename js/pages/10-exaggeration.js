// 10 Exaggeration: Draig's take. The pose code is docs/reference/10-exaggeration-draig-demo.html
// as it is, with two changes: time comes from a clock the shared timeline can scrub, and the
// mouth opens a little even at the realistic setting.
import { showSlider } from '../core/sliders.js';
import { bindTimeline } from '../core/timeline.js';
import { scalePart, rotatePart, movePart, mouth, rigClock, runRig } from '../core/draig.js';
import { bindView, handOver } from '../three/view.js';
import '../core/toggles.js';

const part = id => document.getElementById(id);
const LOOP = 3000;   // 3-second loop = 75 frames
const clock = rigClock(part('clock'), LOOP);
let view3d = null;   // the 3D view while it's showing (10-exaggeration-3d.js)

const tl = bindTimeline({
  track: part('track'), head: part('head'), tc: part('tc'), play: part('play'),
  getAnims: () => [view3d ? view3d.clock : clock], frames: 75
});

// 2D / 3D: the timeline follows the clock of the view on screen
bindView(() => import('./10-exaggeration-3d.js'), {
  onSwitch(is3d, v) {
    view3d = is3d ? v : null;
    if (is3d) handOver([clock], [v.clock]); else if (v) handOver([v.clock], [clock]);
    tl.setFrames(is3d ? v.frames : 75);
    tl.setKeys(is3d ? v.keys : [20, 24, 27, 48]);
    part('span').style.left = is3d ? (v.keys[0] / v.frames * 100) + '%' : '26.667%';
    part('span').style.width = is3d ? ((v.keys[1] - v.keys[0]) / v.frames * 100) + '%' : '36.667%';
  }
});

// ===== Amount and presets =====
let k = 1;
const amount = part('amount'), presets = [...document.querySelectorAll('#presets button')];
let redraw = () => {};
function setAmount(v) {
  k = v / 100; amount.value = v; showSlider(amount);
  presets.forEach(b => b.setAttribute('aria-pressed', +b.dataset.v === +v));
  part('note').textContent = v < 35 ? 'Realistic: a small flinch. True to life, but easy to miss from the back of the room.'
    : v <= 110 ? 'Cartoon: squash, stretch and popping eyes sell the shock while it still feels like the same dragon.'
    : 'Too far: the eyes and stretch break the character. It stops being believable and becomes noise.';
  part('note3d').textContent = v < 35 ? 'Realistic: the jump as it was captured. True to life, but small from the back of the room.'
    : v <= 110 ? 'Cartoon: a deeper crouch, a bigger reach and a higher jump. Still the same jump.'
    : 'Too far: the joints bend further than a body can. It stops being believable.';
  redraw();
}
amount.addEventListener('input', () => setAmount(+amount.value));
presets.forEach(b => b.addEventListener('click', () => setAmount(+b.dataset.v)));

// ===== The take =====
const easeOut = t => 1 - Math.pow(1 - t, 3), clamp = t => Math.max(0, Math.min(1, t));
function envelope(t) {                       // 3-second loop: idle, pop at 0.8s, squash, stretch, hold, settle
  if (t < .8) return 0;
  if (t < .95) return -.12 * easeOut(clamp((t - .8) / .15));
  if (t < 1.08) return -.12 + .52 * easeOut(clamp((t - .95) / .13));
  if (t < 1.9) return .4;
  const u = clamp((t - 1.9) / .6); return .4 * Math.exp(-5 * u) * Math.cos(u * 9);
}
function frame(now) {
  const t = (now / 1000) % 3, e = envelope(t) * k, up = Math.max(0, e);
  const sy = 1 + e, sx = 1 / Math.sqrt(Math.max(.4, sy));            // keep volume
  const shake = k > 1.15 && t > 1.08 && t < 1.9 ? Math.sin(now / 18) * 3 * (k - 1.1) : 0;
  part('rig').setAttribute('transform', `translate(${shake} 0) translate(200 380) scale(${sx} ${sy}) translate(-200 -380)`);
  movePart('face', 0, -up * 30);
  scalePart('eye-left', 1 + up * .55, 1 + up * 1.1); scalePart('eye-right', 1 + up * .55, 1 + up * 1.1);
  scalePart('pupil-left', Math.max(.3, 1 - up * 1.4)); scalePart('pupil-right', Math.max(.3, 1 - up * 1.4));
  movePart('brows', 0, -up * 36);
  // Mouth: even a realistic flinch opens it a little (a small "o"), growing into the full open mouth
  mouth(up > .01); scalePart('mouth', up < .1 ? .45 + 6 * up : 1 + up * .7);
  rotatePart('arm-left', up * 120); rotatePart('arm-right', -up * 120);
  rotatePart('wing-left', -up * 30); rotatePart('wing-right', up * 30);
  rotatePart('tail', -up * 25); scalePart('crest', 1, 1 + up * .8);
  // blink once while idle
  const blink = t > .3 && t < .42 ? .1 : 1;
  if (up === 0) { scalePart('eye-left', 1, blink); scalePart('eye-right', 1, blink); }
  part('balloon').setAttribute('opacity', t >= .8 ? 0 : 1);
  part('burst').setAttribute('opacity', t >= .8 && t < 1.05 ? 1 - (t - .8) / .25 : 0);
}

redraw = runRig(clock, LOOP, frame);
setAmount(100);
