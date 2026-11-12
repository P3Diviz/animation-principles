// 10 Exaggeration, 3D view: Y Bot's Mixamo Jump with an exaggeration factor.
// After the mixer poses him, every joint's turn away from his standing pose is scaled by k
// (js/three/poses.js), and so is the hips' movement: a deeper crouch, a bigger reach,
// a higher jump. The Realism to cartoon slider (shared with 2D) sets k:
//   0% (realistic): k = 1, the jump as it was captured;  100%: k = 1.6;  150% (too far): k = 1.9.
// While a foot is on the floor the figure is lifted or lowered to keep it there.
import { studio, addBot } from '../three/studio.js';
import { capturePose, scalePose, feetHeight } from '../three/poses.js';
import { clock3d, clockSeconds } from '../three/view.js';
import { JUMP } from '../three/clips.js';

export const FRAMES = 68;                                 // 2.7 s: the jump, then a short hold
export const KEYS = [JUMP.deepest, JUMP.takeOff, JUMP.top, JUMP.land].map(t => Math.round(t * 25));
const $ = id => document.getElementById(id);
const lerp = (a, b, t) => a + (b - a) * t;

export function create({ stageEl, canvas, status }) {
  const { stage } = studio(stageEl, canvas, { pos: [2.4, 1.4, 4.4], look: [0, 1, 0] });
  const clock = clock3d(canvas, FRAMES);
  const amount = $('amount');
  const factor = () => 1 + amount.value / 100 * .6;

  let rig = null, stand = null, restFeet = 0, atTakeOff = 0, atLand = 0;

  // The lift that keeps the feet on the floor, worked out for a moment of the clip
  function footFix(t, k) {
    rig.model.position.y = 0;
    rig.setTime(t); scalePose(rig, stand, k);
    return restFeet - feetHeight(rig);
  }
  // In the air the lift blends from its take-off value to its landing value, so nothing jumps
  function prepare() {
    if (!rig) return;
    const k = factor();
    atTakeOff = footFix(JUMP.takeOff, k);
    atLand = footFix(JUMP.land, k);
  }

  addBot(stage, status, 'YBot', 'Jump', { turn: -.55 }).then(r => {
    if (!r.bones.length) return;
    rig = r;
    rig.setTime(0); stand = capturePose(rig); restFeet = feetHeight(rig);
    prepare();
  });
  amount.addEventListener('input', prepare);
  document.querySelectorAll('#presets button').forEach(b => b.addEventListener('click', prepare));

  stage.onFrame(() => {
    if (!rig) return;
    const t = Math.min(clockSeconds(clock), rig.duration - .01), k = factor();
    const inAir = t > JUMP.takeOff && t < JUMP.land;
    const lift = inAir ? lerp(atTakeOff, atLand, (t - JUMP.takeOff) / (JUMP.land - JUMP.takeOff)) : footFix(t, k);
    rig.model.position.y = 0;
    rig.setTime(t); scalePose(rig, stand, k);
    rig.model.position.y = lift;
  });

  return { clock, frames: FRAMES, keys: KEYS, show: () => stage.start(), hide: () => stage.stop() };
}
