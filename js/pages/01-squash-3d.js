// 01 Squash and stretch, 3D view: a clay ball bouncing on the floor.
// It keeps the 2D ball's timing exactly (css/pages/01.css): one bounce runs from contact up to
// the top and back down again, the height eased with CSS "ease", and the shape keyed at the same
// points (contact, 10%, 30%, 40% of the way up). What's new in 3D is that the volume stays exactly
// the same: the ball is squashed to sy of its height and widened to 1 / √sy in both other
// directions, so sx × sy × sz = 1.
// The 2D page's controls drive it: Off / On, Amount, the material presets and Volume check.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { studio } from '../three/studio.js';
import { std } from '../three/stage.js';
import { clock3d, clockSeconds } from '../three/view.js';
import { evaluate } from '../core/bezier.js';

const R = .3;                  // ball radius (0.6 m across)
const RISE = 2 * R * 248 / 160; // how high its lowest point rises: the 2D ball rises 248 px and is 160 px across
const EASE = [.25, .1, .25, 1];
const ease = t => evaluate(EASE, Math.min(1, Math.max(0, t)));   // CSS "ease", as in the 2D keyframes

// The surface for each preset (the same three looks as the balls on 09 Timing)
const LOOKS = {
  rubber:  std('#C9C9D3', .5),
  bowling: std('#25253A', .15),
  water:   std('#D9D9F2', .25)
};

// The ball's height scale through one half-bounce, from the 2D keyframes:
// [progress from contact (0) to the top (1), sy at amount 1]. Each step is eased, as CSS does.
const SHAPE = [[0, .5], [.1, .7], [.3, 1.15], [.4, 1], [1, 1]];
function squash(p, amount) {
  let i = 0;
  while (i < SHAPE.length - 2 && p > SHAPE[i + 1][0]) i++;
  const [p0, s0] = SHAPE[i], [p1, s1] = SHAPE[i + 1];
  const k = ease((p - p0) / (p1 - p0));
  const s = s0 + (s1 - s0) * k;              // sy at amount 1
  return 1 + (s - 1) * amount;               // amount scales how far it moves from round
}

// The ball at progress p (0 contact .. 1 top) and amount (0 .. 1.5): its scale and the height of
// its centre. Its lowest point is on the floor at contact and rises with the 2D ball's ease.
export function ballPose(p, amount) {
  const sy = squash(p, amount);
  return { sy, sxz: 1 / Math.sqrt(sy), y: RISE * ease(p) + R * sy };
}

// The volume check: a dashed circle the size of the ball at rest, always facing the camera.
// WebGL lines are one pixel thin, so the dashes are thin flat rings instead.
function dashedCircle() {
  const dashes = [], n = 36, w = .008;
  for (let i = 0; i < n; i++) dashes.push(new THREE.RingGeometry(R - w / 2, R + w / 2, 4, 1, i / n * Math.PI * 2, Math.PI / n));
  const mat = new THREE.MeshBasicMaterial({ color: '#F5F5F7', transparent: true, opacity: .7, depthTest: false, fog: false });
  const ring = new THREE.Mesh(mergeGeometries(dashes), mat);
  ring.renderOrder = 1;                      // drawn over the ball, like the 2D outline
  return ring;
}

export function create({ stageEl, canvas, status }) {
  const { stage } = studio(stageEl, canvas, { pos: [.7, 1.15, 3.3], look: [0, .74, 0] });
  const dom = document.getElementById('stage');          // the 2D stage holds the shared state
  const amountInput = document.getElementById('amount');
  status.textContent = '';

  const ball = stage.add(new THREE.SphereGeometry(R, 48, 32), LOOKS.rubber);
  const ring = dashedCircle();
  stage.scene.add(ring);

  let frames = 25;
  const clock = clock3d(canvas, frames);

  stage.onFrame(() => {
    // Where we are in the bounce: 0 at contact, 1 at the top (the loop is up then down)
    const t = clockSeconds(clock) / (frames / 25);       // 0 .. 1 through the whole loop
    const p = t < .5 ? t * 2 : 2 - t * 2;
    const amount = dom.dataset.squash === 'off' ? 0 : amountInput.value / 100;
    const { sy, sxz, y } = ballPose(p, amount);
    ball.scale.set(sxz, sy, sxz);
    ball.position.y = y;
    // The outline of the round ball shares its centre, but never dips through the floor
    ring.visible = dom.dataset.volume === 'on';
    ring.position.set(0, Math.max(ball.position.y, R), 0);
    ring.quaternion.copy(stage.camera.quaternion);
  });

  return {
    clock,
    get frames() { return frames; },
    keys: () => [0, frames / 2],
    // The presets change the bounce's length (frames) and the ball's surface
    setFrames(n) { frames = n; clock.effect.updateTiming({ duration: n * 1000 / 25 }); },
    setLook(name) { ball.material = LOOKS[name] || LOOKS.rubber; },
    show: () => stage.start(),
    hide: () => stage.stop()
  };
}
