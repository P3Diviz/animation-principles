// Mixamo bots and clips, loaded straight from FBX (no Blender step). Files live in assets/models/.
//
//   const bot = await createRig('YBot');      // or 'XBot'
//   scene.add(bot.model);
//   await bot.play('Idle');                   // false if the clip file is missing
//   stage.onFrame(dt => bot.update(dt));
//
// Helpers: play(name, { offset }), setTime(t), timeScale(x), stepped(keyTimes), update(dt).
// Fallbacks, so a missing file never breaks a page: no XBot -> Y Bot; no YBot -> a primitive
// mannequin; a missing clip -> the model stands still. bot.note says what happened.
import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { std } from './stage.js';

const MODELS = new URL('../../assets/models/', import.meta.url).href;   // relative to this file
const HEIGHT = 1.8;                                                     // every figure is 1.8 units tall

export const CLAY = std('#C9C9D3', .5);     // --clay: the surface mesh
export const JOINTS = std('#8E8EA0', .5);   // Mixamo bots also have a joints mesh

const loader = new FBXLoader();
const files = {};
function loadFile(name) {
  files[name] ??= new Promise((resolve, reject) => loader.load(MODELS + name + '.fbx', resolve, undefined, reject));
  return files[name];
}

// Each clip file (Without Skin) holds one animation. It's named after its file and plays on
// either bot, because both share the Mixamo skeleton.
const clips = {};
export function loadClip(name) {
  clips[name] ??= loadFile(name).then(f => {
    const clip = f.animations[0];
    if (!clip) throw new Error(name + '.fbx has no animation');
    clip.name = name;
    return clip;
  });
  return clips[name];
}

// Load a bot, scale it to 1.8 units tall (Mixamo exports in centimetres) and dress it in clay.
export async function loadBot(name) {
  const model = cloneSkinned(await loadFile(name));    // a copy, so the same file can be used twice
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  model.scale.setScalar(HEIGHT / size.y);
  model.position.y = -box.min.y * model.scale.y;
  model.traverse(o => {
    if (!o.isMesh) return;
    o.material = /joint/i.test(o.name) ? JOINTS : CLAY;
    o.castShadow = o.receiveShadow = true;
  });
  const holder = new THREE.Group();                    // move and turn the holder, not the model
  holder.add(model);
  return holder;
}

// Stand-in figure made of capsules, used when YBot.fbx is missing.
export function mannequin() {
  const g = new THREE.Group();
  const part = (geo, x, y, rz = 0) => {
    const m = new THREE.Mesh(geo, CLAY);
    m.position.set(x, y, 0); m.rotation.z = rz;
    m.castShadow = m.receiveShadow = true;
    g.add(m); return m;
  };
  const torso = part(new THREE.CapsuleGeometry(.3, .6, 8, 24), 0, 1.55);
  part(new THREE.SphereGeometry(.26, 32, 32), 0, 2.38);
  [-.16, .16].forEach(x => part(new THREE.CapsuleGeometry(.1, .8, 6, 16), x, .55));
  part(new THREE.CapsuleGeometry(.08, .7, 6, 16), -.48, 1.6, .3);
  part(new THREE.CapsuleGeometry(.08, .7, 6, 16), .48, 1.6, -.3);
  g.scale.setScalar(HEIGHT / 2.64);                     // built 2.64 tall
  const holder = new THREE.Group();
  holder.add(g);
  return { holder, torso };
}

export async function createRig(name) {
  let model = null, torso = null, note = '';
  try { model = await loadBot(name); }
  catch (e) {
    if (name !== 'YBot') {
      try { model = await loadBot('YBot'); note = name + '.fbx not found: Y Bot used'; } catch (e2) {}
    }
  }
  if (!model) { ({ holder: model, torso } = mannequin()); note = 'Stand-in mannequin (no YBot.fbx)'; }

  const mixer = new THREE.AnimationMixer(model);
  let action = null, time = 0, scale = 1, keys = null;

  const rig = {
    model, mixer, note,
    get duration() { return action ? action.getClip().duration : 0; },

    // Start a clip. Resolves false (and the model stands still) if the file is missing.
    async play(clipName, { offset = 0 } = {}) {
      if (torso) return false;                          // the mannequin has no skeleton
      try {
        const clip = await loadClip(clipName);
        action?.stop();
        action = mixer.clipAction(clip);
        action.play();
        rig.setTime(offset);
        return true;
      } catch (e) {
        rig.note = clipName + '.fbx not found: model shown without animation';
        return false;
      }
    },

    setTime(t) {
      time = t;
      const d = rig.duration;
      let shown = d ? ((t % d) + d) % d : t;
      if (keys) shown = keys.filter(k => k <= shown + 1e-6).pop() ?? keys[0];   // blocking: hold the last key
      mixer.setTime(shown);
    },
    timeScale(x) { scale = x; },
    stepped(keyTimes) { keys = keyTimes ? [...keyTimes].sort((a, b) => a - b) : null; rig.setTime(time); },

    update(dt) {
      time += dt * scale;
      if (action) rig.setTime(time);
      if (torso) {                                      // the mannequin breathes instead
        const s = 1 + Math.sin(time * 1.4) * .015;
        torso.scale.set(s, 1, s);
      }
    }
  };
  return rig;
}
