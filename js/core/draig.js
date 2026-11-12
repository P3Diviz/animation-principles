// Draig rig helpers (docs/Draig_Character_Guide.md).
// Every part of Draig is a <g> with an id and its pivot in data-pivot="x y" (viewBox units).
// Each call replaces that part's transform, so combine moves on one part in a single call.
// A second Draig on the same page has a suffix on every id (for example "rig-b"):
// pass the suffixed id, and the suffix to mouth().

// ===== From docs/reference/10-exaggeration-draig-demo.html, as they are =====
const part = id => document.getElementById(id);
const pivot = el => el.dataset.pivot.split(' ').map(Number);
// Scale a part about its own pivot (from data-pivot)
export function scalePart(id, sx, sy = sx) { const el = part(id), [x, y] = pivot(el); el.setAttribute('transform', `translate(${x} ${y}) scale(${sx} ${sy}) translate(${-x} ${-y})`); }
export function rotatePart(id, deg) { const el = part(id), [x, y] = pivot(el); el.setAttribute('transform', `rotate(${deg} ${x} ${y})`); }
export function movePart(id, dx, dy) { part(id).setAttribute('transform', `translate(${dx} ${dy})`); }
export function mouth(open, sfx = '') { part('mouth-smile' + sfx).setAttribute('opacity', open ? 0 : 1); part('mouth-open' + sfx).setAttribute('opacity', open ? 1 : 0); }

// ===== Additions for the principle pages =====

// Move, rotate and scale one part in a single transform, all about its pivot.
export function posePart(id, { dx = 0, dy = 0, r = 0, sx = 1, sy = sx } = {}) {
  const el = part(id), [x, y] = pivot(el);
  el.setAttribute('transform', `translate(${dx} ${dy}) rotate(${r} ${x} ${y}) translate(${x} ${y}) scale(${sx} ${sy}) translate(${-x} ${-y})`);
}

// Put Draig in a page's scene: his feet (200, 380 in his viewBox) land on (x, y), at scale s.
// wrapper is the <g> around his nested <svg>.
export function placeDraig(wrapper, x, y, s) {
  wrapper.setAttribute('transform', `translate(${x - 200 * s} ${y - 380 * s}) scale(${s})`);
}

// Keep the ground shadow on the floor while Draig is lifted by `lift` scene units:
// push it back down, and shrink it the higher he goes.
export function groundShadow(id, lift, s) {
  lift = Math.max(0, lift);
  const k = Math.max(.35, 1 - lift / 260);
  part(id).setAttribute('transform', `translate(0 ${lift / s}) translate(200 396) scale(${k} ${k}) translate(-200 -396)`);
}

// A hidden "clock" Web Animation stands in for the demo's time. The shared timeline
// scrubs, pauses and steps it like any other animation, and Draig poses himself from it.
export function rigClock(el, ms) {
  return el.animate([{ opacity: 1 }, { opacity: 1 }], { duration: ms, iterations: Infinity });
}

// Call pose(timeInMs) whenever the clock has moved (so a paused frame costs nothing).
export function runRig(clock, ms, pose) {
  let last = null;
  (function loop() {
    const t = (((clock.currentTime ?? 0) % ms) + ms) % ms;
    if (t !== last) { last = t; pose(t); }
    requestAnimationFrame(loop);
  })();
  return () => { last = null; };   // call to force a redraw (after a control changes)
}

// Where a point in one of Draig's parts ends up in the scene's own units
// (used to attach a ball to his hand, or smoke to his nostrils).
export function toScene(sceneSvg, el, x, y) {
  const p = sceneSvg.createSVGPoint(); p.x = x; p.y = y;
  return p.matrixTransform(sceneSvg.getScreenCTM().inverse().multiply(el.getScreenCTM()));
}

// Easing for poses between keys
export const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const clamp = (t, a = 0, b = 1) => Math.max(a, Math.min(b, t));
export const lerp = (a, b, t) => a + (b - a) * t;
// Progress (0..1) of t between frames a and b
export const span = (t, a, b) => clamp((t - a) / (b - a));
