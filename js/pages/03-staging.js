// 03 Staging: every control is a toggle that writes a data attribute on the stage area.
// In 2D, CSS swaps the drawing level, the lights, the camera framing and the silhouette test.
// The 3D view (03-staging-3d.js) reads the same data attributes; it's only loaded the first
// time the learner picks 3D (js/three/view.js).
import '../core/toggles.js';
import { bindView } from '../three/view.js';

bindView(() => import('./03-staging-3d.js'));
