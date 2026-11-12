// 04 Straight ahead and pose to pose.
// Left: the flame, drawn straight ahead (CSS sprite). Right: Draig's jump, built from key poses.
// Keys only holds each pose (blocking); with in-betweens, the poses ease from one to the next.
import '../core/toggles.js';
import { bindTimeline, setKeyIcon } from '../core/timeline.js';
import { scalePart, rotatePart, posePart, mouth, placeDraig, groundShadow, rigClock, runRig, ease, lerp } from '../core/draig.js';

const $ = id => document.getElementById(id);
const stage = $('stage'), svg = $('svg'), pos = $('draigPos');
const FRAMES = 50, LOOP = FRAMES * 40, S = .34, X = 620, FLOOR = 380;
const FIG_KEYS = [0, 10, 16, 24, 32, 40];
const OWN_KEYS = [0, FRAMES / 3, FRAMES * 2 / 3];
const clock = rigClock($('clock'), LOOP);

const tl = bindTimeline({
  track: $('track'), head: $('head'), tc: $('tc'), play: $('play'),
  getAnims: () => stage.getAnimations({ subtree: true }), frames: FRAMES
});

// ----- The key poses of the jump -----
// lift: height off the floor; sx, sy: squash and stretch; arms, wings: degrees; eye: eye height; brow: brows down
const STAND = { lift: 0, sx: 1, sy: 1, armL: 0, armR: 0, wingL: 0, wingR: 0, eye: 1, brow: 0, mouth: 0 };
// out: how each key eases into the next. Easy Ease on every key would make him stop dead at
// take-off, in mid-air. A jump speeds up into take-off (in), slows only as it reaches the top
// (out, like gravity), and speeds up again as it falls (in).
const KEYS = [
  { f: 0,  ...STAND, out: 'inout' },
  { f: 10, lift: 0,   sx: 1.16, sy: .76, armL: -18, armR: 18,   wingL: 12,  wingR: -12, eye: .6,   brow: 7,  mouth: 0, out: 'in' },    // crouch
  { f: 16, lift: 22,  sx: .88,  sy: 1.2, armL: 110, armR: -110, wingL: -25, wingR: 25,  eye: 1.12, brow: -6, mouth: 1, out: 'out' },   // take-off
  { f: 24, lift: 150, sx: 1,    sy: 1,   armL: 70,  armR: -70,  wingL: -40, wingR: 40,  eye: 1.05, brow: -4, mouth: 1, out: 'in' },    // top of the jump
  { f: 32, lift: 0,   sx: 1.2,  sy: .78, armL: 15,  armR: -15,  wingL: 10,  wingR: -10, eye: .75,  brow: 4,  mouth: 0, out: 'inout' }, // land
  { f: 40, ...STAND, out: 'inout' },
  { f: 50, ...STAND, out: 'inout' },
];
const EASES = { inout: ease, in: t => t * t, out: t => 1 - (1 - t) * (1 - t) };
const holdKeys = () => stage.dataset.mode === 'keys';

// The pose at frame f: the last key (keys only), or eased towards the next key (in-betweens)
function poseAt(f) {
  let i = KEYS.length - 2;
  while (i > 0 && KEYS[i].f > f) i--;
  const a = KEYS[i], b = KEYS[i + 1];
  if (holdKeys()) return a;
  const t = EASES[a.out]((f - a.f) / (b.f - a.f)), p = {};
  for (const k in a) if (k !== 'out') p[k] = lerp(a[k], b[k], t);
  p.mouth = t < .5 ? a.mouth : b.mouth;
  return p;
}

function showDraig(x, p) {
  $('rig').setAttribute('transform', `translate(200 380) scale(${p.sx} ${p.sy}) translate(-200 -380)`);
  rotatePart('arm-left', p.armL); rotatePart('arm-right', p.armR);
  rotatePart('wing-left', p.wingL); rotatePart('wing-right', p.wingR);
  scalePart('eye-left', 1, p.eye); scalePart('eye-right', 1, p.eye);
  posePart('brows', { dy: p.brow });
  mouth(p.mouth > .5);
  placeDraig(pos, x, FLOOR - p.lift, S);
  groundShadow('shadow', p.lift, S);
}

// An onion-skin ghost: body outline only, placed and squashed like Draig at that frame
function showGhost(el, x, p) {
  el.setAttribute('transform', `translate(${x - 200 * S} ${FLOOR - p.lift - 380 * S}) scale(${S}) translate(200 380) scale(${p.sx} ${p.sy}) translate(-200 -380)`);
}

// ----- Make your own: three draggable keys -----
const handles = [...document.querySelectorAll('.key-h')];
const pts = [{ x: 480, y: 380 }, { x: 600, y: 230 }, { x: 720, y: 380 }];
function drawHandles() {
  handles.forEach((h, i) => h.setAttribute('transform', `translate(${pts[i].x} ${pts[i].y})`));
  $('ownPath').setAttribute('d', `M${pts[0].x} ${pts[0].y} L${pts[1].x} ${pts[1].y} L${pts[2].x} ${pts[2].y} Z`);
}
// Draig goes 1 > 2 > 3 > back to 1, a third of the loop each
function ownAt(f) {
  const seg = Math.min(2, Math.floor(f / (FRAMES / 3))), a = pts[seg], b = pts[(seg + 1) % 3];
  const u = (f - seg * FRAMES / 3) / (FRAMES / 3), t = holdKeys() ? 0 : ease(u);
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), moving: !holdKeys() && u > .05 && u < .95 };
}

const own = () => stage.dataset.own === 'on';
function pose(ms) {
  const f = ms / 40;
  if (own()) {
    const p = ownAt(f);
    showDraig(p.x, { ...STAND, lift: FLOOR - p.y, mouth: p.moving ? 1 : 0, armL: p.moving ? 60 : 0, armR: p.moving ? -60 : 0 });
    return;
  }
  showDraig(X, poseAt(f));
  if (stage.dataset.onion === 'on') {
    showGhost($('ghostPrev'), X, poseAt((f - 2 + FRAMES) % FRAMES));
    showGhost($('ghostNext'), X, poseAt((f + 2) % FRAMES));
  }
}
const redraw = runRig(clock, LOOP, pose);

// Keyframe icons: half squares for hold keys, hourglass halves for eased in-betweens
// (for Draig's jump each key shows its own easing: eased where the motion slows into or out of it)
function showKeyIcons() {
  document.querySelectorAll('#track .key').forEach((k, i) => {
    if (holdKeys()) return setKeyIcon(k, 'hold', 'hold');
    if (own()) return setKeyIcon(k, 'eased', 'eased');
    const prev = KEYS[i - 1], key = KEYS[i];
    const slowsIn = !prev || prev.out !== 'in';          // arriving slowly
    const slowsOut = key.out !== 'out';                   // leaving slowly
    setKeyIcon(k, slowsIn ? 'eased' : 'linear', slowsOut ? 'eased' : 'linear');
  });
}

stage.addEventListener('statechange', e => {
  if (e.detail.attr === 'own') { if (own()) drawHandles(); tl.setKeys(own() ? OWN_KEYS : FIG_KEYS); }
  showKeyIcons(); redraw();
});

// Dragging: screen position to SVG units
function toSvg(e) {
  const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
  return p.matrixTransform(svg.getScreenCTM().inverse());
}
function moveKey(i, x, y) {
  pts[i] = { x: Math.min(760, Math.max(450, x)), y: Math.min(380, Math.max(200, y)) };
  drawHandles(); redraw();
}
let drag = null;
handles.forEach((h, i) => {
  h.addEventListener('pointerdown', e => { drag = i; svg.setPointerCapture(e.pointerId); e.preventDefault(); });
  h.addEventListener('keydown', e => {
    const step = e.shiftKey ? 30 : 10;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!d) return;
    e.preventDefault();
    moveKey(i, pts[i].x + d[0], pts[i].y + d[1]);
  });
});
svg.addEventListener('pointermove', e => { if (drag === null) return; const p = toSvg(e); moveKey(drag, p.x, p.y); });
svg.addEventListener('pointerup', () => drag = null);

showKeyIcons();
