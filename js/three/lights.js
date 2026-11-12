// Key, fill and rim lights, and the light plot (a top-down SVG plan) that drives them.
// r155+ uses physically based light units: these values are tuned by eye for r170 in
// docs/reference/03-staging-3d-approved.html. Keep them.
//
// Each light sits on a circle round a focus point (the subject) at an angle (azimuth) and a height.
// Angles are measured in the plan: 0 = to the right, PI/2 = towards the camera.
import * as THREE from 'three';

export const WORLD_R = 6;    // light circle radius in the scene
export const PLOT_R = 72;    // the same circle in the plot's viewBox
const S = PLOT_R / WORLD_R;  // scene units -> plot units

export function createLights(scene) {
  scene.add(new THREE.AmbientLight('#ffffff', .08));
  const lights = {
    key:  { light: new THREE.DirectionalLight('#FFF0DC', 3.2), angle: .9, height: 5 },
    fill: { light: new THREE.DirectionalLight('#A9B6FF', .7), angle: 2.5, height: 2.5 },
    rim:  { light: new THREE.DirectionalLight('#9999FF', 6), angle: Math.PI + .35, height: 4 }
  };
  Object.values(lights).forEach(l => scene.add(l.light, l.light.target));

  const key = lights.key.light;
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5 });
  key.shadow.bias = -.0005;

  const focus = new THREE.Vector3();

  function place(name) {
    const l = lights[name];
    l.light.position.set(focus.x + Math.cos(l.angle) * WORLD_R, l.height, focus.z + Math.sin(l.angle) * WORLD_R);
    l.light.target.position.copy(focus);
  }
  const placeAll = () => Object.keys(lights).forEach(place);
  placeAll();

  return {
    lights, focus,
    setAngle(name, angle) { lights[name].angle = angle; place(name); },
    setOn(name, on) { lights[name].light.visible = on; },
    setFocus(v) { focus.copy(v); placeAll(); }       // re-aim every light at a new subject
  };
}

// Wire the plot SVG to the lights. The plot needs #ring (the dashed circle), #lamps holding
// #lamp-key, #lamp-fill, #lamp-rim (each a <line> and a <circle>), and .wedge (the camera).
// Lamps are dragged round the circle, or moved with the arrow keys once focused.
// enable(false) puts the plot back exactly as the HTML drew it (the 2D view uses it as a static plan).
export function bindLightPlot(plot, rig, onMove = () => {}) {
  const ring = plot.querySelector('#ring');
  const lampsGroup = plot.querySelector('#lamps');
  const wedge = plot.querySelector('.wedge');
  const names = Object.keys(rig.lights);
  const lamp = Object.fromEntries(names.map(n => [n, plot.querySelector('#lamp-' + n)]));
  const original = { wedge: wedge.getAttribute('d'), lamps: {} };
  names.forEach(n => {
    const c = lamp[n].querySelector('circle'), line = lamp[n].querySelector('line');
    original.lamps[n] = { cx: c.getAttribute('cx'), cy: c.getAttribute('cy'), x1: line.getAttribute('x1'), y1: line.getAttribute('y1') };
  });

  let enabled = false, dragging = null, lastWedge = '', lastFocus = '';

  const degrees = a => Math.round(((a * 180 / Math.PI) % 360 + 360) % 360);

  function drawLamp(n) {
    const a = rig.lights[n].angle, x = (Math.cos(a) * PLOT_R).toFixed(1), y = (Math.sin(a) * PLOT_R).toFixed(1);
    const c = lamp[n].querySelector('circle'), line = lamp[n].querySelector('line');
    c.setAttribute('cx', x); c.setAttribute('cy', y);
    line.setAttribute('x1', x); line.setAttribute('y1', y);
    line.setAttribute('x2', 0); line.setAttribute('y2', 0);
    lamp[n].setAttribute('aria-valuenow', degrees(a));
  }

  // Ring and lamps sit round the focus (the subject).
  function drawFocus() {
    const t = `translate(${(rig.focus.x * S).toFixed(1)} ${(rig.focus.z * S).toFixed(1)})`;
    if (t === lastFocus) return;
    lastFocus = t;
    ring.setAttribute('transform', t);
    lampsGroup.setAttribute('transform', t);
  }

  // The camera wedge: its tip is the camera, its base is what it looks at.
  // length is in plot units (Wide 90, Mid 58, Close 36), as in the approved plot.
  function drawCamera(camPos, look, length) {
    if (!enabled) return;
    let dx = camPos.x - look.x, dz = camPos.z - look.z;
    const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
    const bx = look.x * S, by = look.z * S, w = 28;
    const p = (x, y) => x.toFixed(1) + ' ' + y.toFixed(1);
    const path = `M${p(bx + dx * length, by + dz * length)} L${p(bx - dz * w, by + dx * w)} L${p(bx + dz * w, by - dx * w)} Z`;
    if (path !== lastWedge) { wedge.setAttribute('d', path); lastWedge = path; }
    drawFocus();
  }

  function setAngle(n, a) {
    rig.setAngle(n, a);
    drawLamp(n);
    onMove(n);
  }

  // Pointer position in plot units, relative to the focus.
  function plotPoint(e) {
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(plot.getScreenCTM().inverse());
    return { x: pt.x - rig.focus.x * S, y: pt.y - rig.focus.z * S };
  }

  names.forEach(n => {
    lamp[n].addEventListener('pointerdown', e => {
      if (!enabled) return;
      dragging = n;
      plot.setPointerCapture(e.pointerId);
      lamp[n].focus({ preventScroll: true });
      e.preventDefault();
    });
    lamp[n].addEventListener('keydown', e => {
      if (!enabled) return;
      const step = (e.shiftKey ? 15 : 5) * Math.PI / 180;
      const dir = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (!dir) return;
      e.preventDefault();
      setAngle(n, rig.lights[n].angle + dir * step);
    });
  });
  plot.addEventListener('pointermove', e => {
    if (!dragging) return;
    const p = plotPoint(e);
    setAngle(dragging, Math.atan2(p.y, p.x));
  });
  const endDrag = () => { dragging = null; };
  plot.addEventListener('pointerup', endDrag);
  plot.addEventListener('pointercancel', endDrag);

  function enable(on) {
    enabled = on;
    lastWedge = lastFocus = '';
    names.forEach(n => {
      const g = lamp[n], label = n[0].toUpperCase() + n.slice(1) + ' light';
      if (on) {
        g.setAttribute('tabindex', '0');
        g.setAttribute('role', 'slider');
        g.setAttribute('aria-label', label + '. Drag, or use the arrow keys, to move it round the set');
        g.setAttribute('aria-valuemin', '0');
        g.setAttribute('aria-valuemax', '359');
        drawLamp(n);
      } else {
        ['tabindex', 'role', 'aria-label', 'aria-valuemin', 'aria-valuemax', 'aria-valuenow'].forEach(a => g.removeAttribute(a));
        const o = original.lamps[n], c = g.querySelector('circle'), line = g.querySelector('line');
        c.setAttribute('cx', o.cx); c.setAttribute('cy', o.cy);
        line.setAttribute('x1', o.x1); line.setAttribute('y1', o.y1);
      }
    });
    if (on) drawFocus();
    else {
      ring.removeAttribute('transform');
      lampsGroup.removeAttribute('transform');
      wedge.setAttribute('d', original.wedge);
    }
  }

  return { enable, drawCamera };
}
