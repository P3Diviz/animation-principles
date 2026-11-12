// 06 Slow in and slow out: Graph Editor, presets, spacing marks and keyframe icons.
import { evaluate } from '../core/bezier.js';
import { bindTimeline, setKeyIcon } from '../core/timeline.js';

const FPS = 25, FRAMES = 45, MOVE = 30, MS = 1000 / FPS;   // 30-frame move (1.2 s), 15-frame hold
let P = [.33, 0, .67, 1];                                   // cubic-bezier handles (Easy Ease)
const $ = id => document.getElementById(id);
const X = x => 20 + x * 160, Y = y => 170 - y * 140;        // graph units -> SVG units
const ball = $('ball'), marks = [...$('marks').children], presets = [...$('presets').children];
let anim = null;

// Web Animations API, so the shared timeline can scrub it. Rebuilt when the curve changes,
// keeping its place and play state.
function buildAnimation() {
  const t = anim ? anim.currentTime : 0, playing = anim ? anim.playState === 'running' : true;
  if (anim) anim.cancel();
  anim = ball.animate([
    { left: '0%', offset: 0, easing: `cubic-bezier(${P.join(',')})` },
    { left: '100%', offset: MOVE / FRAMES },
    { left: '100%', offset: 1 }
  ], { duration: FRAMES * MS, iterations: Infinity });
  anim.currentTime = t;
  if (!playing) anim.pause();
}

function update() {
  $('curve').setAttribute('d', `M20 170 C${X(P[0])} ${Y(P[1])} ${X(P[2])} ${Y(P[3])} 180 30`);
  $('h1').setAttribute('cx', X(P[0])); $('h1').setAttribute('cy', Y(P[1]));
  $('h2').setAttribute('cx', X(P[2])); $('h2').setAttribute('cy', Y(P[3]));
  for (const [id, ax, ay, x, y] of [['l1', 20, 170, P[0], P[1]], ['l2', 180, 30, P[2], P[3]]]) {
    const l = $(id);
    l.setAttribute('x1', ax); l.setAttribute('y1', ay); l.setAttribute('x2', X(x)); l.setAttribute('y2', Y(y));
  }
  // One spacing mark per frame of the move
  marks.forEach((m, i) => m.style.left = (evaluate(P, i / MOVE) * 100) + '%');
  // Keyframe icons: a flat handle means eased (hourglass half), otherwise linear (diamond half)
  const outEased = P[1] < P[0] * .6, inEased = P[3] > 1 - (1 - P[2]) * .6;
  setKeyIcon($('k0'), 'linear', outEased ? 'eased' : 'linear');
  setKeyIcon($('k1'), inEased ? 'eased' : 'linear', 'linear');
  buildAnimation();
}

const unpress = () => presets.forEach(x => x.setAttribute('aria-pressed', 'false'));

presets.forEach(b => b.addEventListener('click', () => {
  P = b.dataset.p.split(',').map(Number);
  presets.forEach(x => x.setAttribute('aria-pressed', x === b));
  update();
}));

// Handle x is clamped to 0..1 so the curve stays solvable; y may go -0.25..1.25 for overshoot.
function setHandle(i, x, y) {
  P[i * 2] = Math.min(1, Math.max(0, x));
  P[i * 2 + 1] = Math.min(1.25, Math.max(-.25, y));
  unpress(); update();
}

const graph = $('graph'); let drag = null;
['h1', 'h2'].forEach((id, i) => {
  $(id).addEventListener('pointerdown', e => { drag = i; graph.setPointerCapture(e.pointerId); });
  // Keyboard: arrow keys nudge the focused handle
  $(id).addEventListener('keydown', e => {
    const step = e.shiftKey ? .1 : .02;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[e.key];
    if (!d) return;
    e.preventDefault();
    setHandle(i, P[i * 2] + d[0], P[i * 2 + 1] + d[1]);
  });
});
graph.addEventListener('pointermove', e => {
  if (drag === null) return;
  const r = graph.getBoundingClientRect();
  const sx = (e.clientX - r.left) / r.width * 200, sy = (e.clientY - r.top) / r.height * 200;
  setHandle(drag, (sx - 20) / 160, (170 - sy) / 140);
});
graph.addEventListener('pointerup', () => drag = null);

update();
bindTimeline({ track: $('track'), head: $('head'), tc: $('tc'), play: $('play'), getAnims: () => ball.getAnimations(), frames: FRAMES });
