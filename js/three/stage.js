// Shared 3D stage: renderer, scene, floor, camera, resizing and the render loop.
// Split out of docs/reference/03-staging-3d-approved.html. The fog and floor values are tuned
// and screenshot-checked there: keep them.
//
//   const stage = createStage(containerEl, canvasEl);
//   stage.onFrame(dt => { ... });   // runs before every render
//   stage.start();                  // when the 3D view is shown
//   stage.stop();                   // when it's hidden (the loop also pauses while the tab is hidden)
import * as THREE from 'three';

export const BG = new THREE.Color('#0A0A15');     // --bg: 3D background
export const PALE = new THREE.Color('#E9E9F2');   // silhouette test ground

// Learners who ask for reduced motion: demos hold still and camera moves snap.
export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// A plain lit material: clay for models, props, the floor.
export const std = (color, roughness = .6) => new THREE.MeshStandardMaterial({ color, roughness });

export function createStage(container, canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;   // r170: output colour space is sRGB by default

  const scene = new THREE.Scene();
  scene.background = BG.clone();
  scene.fog = new THREE.Fog(BG.clone(), 9, 24);         // the floor fades into the background: no hard horizon
  const camera = new THREE.PerspectiveCamera(35, 1, .1, 100);

  // Add a mesh that casts and receives shadows.
  function add(geometry, material, x = 0, y = 0, z = 0, parent = scene) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  const floor = add(new THREE.PlaneGeometry(40, 40), std('#181826', .95));
  floor.rotation.x = -Math.PI / 2;
  floor.castShadow = false;

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;                                 // hidden: nothing to size
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const resizer = new ResizeObserver(resize);
  resizer.observe(container);

  // Render loop. It only runs while the 3D view is wanted and the tab is visible.
  const clock = new THREE.Clock(false);
  const frameFns = [];
  let wanted = false;

  function tick() {
    const dt = Math.min(clock.getDelta(), .1);           // no big jump after a pause
    frameFns.forEach(fn => fn(dt));
    renderer.render(scene, camera);
  }
  function run() {
    const go = wanted && !document.hidden;
    if (go && !clock.running) { clock.start(); renderer.setAnimationLoop(tick); }
    if (!go && clock.running) { clock.stop(); renderer.setAnimationLoop(null); }
  }
  document.addEventListener('visibilitychange', run);

  return {
    renderer, scene, camera, floor, add,
    onFrame(fn) { frameFns.push(fn); },
    start() { wanted = true; resize(); run(); },
    stop() { wanted = false; run(); },
    dispose() {
      wanted = false; run();
      document.removeEventListener('visibilitychange', run);
      resizer.disconnect();
      scene.traverse(o => {
        o.geometry?.dispose();
        [].concat(o.material || []).forEach(m => m.dispose());
      });
      renderer.dispose();
    }
  };
}
