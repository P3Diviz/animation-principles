// The ball drop for 09 Timing, shared by the 2D and 3D views.

export const HOLD = 12;   // frames resting on the floor before it loops

// Same height for all three. Only the frame count and the bounce change.
export const PRESETS = {
  balloon:  { name: 'Balloon',      frames: 36, bounce: .3 },
  football: { name: 'Football',     frames: 14, bounce: .45 },
  bowling:  { name: 'Bowling ball', frames: 10, bounce: .03 },
};

// Height of the ball at time t (in frames). 0 = top of the drop, 1 = the floor.
// Gravity: y = s² falling, so it starts slow and speeds up; bounces rise to
// bounce^k of the height and take frames * sqrt(height) each way.
// Linear: constant speed with the same frame counts (no hang time, no speed-up).
export function dropCurve({ frames, bounce }, gravity) {
  const phases = [{ len: frames, y: s => gravity ? s * s : s }];
  for (let k = 1; k <= 2; k++) {
    const h = Math.pow(bounce, k), len = frames * Math.sqrt(h);
    if (len < 1.5) break;                       // too small to see: it just lands
    phases.push({ len, y: s => 1 - h * (gravity ? 1 - (1 - s) * (1 - s) : s) });   // rising, slowing down
    phases.push({ len, y: s => 1 - h * (gravity ? 1 - s * s : 1 - s) });           // falling again
  }
  const keys = [0]; let end = 0;
  phases.forEach(p => { p.start = end; end += p.len; keys.push(Math.round(end)); });
  const at = t => {
    const p = phases.find(p => t <= p.start + p.len);
    return p ? p.y((t - p.start) / p.len) : 1;
  };
  return { at, keys, length: Math.ceil(end) + HOLD };
}
