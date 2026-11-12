// Silhouette test: every mesh turns black on a pale ground, so learners judge the pose by its shape alone.
// The fog is recoloured too, otherwise the floor fades to dark at the back.
// Call refresh() after adding models while the test is on.
import * as THREE from 'three';
import { BG, PALE } from './stage.js';

const BLACK = new THREE.MeshBasicMaterial({ color: '#05050A' });
const GROUND = new THREE.MeshBasicMaterial({ color: '#E9E9F2' });

export function createSilhouette(stage) {
  const originals = new Map();
  let on = false;

  function apply() {
    stage.scene.traverse(o => {
      if (!o.isMesh) return;
      if (!originals.has(o)) originals.set(o, o.material);
      o.material = on ? (o === stage.floor ? GROUND : BLACK) : originals.get(o);
    });
    stage.scene.background.copy(on ? PALE : BG);
    stage.scene.fog.color.copy(on ? PALE : BG);
  }

  return {
    get on() { return on; },
    set(value) { on = value; apply(); },
    refresh: apply
  };
}
