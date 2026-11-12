// 02 Anticipation: Draig jumps onto a box, or throws a ball. Wind-up slider.
// 50 frames (2 s). Frame 8-18 wind-up, 20 take-off (or 24 release), then the action.
import '../core/toggles.js';
import { showSlider } from '../core/sliders.js';
import { bindTimeline } from '../core/timeline.js';
import { scalePart, rotatePart, posePart, mouth, placeDraig, groundShadow, rigClock, runRig, toScene, ease, span, lerp } from '../core/draig.js';
import { bindView, handOver } from '../three/view.js';

const $ = id => document.getElementById(id);
const stage = $('stage'), scene = $('scene'), pos = $('draigPos'), ball = $('ball');
const LOOP = 2000, S = .4;               // Draig at 40%: about 168 units tall
const FLOOR = 330, BOX = 250;
const clock = rigClock($('clock'), LOOP);
let view3d = null;                       // the 3D view while it's showing (02-anticipation-3d.js)

const tl = bindTimeline({
  track: $('track'), head: $('head'), tc: $('tc'), play: $('play'),
  getAnims: () => [view3d ? view3d.clock : clock], frames: 50
});

// How big the wind-up is: 0 (none, same as Off) to 2 (huge)
const wind = () => stage.dataset.anticipation === 'off' ? 0 : +$('wind').value / 100;

// The rig's whole-body pose: squash about the feet, plus a lean
function body(sx, sy, lean = 0) {
  $('rig').setAttribute('transform', `rotate(${lean} 200 380) translate(200 380) scale(${sx} ${sy}) translate(-200 -380)`);
}
function rest() {
  ['arm-left', 'arm-right', 'wing-left', 'wing-right', 'tail', 'brows', 'face'].forEach(id => $(id).removeAttribute('transform'));
  scalePart('eye-left', 1); scalePart('eye-right', 1); mouth(false);
}

// ----- Jump onto the box -----
function jump(f, w) {
  rest();
  let x = 200, y = FLOOR, sx = 1, sy = 1, opacity = 1;
  const c = ease(span(f, 8, 18)) * w;                 // the crouch, 0 .. 2
  if (f < 20) {
    x = 200 - 18 * Math.min(c, 1);                     // a small move back, the opposite way
    sx = 1 + .12 * c; sy = 1 - .22 * c;
    rotatePart('arm-left', -18 * c); rotatePart('arm-right', 18 * c);
    rotatePart('wing-left', 12 * c); rotatePart('wing-right', -12 * c);
    scalePart('eye-left', 1, 1 - .3 * Math.min(c, 1.5)); scalePart('eye-right', 1, 1 - .3 * Math.min(c, 1.5));
    posePart('brows', { dy: 6 * c });
    if (f >= 18) {                                     // frames 18-20: spring up, stretched
      const u = span(f, 18, 20);
      sx = lerp(sx, .9, u); sy = lerp(sy, 1.2, u);
      rotatePart('arm-left', lerp(-18 * c, 110, u)); rotatePart('arm-right', lerp(18 * c, -110, u));
      mouth(u > .5);
    }
  } else if (f < 32) {                                 // frames 20-32: the jump, a parabola onto the box
    const p = span(f, 20, 32), x0 = 200 - 18 * Math.min(w, 1);
    x = lerp(x0, 540, p);
    y = lerp(FLOOR, BOX, p) - 4 * 130 * p * (1 - p);
    sx = lerp(.9, 1, Math.min(1, p * 2)); sy = lerp(1.2, 1, Math.min(1, p * 2));
    rotatePart('arm-left', lerp(110, 50, p)); rotatePart('arm-right', lerp(-110, -50, p));
    rotatePart('wing-left', -30 * Math.sin(p * Math.PI)); rotatePart('wing-right', 30 * Math.sin(p * Math.PI));
    mouth(true);
  } else {                                             // land on the box, settle, then loop
    x = 540; y = BOX;
    const l = span(f, 32, 37);
    sx = lerp(1.14, 1, ease(l)); sy = lerp(.8, 1, ease(l));
    rotatePart('arm-left', lerp(50, 0, l)); rotatePart('arm-right', lerp(-50, 0, l));
    opacity = f < 44 ? 1 : f < 47 ? 1 - span(f, 44, 47) : 0;
    if (f >= 48) { x = 200; y = FLOOR; opacity = span(f, 48, 50); sx = sy = 1; }
  }
  body(sx, sy);
  placeDraig(pos, x, y, S);
  const ground = x > 470 ? BOX : FLOOR;
  groundShadow('shadow', ground - y, S);
  pos.setAttribute('opacity', opacity);
}

// ----- Throw -----
// The ball leaves his hand at frame 24. That pose doesn't depend on the wind-up,
// so the release point is worked out once.
let release = null;
function handPoint() { return toScene(scene, $('arm-right').querySelector('g ellipse:nth-child(2)'), 302, 330); }
function throwPose(f, w) {
  rest();
  const c = ease(span(f, 8, 20)) * w;
  // Wind-up: lean away from the throw and raise the throwing arm high (his arms are too short to go over his head)
  const back = -40 - 110 * Math.min(c, 1.2);
  let lean = -8 * c, arm = back;
  if (f >= 20) {
    const u = ease(span(f, 20, 24)), v = ease(span(f, 24, 32)), r = ease(span(f, 32, 42));
    lean = lerp(lerp(-8 * c, 9, u), 0, r);
    arm = f < 24 ? lerp(back, -60, u) : f < 32 ? lerp(-60, -15, v) : lerp(-15, 0, r);
    mouth(f >= 22 && f < 30);
  }
  if (f < 20) { scalePart('eye-left', 1, 1 - .25 * Math.min(c, 1.5)); scalePart('eye-right', 1, 1 - .25 * Math.min(c, 1.5)); }
  rotatePart('arm-right', arm); rotatePart('arm-left', 10 * c);
  body(1, 1, lean);
  placeDraig(pos, 230, FLOOR, S);
  groundShadow('shadow', 0, S);
  pos.setAttribute('opacity', 1);

  // The ball: in his hand until frame 24, then a throw to the right, landing at frame 40
  let p, op = 1;
  if (f < 24) p = handPoint();
  else {
    const q = span(f, 24, 40);
    p = { x: lerp(release.x, 760, q), y: lerp(release.y, 320, q) - 4 * 70 * q * (1 - q) };
    op = f < 44 ? 1 : 1 - span(f, 44, 48);
  }
  ball.setAttribute('cx', p.x); ball.setAttribute('cy', p.y); ball.setAttribute('opacity', op);
}

function pose(ms) {
  const f = ms / 40, w = wind();
  if (stage.dataset.action === 'throw') throwPose(f, w); else jump(f, w);
}
throwPose(23.99, 1); release = handPoint();   // the last moment the ball is in his hand
const redraw = runRig(clock, LOOP, pose);

// ----- Controls -----
const ACTIONS = {
  jump:  { keys: [8, 18, 20, 26, 32], windUp: 18 },
  throw: { keys: [8, 20, 24, 30, 40], windUp: 20 },
};
// The timeline's keys and wind-up highlight, for whichever view is showing
function showKeys() {
  if (view3d) {
    const [left, width] = view3d.span();
    tl.setKeys(view3d.keys());
    $('span').style.left = left + '%'; $('span').style.width = width + '%';
    return;
  }
  const a = ACTIONS[stage.dataset.action];
  tl.setKeys(a.keys);
  // Highlight the wind-up on the timeline: from frame 8 to the biggest wind-up pose
  $('span').style.left = '16%'; $('span').style.width = ((a.windUp - 8) / 50 * 100) + '%';
}
$('wind').addEventListener('input', () => { showSlider($('wind')); redraw(); if (view3d) showKeys(); });
stage.addEventListener('statechange', e => {
  if (e.detail.attr === 'action' || view3d) showKeys();
  redraw();
});

// 2D / 3D: the timeline follows the clock of the view on screen
bindView(() => import('./02-anticipation-3d.js'), {
  onSwitch(is3d, v) {
    view3d = is3d ? v : null;
    if (is3d) handOver([clock], [v.clock]); else if (v) handOver([v.clock], [clock]);
    tl.setFrames(is3d ? v.frames : 50);
    showKeys();
  }
});
