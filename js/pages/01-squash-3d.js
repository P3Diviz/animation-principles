// 01 Squash and stretch, 3D view: a ball bouncing on the floor.
// The volume stays exactly the same: the ball is squashed to sy of its height and widened to
// 1 / √sy in both other directions, so sx × sy × sz = 1.
// It only squashes while it touches the floor: its lowest point stays down for a short contact,
// it is flattest in the middle of it and leaves round. In the air it stretches with its speed.
// Each material moves in its own way (Paul: the bowling ball needs weight, the water balloon
// shouldn't go perfectly round in the air):
//   rubber   the 2D ball's eased bounce (Paul: "the motion is good")
//   bowling  gravity: it speeds up into the floor and hits hard; a very short contact, a lower,
//            quicker bounce
//   water    gravity, a long contact as it spreads out, and a wobble that carries on in the air
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

// How each material moves. frames: one whole bounce. rise: how high, against the rubber ball.
// contact: frames on the floor either side of the flattest moment, at 100% (it shortens with the
// amount, so a ball with no squash just touches). wobble: how far the water balloon keeps
// changing shape in the air.
export const MOTION = {
  rubber:  { frames: 25, rise: 1,   curve: 'ease',    contact: 1.5, wobble: 0 },
  bowling: { frames: 18, rise: .45, curve: 'gravity', contact: 1,   wobble: 0 },
  water:   { frames: 34, rise: .7,  curve: 'gravity', contact: 4,   wobble: .08 }
};
const STRETCH = .15;                 // the most it stretches at speed, at 100% (the 2D ball's 1.15)

// Height in the air, q = 0 leaving the floor .. 1 at the top, and speed there (1 = fastest)
const CURVES = {
  ease:    { h: q => ease(q), v: q => (ease(q + .01) - ease(q - .01)) / .02 / 2.29 },   // 2.29: ease's steepest slope (measured)
  gravity: { h: q => 1 - (1 - q) * (1 - q), v: q => 1 - q }   // fast off the floor, hangs at the top
};

// The ball at progress p (0 = the flattest moment on the floor .. 1 = the top; the loop runs
// up then down) and amount (0 .. 1.5), for one material: its scale and the height of its centre.
export function ballPose(p, amount, look = 'rubber') {
  const m = MOTION[look] || MOTION.rubber;
  const c = m.contact * Math.min(1, amount) / (m.frames / 2);   // contact, as a share of the half bounce
  let sy, bottom;
  if (p < c) {
    // On the floor: flattest at p = 0, back to round as it leaves at p = c
    sy = 1 - .5 * amount * Math.cos(Math.PI / 2 * p / c);
    bottom = 0;
  } else {
    // In the air: stretched by its speed (building up just after it leaves), plus the water wobble
    const q = (p - c) / (1 - c), curve = CURVES[m.curve];
    const v = Math.max(0, Math.min(1, curve.v(Math.min(q, .99))));
    sy = 1 + STRETCH * amount * v * THREE.MathUtils.smoothstep(q, 0, .15);
    // 1¾ wobbles on the way up, so at the top it is still wider than it is tall
    sy *= 1 + m.wobble * amount * Math.exp(-q * .5) * Math.sin(q * Math.PI * 3.5);
    bottom = RISE * m.rise * curve.h(q);
  }
  return { sy, sxz: 1 / Math.sqrt(sy), y: bottom + R * sy };
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

  let look = 'rubber', frames = MOTION.rubber.frames;
  const clock = clock3d(canvas, frames);

  stage.onFrame(() => {
    // Where we are in the bounce: 0 at contact, 1 at the top (the loop is up then down)
    const t = clockSeconds(clock) / (frames / 25);       // 0 .. 1 through the whole loop
    const p = t < .5 ? t * 2 : 2 - t * 2;
    const amount = dom.dataset.squash === 'off' ? 0 : amountInput.value / 100;
    const { sy, sxz, y } = ballPose(p, amount, look);
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
    // A preset sets the ball's surface and how it moves, including the bounce's length (frames)
    setLook(name) {
      look = MOTION[name] ? name : 'rubber';
      ball.material = LOOKS[look];
      frames = MOTION[look].frames;
      clock.effect.updateTiming({ duration: frames * 1000 / 25 });
    },
    show: () => stage.start(),
    hide: () => stage.stop()
  };
}
