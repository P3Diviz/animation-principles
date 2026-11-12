// 09 Timing, 3D view. Two demos:
//   Drop: three balls side by side, the same height and size, falling in 36, 14 and 10 frames
//         (balloon, football, bowling ball), with the same drop as the 2D view (js/core/drop.js).
//   Walk: X Bot's Mixamo walk, one cycle in 40, 26 or 16 frames (slow, normal, fast).
// Linear / Gravity and 25 fps / On twos are shared with the 2D view.
import * as THREE from 'three';
import { studio, addBot } from '../three/studio.js';
import { std } from '../three/stage.js';
import { clock3d, clockSeconds } from '../three/view.js';
import { PRESETS, dropCurve } from '../core/drop.js';

const FPS = 25, TOP = 1.9, R = .2;
const WALK = { slow: 40, normal: 26, fast: 16 };          // frames for one walk cycle (two steps)
const BALLS = [
  { preset: PRESETS.balloon,  x: -1.1, mat: std('#D9D9F2', .25) },
  { preset: PRESETS.football, x: 0,    mat: std('#8E8EA0', .55) },
  { preset: PRESETS.bowling,  x: 1.1,  mat: std('#25253A', .15) }
];

export function create({ stageEl, canvas, status }) {
  const { stage } = studio(stageEl, canvas, { pos: [0, 1.25, 4.8], look: [0, .9, 0] });
  const main = document.getElementById('main');
  const clock = clock3d(canvas, 60);
  const balls = BALLS.map(b => ({ ...b, mesh: stage.add(new THREE.SphereGeometry(R, 32, 24), b.mat, b.x, TOP, 0) }));
  const demo = () => main.dataset.demo === 'walk' ? 'walk' : 'drop';

  let rig = null;
  addBot(stage, status, 'XBot', 'Walking', { turn: Math.PI / 2, inPlace: true }).then(r => { rig = r; build(); });

  // Rebuild the timing after any control changes, and hand the timeline its frames and keys
  let curves = [], cycle = WALK.normal;
  function build() {
    const gravity = main.dataset.motion !== 'linear';
    let frames, keys, span;
    if (demo() === 'drop') {
      curves = balls.map(b => dropCurve(b.preset, gravity));
      frames = Math.max(...curves.map(c => c.length));
      keys = [0, ...balls.map(b => b.preset.frames)].sort((a, b) => a - b);
      span = PRESETS.balloon.frames / frames * 100;
    } else {
      cycle = WALK[main.dataset.speed] || WALK.normal;
      frames = cycle; keys = [0, cycle / 2]; span = 100;
    }
    balls.forEach(b => { b.mesh.visible = demo() === 'drop'; });
    if (rig) rig.model.visible = demo() === 'walk';
    clock.effect.updateTiming({ duration: frames * 1000 / FPS });
    view.timeline(frames, keys, span);
  }

  stage.onFrame(() => {
    let f = clockSeconds(clock) * FPS;
    if (main.dataset.rate === 'twos') f = Math.floor(f / 2) * 2;     // each drawing held for two frames
    if (demo() === 'drop') balls.forEach((b, i) => { b.mesh.position.y = TOP - curves[i].at(f) * (TOP - R); });
    else if (rig) rig.setTime(f / cycle * rig.duration);              // one cycle in `cycle` frames
  });

  const view = {
    clock, build,
    show: () => stage.start(), hide: () => stage.stop(),
    timeline() {}                                                     // the page sets this
  };
  build();
  return view;
}
