# Draig: the site's 2D character

Draig is a small plush Welsh dragon, drawn for this site as hand-built SVG. He's original artwork with no licence restrictions. He replaces every placeholder 2D character (the blob figures and plain faces). Keep the 2D ball on 01, 06, 07 and 09: those demos are about a ball.

- Artwork: `assets/svg/characters/draig.svg`
- Working example: `docs/reference/10-exaggeration-draig-demo.html` (the Exaggeration "take" with slider and presets, tested in a browser)

## Putting Draig on a page

**Paste the SVG inline.** Copy the full contents of `draig.svg` into the page's stage, and replace `width="400" height="420"` with `class="draig"`. Don't use `<img>` or a CSS background: the parts can only be animated when the SVG is part of the page. This is static markup in the HTML, so it fits the no-`innerHTML` rule.

Size and place him with CSS on `.draig` (see the demo: `height: 72%`, positioned on the floor line). His feet sit at y = 380 in his viewBox.

**Two Draigs on one page** (Appeal compare mode): duplicate the markup and add a suffix to every `id` in the copy (for example `-b`), including the gradient and filter ids in `<defs>` and every `url(#…)` that points at them. Ids must be unique per page.

## Rig: named parts

Every part is a `<g>` with an `id`, and its pivot in `data-pivot="x y"` (viewBox units). Transforms always go about the pivot.

| id | What it is | Pivot | Typical use |
|---|---|---|---|
| `rig` | Everything except the ground shadow | 200 380 (feet) | Whole-body squash and stretch, hops, leans |
| `body` | Plush head-and-body shape, belly, shading | 200 380 | Breathing |
| `face` | Eyes, brows, muzzle, mouth, cheeks | 200 220 | Head lifts, looks, nods |
| `eye-left`, `eye-right` | Whole eye | 160 186, 240 186 | Pop wider, blink (scale y to 0.1) |
| `pupil-left`, `pupil-right` | Iris, pupil, highlights | 163 192, 237 192 | Look direction (translate up to ±8), shock (shrink) |
| `brows` | Both brows | 200 132 | Raise, frown (translate or rotate) |
| `mouth` | Both mouth states | 200 262 | Scale |
| `mouth-smile`, `mouth-open` | The two mouth shapes | – | Swap with opacity 0 or 1 |
| `muzzle` | Snout and nostrils | – | – |
| `arm-left`, `arm-right` | Arms | 98 262, 302 262 | Rotate: positive raises the left arm, negative raises the right |
| `wing-left`, `wing-right` | Wings (behind the body) | 100 205, 300 205 | Flap: negative lifts the left wing, positive the right |
| `tail` | Tail with spade tip | 290 340 | Swish, follow-through lag |
| `horns`, `crest` | Horns and the three head spikes | 200 110, 200 100 | Crest stands up in shock (scale y) |
| `feet` | Feet and claws | 200 380 | Stay planted while `rig` squashes |

The ground shadow (`#shadow`) sits outside `rig`, so it stays on the floor; scale its `rx` as Draig rises or squashes.

## Rig helpers (put in `js/core/draig.js`)

The demo contains `scalePart(id, sx, sy)`, `rotatePart(id, deg)`, `movePart(id, dx, dy)` and `mouth(open)`. Each reads the pivot from `data-pivot` and sets the `transform` attribute. Copy them as they are. Each call replaces that part's transform, so combine moves on one part in a single call.

## Where Draig goes

| Page | How Draig shows the principle |
|---|---|
| 02 Anticipation | Crouches (rig squash, arms back, eyes narrow), then jumps onto the box. With anticipation off he jumps with no crouch. The wind-up slider scales the crouch |
| 04 Straight ahead and pose to pose | Pose to pose: Draig's jump as three key poses, with in-betweens on or off and onion skin. Straight ahead keeps the flame, which can come out of Draig's mouth |
| 05 Follow through | Draig hops and lands; his **tail, wings and crest** keep moving and settle after the body stops. Off: everything stops at once. The stiffness slider sets how long they wobble. Drag Draig left and right; the tail and wings lag (spring physics) |
| 08 Secondary action | Draig walks (rig bob and feet) while the secondary action plays: tail swish, a glance, a puff of smoke. Off / Subtle / Too much |
| 10 Exaggeration | The take in the reference demo. Use it as it is |
| 11 Appeal | **Shape language:** swap the body between round, square and pointed (the three `d` strings are in the SVG's top comment; set the same `d` on `#body-shape` and `#body-clip-shape`). Round reads friendly, square sturdy, pointed sharp or less trustworthy. **Proportions:** head size scales `face` (bigger eyes and muzzle read younger and cuter); eye size scales both eyes. **Pose:** stiff (upright, arms down) vs a line of action (rig leaning, rotated arms and tail, following one curve). **Compare mode:** two Draigs side by side, learner picks, reveal explains |
| 12 Solid drawing | Four stages on the 2D side: stick (a simple line figure), construction (circle and ellipse outlines over Draig in `--accent`), flat (Draig with the gradients swapped for flat fills and the plush filter removed), full (Draig as drawn) |

## Performance

The plush texture is the `dg-plush` filter on the body. It looks best, but if any page drops frames on a college PC while Draig animates, remove `filter="url(#dg-plush)"` from that page's copy. The shape and shading stay; only the fuzzy edge goes.
