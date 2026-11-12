// Cubic Bézier helpers, shared by the Graph Editor and the Playground.
// A CSS / After Effects ease is a curve from (0,0) to (1,1) with two handles:
// P = [x1, y1, x2, y2], the same numbers as cubic-bezier(x1, y1, x2, y2).

// One coordinate of the curve at parameter s (0..1), for handle values a and b.
export const bz = (s, a, b) => { const u = 1 - s; return 3*u*u*s*a + 3*u*s*s*b + s*s*s; };

// Value at time t (0..1). First find s where x(s) = t by bisection
// (x is monotonic because handle x is clamped to 0..1), then return y(s).
export function evaluate(P, t) {
  let lo = 0, hi = 1, s = t;
  for (let i = 0; i < 24; i++) {
    s = (lo + hi) / 2;
    if (bz(s, P[0], P[2]) < t) lo = s; else hi = s;
  }
  return bz(s, P[1], P[3]);
}

// "cubic-bezier(0.33, 0, 0.67, 1)", rounded for display
export function toCSS(P) {
  return `cubic-bezier(${P.map(v => +v.toFixed(2)).join(', ')})`;
}
