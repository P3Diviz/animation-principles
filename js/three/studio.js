// The standard set for a principle page's 3D view: the stage (floor, fog, render loop),
// key, fill and rim lights at their tuned values, and a camera. Plus loading a bot.
import { createStage } from './stage.js';
import { createLights } from './lights.js';
import { createRig } from './rig.js';

export function studio(stageEl, canvas, { pos = [0, 1.6, 6], look = [0, 1, 0] } = {}) {
  const stage = createStage(stageEl, canvas);
  const lights = createLights(stage.scene);
  stage.camera.position.fromArray(pos);
  stage.camera.lookAt(...look);
  return { stage, lights };
}

// Load a bot and start a clip. The status line says "Loading model…" until it's in,
// then reports any fallback (a missing file) or goes blank.
export async function addBot(stage, status, file, clip, { at = [0, 0, 0], turn = 0, inPlace = false } = {}) {
  status.textContent = 'Loading model…';
  const rig = await createRig(file);
  rig.model.position.fromArray(at);
  rig.model.rotation.y = turn;
  stage.scene.add(rig.model);
  if (clip) await rig.play(clip, { inPlace });
  status.textContent = rig.note;
  return rig;
}
