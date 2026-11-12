// 02 Anticipation, 3D view: Y Bot's Mixamo Jump. Loaded by 02-anticipation.js the first time 3D is picked.
// The Wind-up slider and Off/On (shared with the 2D view) change only the crouch:
//   - its length: none (Off) cuts straight from standing to the moment the legs drive up
//     (JUMP.anticipationEnd), so learners see the identical jump with and without it;
//   - its depth: smaller below 100%, deeper above (every joint's bend from standing is scaled).
// Everything after the crouch is the clip as it is.
import { studio, addBot } from '../three/studio.js';
import { capturePose, scalePose, feetHeight } from '../three/poses.js';
import { clock3d, clockSeconds } from '../three/view.js';
import { JUMP } from '../three/clips.js';

export const FRAMES = 80;   // 3.2 s: room for the biggest wind-up
const FPS = 25;
const $ = id => document.getElementById(id);
const clamp = t => Math.max(0, Math.min(1, t));
const lerp = (a, b, t) => a + (b - a) * t;

export function create({ stageEl, canvas, status }) {
  const { stage } = studio(stageEl, canvas, { pos: [2.4, 1.35, 4.4], look: [0, .9, 0] });
  const clock = clock3d(canvas, FRAMES);
  const settings = $('stage');
  const wind = () => settings.dataset.anticipation === 'off' ? 0 : +$('wind').value / 100;   // 0 .. 2

  // Real time (s) -> clip time, and how deep the crouch is at that moment
  function timing(s, w) {
    const crouch = (JUMP.anticipationEnd - JUMP.standEnd) * w;      // seconds the crouch takes
    if (s < JUMP.standEnd) return { clip: s, depth: 1 };
    if (s < JUMP.standEnd + crouch) {
      const clip = lerp(JUMP.standEnd, JUMP.anticipationEnd, (s - JUMP.standEnd) / crouch);
      const d = w <= 1 ? w : 1 + .5 * (w - 1);                       // huge: up to half as deep again
      // back to the real pose by the end of the crouch, so the jump itself is untouched
      return { clip, depth: lerp(d, 1, clamp((clip - JUMP.deepest) / (JUMP.anticipationEnd - JUMP.deepest))) };
    }
    return { clip: Math.min(JUMP.anticipationEnd + s - JUMP.standEnd - crouch, 2.16), depth: 1 };
  }

  let rig = null, stand = null, restFeet = 0;
  addBot(stage, status, 'YBot', 'Jump', { turn: -.55 }).then(r => {
    if (!r.bones.length) return;
    rig = r;
    rig.setTime(0); stand = capturePose(rig); restFeet = feetHeight(rig);
  });

  stage.onFrame(() => {
    if (!rig) return;
    const { clip, depth } = timing(clockSeconds(clock), wind());
    rig.model.position.y = 0;
    rig.setTime(clip);
    if (depth !== 1) {
      scalePose(rig, stand, depth);
      rig.model.position.y = restFeet - feetHeight(rig);           // keep the feet on the floor while crouching
    }
  });

  return {
    clock, frames: FRAMES,
    show: () => stage.start(), hide: () => stage.stop(),
    // Timeline keys (frames): end of standing, deepest crouch, take-off, top, landing
    keys() {
      const w = wind(), a = JUMP.standEnd + (JUMP.anticipationEnd - JUMP.standEnd) * w;
      const deep = JUMP.standEnd + (JUMP.deepest - JUMP.standEnd) * w;
      return [JUMP.standEnd, deep, a + JUMP.takeOff - JUMP.anticipationEnd, a + JUMP.top - JUMP.anticipationEnd, a + JUMP.land - JUMP.anticipationEnd]
        .map(t => Math.round(t * FPS));
    },
    // The wind-up, highlighted on the timeline: [left, width] in % of the loop
    span() {
      const w = wind();
      return [JUMP.standEnd * FPS / FRAMES * 100, (JUMP.anticipationEnd - JUMP.standEnd) * w * FPS / FRAMES * 100];
    }
  };
}
