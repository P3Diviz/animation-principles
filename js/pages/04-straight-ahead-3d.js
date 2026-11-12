// 04 Pose to pose, 3D view: X Bot's Mixamo Jump, the way animators block in 3D.
// Keys only: the mixer is set only to the key times and held (stepped), like blocking.
// Keys and in-betweens: the clip plays normally (splined).
// Onion skin: two pale ghosts show the pose two frames before and two frames after.
import * as THREE from 'three';
import { studio, addBot } from '../three/studio.js';
import { createRig } from '../three/rig.js';
import { clock3d, clockSeconds } from '../three/view.js';
import { JUMP_KEYS } from '../three/clips.js';

export const FRAMES = 65;                                  // 2.6 s: the jump, then a short hold
export const KEYS = JUMP_KEYS.map(t => Math.round(t * 25));
const GAP = 2 / 25;                                        // onion skin: two frames either side

const GHOST = new THREE.MeshStandardMaterial({ color: '#E4E4F2', roughness: .6, transparent: true, opacity: .22, depthWrite: false });

export function create({ stageEl, canvas, status }) {
  const { stage } = studio(stageEl, canvas, { pos: [2.6, 1.4, 4.6], look: [0, .95, 0] });
  const clock = clock3d(canvas, FRAMES);
  const settings = document.getElementById('stage');
  const turn = -.5;

  let rig = null;
  const ghosts = [];
  addBot(stage, status, 'XBot', 'Jump', { turn }).then(r => { rig = r; apply(); });

  // The ghosts are two more copies of the bot, see-through
  Promise.all([0, 1].map(async () => {
    const g = await createRig('XBot');
    g.model.rotation.y = turn;
    g.model.traverse(o => { if (o.isMesh) { o.material = GHOST; o.castShadow = false; o.receiveShadow = false; } });
    g.model.visible = false;
    stage.scene.add(g.model);
    await g.play('Jump');
    return g;
  })).then(list => { ghosts.push(...list); apply(); });

  function apply() {
    const block = settings.dataset.mode === 'keys' ? JUMP_KEYS : null;
    [rig, ...ghosts].forEach(r => r?.stepped(block));
    ghosts.forEach(g => { g.model.visible = settings.dataset.onion === 'on'; });
  }
  settings.addEventListener('statechange', apply);

  stage.onFrame(() => {
    const s = Math.min(clockSeconds(clock), rig?.duration - .01 || 0);   // hold the last pose to the end of the loop
    rig?.setTime(s);
    if (ghosts.length && ghosts[0].model.visible) {
      ghosts[0].setTime(Math.max(0, s - GAP));
      ghosts[1].setTime(Math.min(rig.duration - .01, s + GAP));
    }
  });

  return { clock, frames: FRAMES, keys: KEYS, show: () => stage.start(), hide: () => stage.stop() };
}
