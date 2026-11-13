// Per-clip constants, in seconds of clip time. Read off the Mixamo clips in the browser
// (hips height, feet height and hand positions sampled every 0.1 s). The clips are 30 fps.

// Idle (8.33 s): the second figure on 03 Staging starts part-way through, so the two don't breathe in step.
export const IDLE_OFFSET = 1.4;

// Jump (2.17 s): standing until 0.15, crouching down to the deepest point at 0.55,
// pushing up until the feet leave the floor at 0.75, top of the jump at 1.0, landing at 1.3,
// settled by 1.9.
export const JUMP = {
  standEnd: .15,
  deepest: .55,
  anticipationEnd: .7,   // ANTICIPATION_END: the crouch is over and the legs are driving up
  takeOff: .75,
  top: 1,
  land: 1.3,
  settled: 1.9
};
// Key poses for blocking the jump on 04 (stand, crouch, take-off, top, land, settle)
export const JUMP_KEYS = [0, JUMP.deepest, JUMP.takeOff, JUMP.top, JUMP.land, JUMP.settled];

// Throw (3.83 s), right-handed: wind-up from 0.3, a step forward. The palm passes head height at
// 1.54 moving up and forward at about 37° (releaseUp: where an arcing throw leaves the hand), and is
// heading down at 1.68 (release: where a straight, downward throw leaves it).
export const THROW = { windUp: .3, releaseUp: 1.54, release: 1.68 };

// Walking (1.03 s): one full cycle (two steps). The file travels forward 1.72 m per cycle.
// RunToStop (1.8 s): runs 2.6 m forward and stops by 1.0, then holds.
export const RUN_STOP = { stopped: 1 };
