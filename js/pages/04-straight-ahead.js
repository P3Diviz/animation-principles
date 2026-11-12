// 04 Straight ahead and pose to pose: hold keys vs in-betweens, onion skin, make your own.
import '../core/toggles.js';
import { bindTimeline, setKeyIcon, reducedMotion } from '../core/timeline.js';

const $ = id => document.getElementById(id);
const stage = $('stage'), svg = $('svg');
const FRAMES = 50, MS = 40;
const FIG_KEYS = [0, 10, 16, 24, 32, 40];
const OWN_KEYS = [0, FRAMES / 3, FRAMES * 2 / 3];

const tl = bindTimeline({
  track: $('track'), head: $('head'), tc: $('tc'), play: $('play'),
  getAnims: () => stage.getAnimations({ subtree: true }), frames: FRAMES
});

// Keyframe icons: half squares for hold keys, hourglass halves for eased in-betweens
function showKeyIcons() {
  const shape = stage.dataset.mode === 'keys' ? 'hold' : 'eased';
  document.querySelectorAll('#track .key').forEach(k => setKeyIcon(k, shape, shape));
}

// ----- Make your own: three draggable keys -----
const handles = [...document.querySelectorAll('.key-h')];
const pts = [{ x: 480, y: 380 }, { x: 600, y: 230 }, { x: 720, y: 380 }];
let ownAnim = null;

function drawHandles() {
  handles.forEach((h, i) => h.setAttribute('transform', `translate(${pts[i].x} ${pts[i].y})`));
  $('ownPath').setAttribute('d', `M${pts[0].x} ${pts[0].y} L${pts[1].x} ${pts[1].y} L${pts[2].x} ${pts[2].y} Z`);
}

// The character goes 1 > 2 > 3 > back to 1. Keys only holds; otherwise Easy Ease in-betweens.
function buildOwn() {
  const prev = ownAnim || stage.getAnimations({ subtree: true })[0];
  const t = prev ? prev.currentTime : 0;
  const running = prev ? prev.playState === 'running' : !reducedMotion;
  ownAnim?.cancel();
  const easing = stage.dataset.mode === 'keys' ? 'steps(1, end)' : 'cubic-bezier(.33,0,.67,1)';
  const frames = [...pts, pts[0]].map((p, i) => ({ transform: `translate(${p.x}px, ${p.y}px)`, offset: i / 3, easing }));
  ownAnim = $('ownChar').animate(frames, { duration: FRAMES * MS, iterations: Infinity });
  // Keep everything on the same frame (the flame keeps going alongside)
  stage.getAnimations({ subtree: true }).forEach(a => { a.currentTime = t; running ? a.play() : a.pause(); });
}

function setOwn(on) {
  if (on) { drawHandles(); buildOwn(); tl.setKeys(OWN_KEYS); }
  else { ownAnim?.cancel(); ownAnim = null; tl.setKeys(FIG_KEYS); }
  showKeyIcons();
}

stage.addEventListener('statechange', e => {
  if (e.detail.attr === 'own') setOwn(e.detail.value === 'on');
  if (e.detail.attr === 'mode') { showKeyIcons(); if (ownAnim) buildOwn(); }
});

// Dragging: screen position to SVG units
function toSvg(e) {
  const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
  return p.matrixTransform(svg.getScreenCTM().inverse());
}
function moveKey(i, x, y) {
  pts[i] = { x: Math.min(770, Math.max(440, x)), y: Math.min(380, Math.max(130, y)) };
  drawHandles();
}
let drag = null;
handles.forEach((h, i) => {
  h.addEventListener('pointerdown', e => { drag = i; svg.setPointerCapture(e.pointerId); e.preventDefault(); });
  h.addEventListener('keydown', e => {
    const step = e.shiftKey ? 30 : 10;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!d) return;
    e.preventDefault();
    moveKey(i, pts[i].x + d[0], pts[i].y + d[1]); buildOwn();
  });
});
svg.addEventListener('pointermove', e => { if (drag === null) return; const p = toSvg(e); moveKey(drag, p.x, p.y); });
svg.addEventListener('pointerup', () => { if (drag !== null) { drag = null; buildOwn(); } });

showKeyIcons();
