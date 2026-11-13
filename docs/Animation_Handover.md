# Principles of Animation: Build Handover

For Claude Code, working in Paul's VS Code workspace and GitHub repo. Read this whole file before writing any code. Last updated 12 November 2026.

> **Status: Tier 1 is complete and checked by Paul. Tier 2 (3D) is under way: shared 3D modules, 03 Staging and every Mixamo bot page (02, 04, 05, 07, 08, 09, 10, 12) are done (section 17.4a); still to do is the procedural 3D for 01, 06 and 11.** Section 17 records what was built, every decision Paul made during Tier 1 (these override the earlier sections where they differ), how the 2D pages work, and what Tier 2 must plug into. Read it before starting.

## 0. Start here

**Deadline: the site must be fully working in class on Monday.** Build in the order in section 14 so the site is usable at the end of every phase. Paul has very little time for back-and-forth: decisions are made in this file, and the reference files in `docs/reference/` are the visual source of truth. Don't redesign; match them.

Already in the repo from the starter pack (don't recreate):

| Path | What it is |
|---|---|
| `docs/reference/home-approved.html` | Approved home page. **Contains Paul's original ball, ported exactly** (section 16) |
| `docs/reference/principles-index-approved.html` | Approved Principles page, with the working dropdown |
| `docs/reference/06-slow-in-slow-out-approved.html` | **The full principle page shell**: header, dropdown, stage, controls panel, Graph Editor, timeline (scrub, Space, Page Up/Down), notes strip, Present mode. Every principle page copies this structure |
| `docs/reference/03-staging-3d-approved.html` | Approved 3D page on the vendored Three.js r170: Mixamo FBX loading with mannequin fallback, key/fill/rim, draggable light plot, Wide/Mid/Close, silhouette test |
| `docs/reference/original-bouncing-ball.html` | Paul's original file, untouched, for comparison |
| `assets/svg/thumbs/01.svg … 12.svg` | Final thumbnails for the Principles page |
| `assets/svg/strands.svg` | The site background: static, focus-stacked light strands with evenly spaced keyframe dots |
| `css/glass.css` | **Final.** The glass layer used by every page (section 4, Glass layer). Load it after `tokens.css` and `shell.css`. Replace `STRANDS_URL` with `../assets/svg/strands.svg` |
| `vendor/three/` | Three.js r170 (`three.module.min.js`) plus FBXLoader (with its curves and fflate dependencies), GLTFLoader, OrbitControls, SkeletonUtils, BufferGeometryUtils. Already vendored |
| `.nojekyll` | Needed for GitHub Pages |
| `CLAUDE.md` | Tells every Claude Code session to read this file first |

All reference pages were screenshot-checked at 1280×720, 1366×768 and 1920×1080 with no scrolling. They load fonts from Google Fonts for preview only; production self-hosts them (section 4). View them with Live Server: module scripts don't run from `file://`.

**How to use the references:** split their `<style>` and `<script>` blocks into the files named in their comments (`css/shell.css`, `js/core/menu.js`, `js/core/timeline.js`, `js/three/lights.js` and so on). Keep values, class names and behaviour. Fill each new principle page into the same shell.

## 1. What we're building

An interactive teaching website for UAL Level 2 Creative Media learners (Paul Davies, North Wales). Each of the 12 principles of animation gets its own page, where learners switch the principle on and off, change settings, scrub frame by frame, and compare 2D and 3D versions.

It is used in Paul's classroom on college PCs (WebGL works) and on the projector. It is **not** a public product, but see section 12 on hosting.

The look: After Effects' navy and violet, built to the standard of an Apple or Adobe product page. Restrained, typographic, precise. Nothing childish: no mascots, no cartoon characters, no rainbow colours, no emoji.

## 2. Fixed decisions (do not change without asking Paul)

1. **Principle order follows the classroom posters.** The posters are used for the order only. Do not use their character, images, copy or colours anywhere.

   | # | Principle | File |
   |---|---|---|
   | 01 | Squash and stretch | `principles/01-squash-and-stretch.html` |
   | 02 | Anticipation | `principles/02-anticipation.html` |
   | 03 | Staging | `principles/03-staging.html` |
   | 04 | Straight ahead and pose to pose | `principles/04-straight-ahead-pose-to-pose.html` |
   | 05 | Follow through and overlapping action | `principles/05-follow-through.html` |
   | 06 | Slow in and slow out | `principles/06-slow-in-slow-out.html` |
   | 07 | Arc | `principles/07-arc.html` |
   | 08 | Secondary action | `principles/08-secondary-action.html` |
   | 09 | Timing | `principles/09-timing.html` |
   | 10 | Exaggeration | `principles/10-exaggeration.html` |
   | 11 | Appeal | `principles/11-appeal.html` |
   | 12 | Solid drawing | `principles/12-solid-drawing.html` |

2. **Every page fits one screen. No scrolling, ever.** Scrolling breaks the effect. Target viewports: 1366×768 (smallest college PC), 1920×1080 (projector, most PCs). Test at 1280×720 too. Use `height: 100dvh`, CSS grid, `overflow: hidden` on `html, body`, and `clamp()` for sizes. If something doesn't fit, cut words, not layout.
3. **No references to The Goal, or to learners' own projects, on any page.** The site is taught before The Goal starts.
4. **HTML and CSS first. JavaScript only for interaction**, plus Three.js for 3D. No `innerHTML` to build UI. All markup is written in the HTML files (see section 6).
5. **No build tools.** No npm, bundlers, frameworks or Tailwind. Plain files that GitHub Pages serves as they are, and that Paul can edit in GitHub's web editor.
6. **Mixamo models** (the plain Y Bot and X Bot only) are approved for this classroom site. Both are used: Y Bot (male proportions) and X Bot (female proportions), mixed across the pages as in section 11.
7. **No Adobe logo** or Adobe trademarks in the UI. Use "After Effects" in text only.

## 3. Site map

| Page | File | Purpose |
|---|---|---|
| Home | `index.html` | One screen. Headline, the bouncing ball hero with a Squash and stretch Off/On switch, and two buttons: "Explore the principles" and "Spot it" |
| Principles | `principles.html` | The 12 principles as individual boxes (4×3 grid, poster order), each a link. Each box shows the principle number, a small static diagram (an SVG in `assets/svg/thumbs/NN.svg`, drawn as a motion study in violet: strobe positions, spacing marks or a path), the name and a three-word descriptor. No animated previews and no hover instruction text. Hover and focus only brighten the border. **No page-specific JavaScript**: only the shared menu and Present scripts. See `docs/reference/principles-index-approved.html`. |
| 12 principle pages | `principles/NN-*.html` | One per principle, all using the page shell in section 5 |
| Spot it | `spot-it.html` | Quiz built from the site's own demos (section 9) |
| Playground | `playground.html` | One ball with every principle's controls together (section 9) |

### Header (identical on every page)

The wordmark "Principles of Animation" (links home) sits on the left. Everything else is grouped on the right: Home, **Principles ▾** (dropdown), Spot it, Playground. No other text in the header. *(Changed in Tier 1: the **Present** button moved out of the header into the notes strip, under the previous/next links; Spot it and Playground are greyed out until built. See section 17.)*

The Principles dropdown is a two-column panel listing all 12 in poster order (01–06 left, 07–12 right), each with its number in the accent colour. The menu opens right-aligned under the Principles link. The current page has `aria-current="page"` and a violet wash. It opens on click (not hover, which is unreliable on projector touch screens), closes on Esc, outside click, or choosing a link. It's a real `<nav>` of `<a>` links, written in HTML on every page. Clicking the word "Principles" itself toggles the menu; the menu's footer link "See all twelve" goes to `principles.html`.

Because the header is duplicated across 17 files, keep it byte-identical apart from `aria-current` and relative paths. When the nav changes, update every file in the same commit.

## 4. Design system

### Tokens (`css/tokens.css`)

```css
:root {
  --bg: #0A0A15;            /* 3D scene background and solid fallbacks; the page itself uses #07071A from glass.css */
  --panel: #10101D;         /* side panels */
  --card: #12122A;          /* boxes on principles.html, dropdown */
  --card-hover: #17173A;
  --hair: rgba(255,255,255,.08);   /* all dividers: 1px */
  --hair-strong: rgba(255,255,255,.16);
  --text: #F5F5F7;
  --text-2: #9C9CB3;
  --accent: #9999FF;        /* After Effects violet: interactive things and keyframes ONLY */
  --accent-wash: rgba(153,153,255,.14);
  --accent-line: rgba(153,153,255,.55);
  --light-key: #FFD9A8;  --light-fill: #A9B6FF;  --light-rim: #9999FF;
  --clay: #C9C9D3;          /* 3D models */
  --ease: cubic-bezier(.33,0,.67,1);   /* After Effects Easy Ease */
  --dur: 220ms;
  --r-card: 12px; --r-control: 8px; --r-pill: 999px;
  --font: "Inter", system-ui, sans-serif;
  --mono: "JetBrains Mono", ui-monospace, monospace;
}
```

### Rules

- **One accent.** Violet appears only on controls, selected states, keyframes, handles and the principle number. Everything else is navy and grey.
- **Glass layer (approved, final).** Every page sits on `assets/svg/strands.svg`: a static background of light strands at three focus depths (heavily blurred far back, soft in the middle, sharp in front) with evenly spaced dots along the sharp strands, like keyframes on a timeline. **No background animation or drift.** On top, the header (a floating pill), stage area, controls panel, notes strip, Principles boxes, dropdown and home control dock are frosted glass, all defined in `css/glass.css`. Recessed areas inside glass (graphs, the timeline, segmented control tracks) use the darker `--well` colour. Principle pages add `class="principle"` to `<body>`, which dims the strands to 55% so the demo reads first. Home and Principles show them at full strength.
- **No backdrop blur behind a live 3D canvas.** A 3D stage area gets the class `is-3d`, which turns the blur off and uses a near-solid panel instead. Blurring behind a canvas that redraws every frame is slow on college PCs.
- **Inside a glass panel, divide with hairlines**, not more boxes.
- **Type:** Inter for everything; JetBrains Mono only where After Effects itself shows numbers: timecodes (`00:00:00:12`), values, the principle number, CSS readouts, key hints. Self-host both (OFL licence) as woff2 in `assets/fonts/` so the site doesn't depend on Google Fonts loading on the college network.
- **Type scale:** 11 / 12 / 13 / 15 / 17 / 22 / 36, home headline `clamp(40px, 5vw, 64px)`. Weights 400, 500, 600 only. Headlines tight (letter-spacing about -0.02em). **Reading text is 14px minimum** (Paul's decision in Tier 1): principle explanations, notes strip, panel notes (`.small`), quiz text. Control labels, buttons, timecode and key hints stay 11–13px.
- **Copy:** sentence case, short, plain verbs. No ALL-CAPS labels, no tracked-out eyebrows, no middle-dot strings ("2D · 3D"), no single word coloured in a headline, no "→" on buttons. These were in early mockups and have been removed on purpose.
- **Motion obeys the principles.** Every UI transition uses `var(--ease)`. Camera moves ease, never cut. Nothing animates on its own except the demo itself and the home ball. The boxes on `principles.html` are static images.
- **Accessibility:** visible focus rings (`outline: 2px solid var(--accent); outline-offset: 2px`), `aria-pressed` on toggle buttons, `aria-expanded` on the dropdown, real `<button>` and `<a>` elements, contrast at least 4.5:1 for text. `prefers-reduced-motion`: demos stay paused until the learner presses play.

### Components (`css/components.css`)

- **Segmented control** (`.seg`): pill track, `aria-pressed="true"` segment filled. Used for Off/On, 2D/3D, presets.
- **Pill toggle** (`.pill`): for Key / Fill / Rim, Wide / Mid / Close, Silhouette test.
- **Slider** (`.slider`): custom-styled `<input type="range">` with value readout in mono.
- **Timeline** (`.timeline`): see section 7.
- **Keyframe icon** (inline SVG, two `<path>` halves): left half shows incoming, right half outgoing. Linear half = half diamond; eased half = half hourglass, as in After Effects.
- **Notes strip**: three equal columns, each a 12px title and one or two short lines.

## 5. Principle page shell

```
┌ header (44–52px) ─────────────────────────────────────────────┐
│ Principles of Animation              Home  Principles ▾  Spot it  Playground │
├ stage ──────────────────────────────────────┬ controls panel ─┤
│ 03 Staging                        [2D][3D]  │  (≈260–300px)    │
│                                             │  sliders, pills, │
│        demo (2D DOM/SVG or 3D canvas)       │  presets, plot   │
│                                             │                  │
│ [timeline, on pages that use it]            │                  │
├ notes strip ────────────────────────────────┴──────────────────┤
│ What to notice │ In After Effects │ Try this      ‹ 02   04 › │
│                │                  │               [Present P]  │
└────────────────────────────────────────────────────────────────┘
(The controls panel also ends with a "The principle" explanation, pinned to its foot. See section 17.)
```

- `body` is a grid: `grid-template-rows: auto minmax(0,1fr) auto; height: 100dvh`.
- The 2D and 3D versions live on the **same page**. The switch sets `data-view="2d|3d"` on `<main>`; CSS shows one stage. When 3D is hidden, stop its render loop.
- Prev/next principle links sit at the right end of the notes strip.
- **Notes strip content** (no Goal references): *What to notice* (one sentence), *In After Effects* (the matching tool or shortcut), *Try this* (one small challenge).

### Present mode

Press `P` (or the Present button) to toggle `data-present` on `<html>`. In present mode the header and notes strip hide, the stage and controls fill the screen, controls scale up about 125% for the projector, and a small exit hint shows for two seconds. `Esc` also exits. Remember the state in `sessionStorage` so it persists across pages during a lesson (wrap in try/catch).

### Keyboard (After Effects habits)

`Space` play/pause · `Page Up` / `Page Down` back/forward one frame · `Home` / `End` first/last frame · `P` present mode · `Esc` close menu or exit present mode. Ignore keys while focus is in a text field.

## 6. Code conventions

- **State lives in data attributes; CSS does the restyling.** For example, `<main data-squash="off">` with `[data-squash="off"] .ball { animation-name: bounce-flat; }`.
- **Sliders drive CSS custom properties:** `stage.style.setProperty('--stretch', value)`. The CSS animation reads `var(--stretch)`.
- **2D animation is CSS `@keyframes`.** JS only scrubs and controls it through the Web Animations API (`el.getAnimations()`, `.currentTime`, `.pause()`, `.play()`, `.updatePlaybackRate()`).
- **No `innerHTML`, no template strings of markup.** Repeated elements (spacing marks, ghost frames) are written in the HTML. JS may only set attributes, classes, `textContent`, styles and custom properties. SVG paths that depend on values may be set with `setAttribute('d', …)`.
- **ES modules**, one entry file per page: `<script type="module" src="../js/pages/03-staging.js">`. Shared modules in `js/core/` and `js/three/`.
- Small, readable functions with short comments where the maths isn't obvious. Learners on Paul's web units may read this code, so clarity beats cleverness.
- All paths relative (`../css/tokens.css`), never root-relative (`/css/…`), because GitHub Pages serves from `/repo-name/`.

## 7. Shared modules

| Module | Job |
|---|---|
| `js/core/menu.js` | Principles dropdown: toggle, Esc, outside click, focus return |
| `js/core/present.js` | Present mode and its keyboard shortcuts |
| `js/core/toggles.js` | Wires every `.seg` and `.pill` group: updates `aria-pressed` and writes `data-*` on the target named in `data-target` |
| `js/core/timeline.js` | Binds a timeline UI to the CSS animations inside a stage. 25 fps. Timecode `00:00:SS:FF`. Click or drag to scrub (pauses), Space to play, Page Up/Down to step a frame. Draws keyframe icons at positions given in HTML `data-keys="0,12,24"` |
| `js/core/bezier.js` | Cubic Bézier evaluate and solve (bisection), shared by the Graph Editor and Playground |
| `js/three/stage.js` | Creates renderer (sRGB output, ACES tone mapping, soft shadows, pixel ratio capped at 2), scene, floor, camera, resize observer, start/stop loop, `dispose()` |
| `js/three/rig.js` | Loads the Mixamo FBX bots and clips directly (section 11), returns the model, an `AnimationMixer`, and helpers: `play(name)`, `setTime(t)`, `timeScale(x)`, `stepped(keyTimes)` |
| `js/three/lights.js` | Key, fill and rim lights with azimuth, height, on/off; emits changes for the light plot |
| `js/three/cameras.js` | Named shots with eased transitions (lerp, never cut) |
| `js/three/silhouette.js` | Swaps every material to black on a pale ground and back |

### Three.js

- **Three.js r170 is already vendored** in `vendor/three/` (`three.module.min.js` plus the addons listed in section 0). Don't upgrade it and don't load it from a CDN: vendoring protects lessons from the college network filter.
- r170 differences from older tutorials: colour output is sRGB by default (don't set `outputEncoding`, it no longer exists); lights use physical units, so use the intensities in the Staging reference, not values from older examples; `CapsuleGeometry` exists and is used for the fallback mannequin.
- Each 3D page has an import map:
  ```html
  <script type="importmap">
  { "imports": {
      "three": "../vendor/three/three.module.min.js",
      "three/addons/": "../vendor/three/addons/" } }
  </script>
  ```
- Clay material for models (`--clay`, roughness about 0.5), floor `#1C1C2B`, background `--bg`.
- Pause rendering when the 3D view is hidden or the tab isn't visible.

## 8. Principle pages

Each entry lists the 2D demo, the 3D demo, the controls, and the notes strip copy (draft; Paul may edit). "Timeline" means the shared timeline component.

### 01 Squash and stretch
- **2D:** Paul's original bouncing ball, ported exactly as in `docs/reference/home-approved.html` (section 16). Do **not** change `transform-origin` to `center bottom`. Shadow scales with height.
- **3D:** clay sphere bouncing on the floor; volume preserved (`sy` stretch, `sx = sz = 1/√sy`).
- **Controls:** Off/On · Amount slider (0–150%) · Material presets: rubber ball, bowling ball, water balloon (change amount and timing together) · Volume check overlay (outline of the original circle, so learners see the area stays about the same) · Timeline.
- **Notes:** *Notice* Squash on impact, stretch at speed, same volume throughout. *In After Effects* Scale with the link off, keyed at contact and just after. *Try this* Find the setting that makes it feel like a bowling ball.

### 02 Anticipation
- **2D:** simple block character (SVG, a few rounded shapes) jumping onto a box; also a throw.
- **3D:** Y Bot `Jump` clip. **Off** starts the clip after the crouch (per-clip constant `ANTICIPATION_END` in seconds), so learners see the identical jump with and without it.
- **Controls:** Off/On · Wind-up slider (none → huge) · Jump / Throw · Timeline. *(Predict it was built, then removed at Paul's request: too easy. The principle explanation fills the space.)*
- **Notes:** *Notice* The small move the opposite way first. *In After Effects* An extra keyframe just before the main move, pulling back. *Try this* Make the wind-up so big it becomes funny.

### 03 Staging
- **2D:** flat illustrated set (SVG): figure, crate, ball, back wall. Drawing level switch: line drawing → flat colour → full render with light and shadow.
- **3D:** Y Bot `Idle` on a simple set with a crate and ball prop.
- **Controls:** Lights: **Key / Fill / Rim** pills · **Light plot, from above**: SVG top-down plan of the set showing the figure, a camera wedge that grows and shrinks with the shot, and the three lights in their colours. Lights are draggable round the circle; dragging moves the light's azimuth in the 3D scene live. Off lights fade to 25%. · Camera: **Wide / Mid / Close** (eased moves) · **Silhouette test** (black figures on pale ground) · Clutter toggle (busy background vs clean).
- **Notes:** *Notice* Light and framing tell you where to look before anything moves. *In After Effects* Light layers and Camera layers (Layer > New). *Try this* Turn the key off. Can you still read the pose with the rim alone?

### 04 Straight ahead and pose to pose
- **2D:** split stage. Left: flame drawn frame by frame (straight ahead), as an SVG sprite stepped with `steps()`. Right: jointed SVG figure jumping (pose to pose).
- **3D:** Y Bot `Jump` with **Blocking** mode: the mixer is set only to the key times and held (stepped), then **Splined** mode plays normally. This is exactly how animators block in 3D.
- **Controls:** Keys only / Keys and in-betweens · Onion skin (previous and next frame ghosts, written in HTML and shown by class) · **Make your own**: drag the figure to three key poses, then play the in-betweens · Timeline with keyframe icons.
- **Notes:** *Notice* Straight ahead flows, pose to pose is planned. *In After Effects* You work pose to pose: set keys, After Effects makes the in-betweens. Toggle Hold Keyframe (Ctrl+Alt+H) to see blocking. *Try this* Block a jump in three poses.

### 05 Follow through and overlapping action
- **2D:** character with an antenna and a scarf; body stops, parts carry on and settle.
- **3D:** Y Bot `Run To Stop` (or nearest Mixamo clip) with a procedural tail or scarf: a 6–8 segment verlet chain attached to the spine bone.
- **Controls:** Off/On · Stiffness slider · **Drag it**: drag the character left and right with the mouse; the chain lags and settles (spring physics in JS) · Timeline (2D).
- **Notes:** *Notice* Not everything stops at once. *In After Effects* Offset keyframes a few frames per layer, or parent with a delay. *Try this* Make the scarf heavy, then light.

### 06 Slow in and slow out
- **2D:** ball sliding across a track with **spacing marks**, one per frame (21 marks written in HTML, positions set by JS).
- **3D:** clay block or simple car shape pulling away and stopping, same curve.
- **Controls:** **Graph Editor** (value graph, SVG) with two draggable Bézier handles · Presets: Linear, Easy Ease, Slow out only, Slow in only · Keyframe icons that change shape with the curve (diamond / hourglass halves) · Timeline.
- *(The CSS `cubic-bezier(…)` readout and the "AE and CSS name easing the opposite way" note were removed at Paul's request: learners on this site aren't learning code. The move is now 30 frames (1.2 s) plus a 15-frame hold, with 31 spacing marks, because 20 frames was too fast to follow.)*
- **Notes:** *Notice* Marks bunch up where it's slow and spread out where it's fast. *In After Effects* Select keys, F9 for Easy Ease; Shift+F3 for the Graph Editor. *Try this* Make a curve that overshoots and settles back.

### 07 Arc
- **2D:** thrown ball and a head turn; draggable arc-height handle; Straight / Arc switch.
- **3D:** Y Bot `Throw` and `Walking` with **motion trails** on chosen bones (hand, head, foot): a fading line from a ring buffer of world positions. A thrown sphere shows straight vs arc.
- **Controls:** Straight / Arc · Arc height slider · Show motion path (like AE's) · Trail bone picker (3D) · Timeline.
- **Notes:** *Notice* Living things move in curves. *In After Effects* The motion path in the Composition panel; drag its Bézier handles. *Try this* Turn the arc off. Why does it look mechanical?

### 08 Secondary action
- **2D:** character walking, with an optional bag swing and whistle notes.
- **3D:** Y Bot `Walking` with a procedural overlay on the head and arm bones (glancing round, a wave), applied after `mixer.update()`.
- **Controls:** **Off / Subtle / Too much** (too much shows secondary action stealing focus) · Timeline.
- **Notes:** *Notice* Small moves support the main action without stealing it. *In After Effects* Animate a second layer, parented to the first. *Try this* Find where subtle tips into too much.

### 09 Timing
- **2D:** ball drop with **Linear / Gravity** (linear has no hang time and no speed-up, so it looks robotic) · Weight presets Balloon / Football / Bowling ball (same height, different frame counts) · Frames slider · 25 fps vs on twos · Spacing ghosts · **Guess the weight**: two balls drop, pick the heavier.
- **3D:** spheres of different weights dropping side by side; Y Bot `Walking` at slow / normal / fast `timeScale`.
- **Notes:** *Notice* Fewer frames feels light and fast; more frames feels heavy or slow. *In After Effects* Move keyframes closer or further apart. Alt+drag scales a group of keys. *Try this* Make the football feel like a balloon by changing frames only.

### 10 Exaggeration
- **2D:** ball hitting a wall plus a face reaction (simple SVG face).
- **3D:** Y Bot `Jump` with an **exaggeration factor**: after `mixer.update()`, for each bone compute the rotation away from its rest pose and scale that angle by k (axis-angle), so poses push further. Fallback if it looks broken: compare two different clips.
- **Controls:** Realism → cartoon slider (0–150%) · Timeline.
- **Notes:** *Notice* Push it, but keep it believable. *In After Effects* Bigger value changes, overshoot keys. *Try this* Find the point where it stops being believable.

### 11 Appeal
- **2D and 3D:** a character built from primitives (SVG in 2D, Three.js primitives in 3D), so proportions are adjustable. Mixamo bots are not used here.
- **Controls:** Shape language: circle / square / triangle · Head size and eye size sliders · Pose: stiff vs strong line of action · **Which is more appealing?**: two versions side by side, learner picks, the page reveals why.
- **Notes:** *Notice* Clear shapes, readable silhouettes and personality. *In After Effects* Shape layers: rounded corners, consistent stroke widths. *Try this* Make a character that feels friendly, then one that feels threatening, with the same parts.

### 12 Solid drawing
- **2D:** stick figure → construction shapes → volume → shaded, as a 4-step switch.
- **3D:** Y Bot with **OrbitControls**; display modes Wireframe / Clay / Normals (`MeshNormalMaterial`) / Lit; a rotating key light; **Twinning** toggle (mirror-symmetrical pose vs natural asymmetric pose).
- **Notes:** *Notice* Things have weight, volume and a back as well as a front. *In After Effects* 3D layers and the camera show form from new angles. *Try this* Turn twinning on. Why does the pose look flat?

## 9. Extra pages

### Spot it
A quiz built entirely from the site's own demos (no external video, so no copyright or network problems). Each round plays a demo with one principle removed or broken; learners pick which from four choices. Ten rounds, score at the end. A **Reveal** button supports whole-class play in present mode. Round content (which demo, which flag is off, the four options, the answer) lives in HTML as `<template>` elements or `data-*` on round elements; JS only shows the current round and checks answers. One screen.

### Playground
One ball, with controls for squash amount, anticipation, timing frames, ease curve (mini Graph Editor), arc height, follow-through tail and exaggeration together. A **Copy CSS** button copies the generated `@keyframes` (useful for Paul's web units). One screen.

## 10. Home page

One screen, no scroll. Header; headline "Twelve principles, every one switchable" (final copy is Paul's call; no single coloured word); one supporting line; the violet ball bouncing on a hairline floor with its blurred shadow; the Squash and stretch Off/On segmented control under it; two buttons: "Explore the principles" (`principles.html`) and "Spot it" (greyed out until Spot it is built). *(The "25 fps, Easy Ease" readout is deliberately left off: it isn't on the approved reference and the ball uses `ease`, not Easy Ease. Paul agreed.)*

## 11. 3D models (Mixamo, no Blender)

The site loads Mixamo's FBX files **directly** with Three.js `FBXLoader` (already vendored, with its dependencies). There is no Blender or conversion step.

**Paul's only job:** download seven files from Mixamo and put them in `assets/models/` with exactly these names (capitals matter):

| File | Mixamo download |
|---|---|
| `YBot.fbx` | Y Bot (male), With Skin, T-pose |
| `XBot.fbx` | X Bot (female), With Skin, T-pose |
| `Idle.fbx` | Idle, Without Skin |
| `Jump.fbx` | Jump (one with a clear crouch), Without Skin |
| `Walking.fbx` | Walking, Without Skin, In Place ticked |
| `Throw.fbx` | Throw, Without Skin |
| `RunToStop.fbx` | Run To Stop, Without Skin, In Place ticked if offered |

All downloads: Format FBX Binary (.fbx), 30 frames per second, Keyframe Reduction none. The files are committed to the repo normally (no Git LFS). Expect roughly 10–15 MB in total, cached by the browser after the first visit.

**How `js/three/rig.js` works** (the working code is in the Staging reference):
- `loadBot('YBot' | 'XBot')` loads the model, scales it to 1.8 units tall from its bounding box (Mixamo exports in centimetres), and swaps its materials for clay: `#C9C9D3` for the surface mesh, `#8E8EA0` for the joints mesh (`/joint/i` on the mesh name).
- `loadClip(name)` loads `<name>.fbx`, takes `animations[0]`, renames it to `name`, and caches it. Both bots share the Mixamo skeleton, so any clip plays on either bot through that bot's own `AnimationMixer`.
- Wrap these in the helper API `{ model, mixer, play(name), setTime(t), timeScale(x), stepped(keyTimes) }`.
- **Fallbacks, so missing files never break a page:** no `XBot.fbx` → use Y Bot; no `YBot.fbx` → the primitive mannequin; a missing clip → show the model still, with a short status line. Pages work before Paul has downloaded anything.

**Which bot on which page (default):**

| Page | Bot |
|---|---|
| 02 Anticipation | Y Bot |
| 03 Staging | **Both**: Y Bot as the subject, X Bot further back as a second figure. A "Subject" switch (Y Bot / X Bot) re-aims the key light and the Mid and Close shots at the chosen figure, so learners see staging decide who we look at. The light plot shows both figures |
| 04 Straight ahead and pose to pose | X Bot |
| 05 Follow through | Y Bot |
| 07 Arc | X Bot |
| 08 Secondary action | Y Bot |
| 09 Timing (walk) | X Bot |
| 10 Exaggeration | Y Bot |
| 12 Solid drawing | X Bot, with a Y Bot / X Bot switch |

Per-clip constants (for example `ANTICIPATION_END` for `Jump`, the key times for blocking mode) live in `js/three/clips.js`. Read them off the clip in the browser once the files are in; until then use sensible guesses and note them in the file.

## 12. Hosting on GitHub Pages

- Repo root is the site root. Add an empty `.nojekyll` file.
- Settings › Pages › Deploy from a branch › `main` / root.
- The site will be at `https://<user>.github.io/<repo>/`, hence relative paths everywhere.
- **Note for Paul:** a GitHub Pages site is reachable by anyone with the URL, even from a private repo, unless the organisation is on GitHub Enterprise. It will be unlisted, not private. Add `<meta name="robots" content="noindex, nofollow">` to every page so search engines skip it.
- Local testing: VS Code **Live Server**. Opening files by double-click (`file://`) breaks ES modules and model loading.

## 13. Repo structure

```
/
├─ index.html
├─ principles.html
├─ spot-it.html
├─ playground.html
├─ principles/01-squash-and-stretch.html … 12-solid-drawing.html
├─ css/
│  ├─ glass.css         (already written: load after shell.css on every page)
│  ├─ tokens.css
│  ├─ base.css          (reset, fonts, body grid, focus)
│  ├─ shell.css         (header, dropdown, stage, panel, notes strip, present mode)
│  ├─ components.css    (seg, pill, slider, timeline, keyframe icons, graph editor, light plot)
│  └─ pages/01.css … 12.css, home.css, principles.css, spot-it.css, playground.css
├─ js/
│  ├─ core/   menu.js present.js toggles.js timeline.js bezier.js
│  ├─ three/  stage.js rig.js lights.js cameras.js silhouette.js clips.js
│  └─ pages/  01-squash.js … 12-solid.js, home.js, spot-it.js, playground.js
├─ vendor/three/  three.module.min.js, addons/… (already vendored, r170)
├─ assets/  fonts/  models/ (Mixamo .fbx files)  svg/strands.svg  svg/thumbs/01.svg … 12.svg
├─ CLAUDE.md
├─ docs/Animation_Handover.md   (this file)
├─ docs/reference/   (approved reference pages, section 0)
├─ README.md   (how to run locally, how to deploy)
└─ .nojekyll
```

`CLAUDE.md` is already in the starter pack and points every session at this file.

## 14. Build order for Monday

Work on `main` in small commits (one page or one shared module per commit) and push after each, so Paul can check the live site at any point. Each tier leaves a complete, usable site.

**Tier 1: usable in class (do first)**
1. Shared files from the references: `css/tokens.css`, `base.css`, `shell.css`, `components.css`; `js/core/menu.js`, `present.js`, `toggles.js`, `timeline.js`, `bezier.js`. Self-hosted fonts. `README.md`, `.gitignore`, `noindex` meta.
2. `index.html` (home) and `principles.html`, from their references.
3. All 12 principle pages in **2D**, in poster order, each in the 06 shell. 01, 06 and 09 first.

**Tier 2: 3D**
4. `js/three/*` split out of the Staging reference. 03 Staging 3D.
5. Procedural 3D (no model needed): 01, 06, 09, 11, 07's thrown ball.
6. Mixamo bot pages: 02, 04, 05, 08, 10, 12, plus 07 trails. These need the FBX files in `assets/models/`; until they're there, the pages use the fallback mannequin and still work.

**Tier 3: extras**
7. Spot it. 8. Playground.

If time runs out, a principle page without its 3D version hides the 2D/3D switch entirely (no "coming soon" text).

**Every page must pass before it's done:**
- No scrollbar at 1280×720, 1366×768 and 1920×1080, in normal and present mode.
- Works from Live Server and from GitHub Pages (relative paths).
- Keyboard only: every control reachable, visible focus, shortcuts work.
- No `innerHTML` in the page's JS; markup lives in HTML.
- `prefers-reduced-motion` respected.
- 3D holds 60 fps on a college PC; render loop stops when the 3D view is hidden.
- No references to The Goal. Principle order matches section 2.
- Copy follows section 4 (sentence case, no ALL-CAPS labels, no middle-dot strings).

## 15. Defaults (Paul can change these later; don't stop to ask)

- Home headline: "Twelve principles, every one switchable".
- Repo name: `animation-principles`.
- Notes strip copy: as written in section 8.

## 16. Things that are already solved (don't relearn them)

**Paul's ball.** The original CSS said `transform-origin: centre bottom`. Browsers ignore that line because of the British spelling, so the squash has always happened from the ball's centre, and the positions (`top: 60%`, shadow at 385px) were tuned around that. Changing it to `center bottom` pushes the squashed ball about 40px below its shadow. The reference uses `center center`: valid code, identical look. The port keeps every value and converts px to container units (`container-type: size`, 160px = 20cqw, 30px = 3.75cqw, 385px top = 80.208cqh) so it scales without changing. Colours changed to violet, and the shadow became a soft violet because the original dark shadow is invisible on navy. The Off state uses the same timing with no scale and lands at `top: 51.67%`, so the unsquashed ball touches the same floor.

*Tier 1 addition, at Paul's request:* a small **stretch at speed** on the home page and on 01. Two keyframes were added (10% holds the shape his ball already has there, so it never dips below the floor; 30% is the stretch, about 0.9 × 1.15). His 0%, 40% and 100% values and `transform-origin` are unchanged. On 01 the stretch scales with the Amount slider (`--amount`), and the contact `top` is worked out so the squashed ball always lands on the same floor at any amount (see the comment in `css/pages/01.css`).

**Timeline.** `bindTimeline()` in the 06 reference works with any Web Animation, including CSS `@keyframes` (via `el.getAnimations()`), at 25 fps. Use it on every 2D page.

**Graph Editor.** Handle x is clamped to 0–1 so the curve stays solvable by bisection; y can go from -0.25 to 1.25 for overshoot. The keyframe icons switch halves (diamond for linear, hourglass for eased) from the handle positions.

**3D lighting.** The light values, fog (`Fog(BG, 9, 24)`, so the floor fades into the background with no horizon line) and floor colour in the Staging reference are tuned and screenshot-checked. The silhouette test also recolours the fog and flips the title to dark (`data-silhouette` on the stage area); without that the title vanishes on the pale ground.

**Dropdown.** Uses the `hidden` attribute plus a `data-open` fade; closes on Esc and outside click; right-aligned under the link. In the glass layer it's deliberately more opaque than the other panels, so the list stays readable over the page.

**Glass layer.** Checked at 1280×720, 1366×768 and 1920×1080 on all four reference pages, including the open dropdown. Body padding (12px) and grid gaps (10px) are part of the layout, and nothing scrolls. The background is a CSS background on `body::before` (fixed), so it costs nothing per frame.

**Glass flicker (Tier 1).** In Firefox the live `backdrop-filter` flickers while demos animate. Paul develops in Firefox but **presents in Chrome**, and wants the live blur kept: a pre-blurred background was tried and reverted at his request. Don't replace the live blur. Two Chrome-safe mitigations are in place: the timeline only writes to the page when the frame changes, and `.hdr, .panel, .notes, .stage-area` have `will-change: transform` (in `glass.css`). If Chrome on the presentation PC flickers, raise it with Paul before changing the glass.

---

## 17. Tier 1 record and Tier 2 handover

### 17.1 What's built (Tier 1, complete)

- Shared files: `css/tokens.css`, `base.css`, `shell.css`, `components.css`, `glass.css`; `js/core/menu.js`, `present.js`, `toggles.js`, `sliders.js` (added), `timeline.js`, `bezier.js`, `draig.js` (added); self-hosted Inter and JetBrains Mono in `assets/fonts/` (with OFL licences); README.
- `index.html` (home) and `principles.html`, matching their references.
- All 12 principle pages, **2D only**. Every page passes: no scroll at 1280×720, 1366×768 and 1920×1080 in normal and present mode; no JS errors; no `innerHTML`; header identical on all 14 pages (apart from `aria-current` and paths); unique ids.
- **Draig** (`assets/svg/characters/draig.svg`, rig guide `docs/Draig_Character_Guide.md`) is the 2D character on 02, 03, 04, 05, 07 (head turn), 08, 10, 11 and 12. The 2D ball stays on 01, 06, 07 (thrown ball) and 09.
- Not built: Spot it, Playground (Tier 3), and every 3D view (Tier 2).

### 17.2 Decisions Paul made during Tier 1 (these override the sections above)

1. **Present button**: removed from the header; it sits full width under the previous/next links in the notes strip on the 12 principle pages. Home and Principles have no button; the `P` key works everywhere.
2. **Spot it and Playground**: greyed out (`<a aria-disabled="true">`, no `href`, 40% opacity, not clickable) in the header and on the home button. When a page is built, give its links an `href` again on all 14 pages.
3. **"The principle"**: every principle page's controls panel ends with a short explanation of the principle (`.explain`, pinned to the foot of the panel with `margin-top: auto`). Keep it when adding 3D controls.
4. **Reading text 14px minimum** (section 4). If a panel then overflows at 1280×720, trim duplicate wording rather than shrinking text.
5. **No code on the site**: learners aren't learning code. No CSS readouts or CSS terminology (06's was removed).
6. **02 Anticipation**: Predict it removed. Jump and Throw both use Draig.
7. **04 Pose to pose**: Draig's jump is built from key poses, each with its own outgoing easing (in / out / inout) so he doesn't stall in mid-air at take-off; the keyframe icons show each key's easing. Onion skin shows ghosts two frames either side; Make your own drags three keys.
8. **06**: 30-frame move (1.2 s) + 15-frame hold, 31 spacing marks.
9. **07 Arc**: Draig does the head turn (his face slides across his head and dips through the arc); the thrown ball stays a ball.
10. **10 Exaggeration**: the reference demo's take, as it is, plus one change: the mouth opens a little (a small "o") even at the realistic setting.
11. **12 Solid drawing**: four stages: Stick, Construction (Draig drawn *only* as simple forms, every part, no render behind), Flat, Full. Plus Turn the head and Twinning.
12. **03 Staging (2D)**: Draig is the subject. The 2D light plot (from the 3D reference) is in the panel: lamps fade to 25% when their light is off, and the camera wedge eases with Wide / Mid / Close. On Draig, every light follows his whole silhouette (masked by `#rig`): key strongest, warm, from the front-left; fill weaker, cool, from the right, lifting only the shadow side; rim cut from his outline (SVG filter), so it lights outer right edges (tail, ear, horn, wing, arm) and never draws across the front of his arm. Key off leaves only fill and rim. The crate and ball follow the same rules.
13. **Home and Principles**: the "In the order of the classroom posters" line is removed from the Principles page.
14. **Copy changed from section 8**: 05 Try this says "tail" (not "scarf"); 06 Try this follows the approved reference. The principle explanations are new copy, as are some panel notes. Paul may still edit.

### 17.3 How the 2D pages work (follow this when adding 3D)

- **Stylesheet order** on every page: `tokens, base, shell, components, pages/NN.css, glass`. Page CSS comes *before* `glass.css` on purpose, to reproduce the references' cascade. Page rules that must beat glass need higher specificity.
- **State in data attributes.** `toggles.js` wires any `.seg[data-target][data-attr]` (buttons with `data-value`) and `.pill[data-target][data-attr]` (`on`/`off`), then fires a `statechange` event on the target (`detail: { attr, value }`). `keepTime()` keeps CSS animations on the same frame when an `animation-name` swap would restart them. `setControl()` sets a state from code.
- **Sliders**: `.slider` with `<output>` readout; `sliders.js` writes `data-var` (times `data-scale`) to `data-target`; `setSlider()` from code.
- **Timeline** (`bindTimeline`): returns `{ setFrames, setKeys, setFrame, frameNow, isPlaying, play, pause }`. Positions use `frame / frames` (playhead, keys and tick marks line up), timecode `00:00:SS:FF` at 25 fps, keys from `data-keys` on the track, icons via `setKeyIcon(svg, in, out)` with `linear | eased | hold`. Under reduced motion it parks on frame 0. It only writes to the page when the frame changes.
- **Draig pages** pose him from JavaScript. A hidden `<span id="clock">` carries a dummy Web Animation (`rigClock`), so the shared timeline scrubs, pauses and steps Draig like any CSS animation; `runRig(clock, ms, pose)` calls `pose(t)` only when the time changes. Draig is pasted inline as a nested `<svg class="draig">` inside the page's scene SVG, inside a wrapper `<g>` positioned with `placeDraig()`; `groundShadow()` keeps his shadow on the floor. Second and third copies (11) suffix every id (`-b`, `-c`).
- **05 Follow through** precomputes its springs over the loop (so scrubbing is exact) and runs the same springs live in Drag it. **09 Timing** builds its drop per frame from physics through the Web Animations API.
- **The 2D/3D switch is not on any page yet**, following section 14 ("a page without its 3D version hides the 2D/3D switch entirely"). Each `<main class="page">` already has `data-view="2d"`.

### 17.4 Tier 2: what to plug into

- **The models are already in place**: `assets/models/` has YBot, XBot, Idle, Jump, Walking, Throw and RunToStop (`.fbx`). Paul doesn't need to download anything.
- **Per page**: add the reference's `<div class="seg compact" role="group" aria-label="View">` (2D / 3D) to the `.stage-head`, driving `data-view` on `<main>` (for example `data-target="main" data-attr="view"`). Add a 3D stage (canvas) that CSS shows only for `data-view="3d"`, with the stage area getting `is-3d` in that view (no blur behind a live canvas). Stop the render loop when 2D is showing or the tab is hidden; dispose cleanly.
- **Panels are tight at 1280×720.** Where the 3D view needs different controls, show the 2D or 3D set by view (hide the other) rather than stacking both. Keep "The principle" at the foot. Re-run the no-scroll check at all three sizes, in normal and present mode, after every page.
- **03 Staging 3D**: the 2D page already has the light plot in the panel. In the 3D view it becomes draggable and drives the lights (the reference's `lights.js` code), plus the Y Bot / X Bot subject switch from section 11.
- **3D timeline**: section 7 says the timeline works with any Web Animation. For mixer-driven 3D, use the same clock pattern as Draig (`rigClock`), so one timeline drives 2D and 3D; set the mixer time from the clock.
- **Split the Staging reference** into `js/three/stage.js`, `rig.js`, `lights.js`, `cameras.js`, `silhouette.js`, `clips.js` as section 7 describes, keeping its tuned light values, fog and floor colour.

### 17.4a Tier 2 progress
**Done: shared `js/three/` modules and 03 Staging 3D.**
- `stage.js` (renderer, scene, fog, floor, resize, `start()`/`stop()`; the loop also pauses while the tab is hidden; `reducedMotion`), `rig.js` (`createRig('YBot'|'XBot')` with `play`, `setTime`, `timeScale`, `stepped`, `update`; model paths resolve from the module, so any page depth works; fallbacks and `rig.note` as in section 11), `lights.js` (`createLights` with the reference values, lights orbit a focus point; `bindLightPlot` for dragging and arrow keys, `enable(false)` restores the HTML's static plan), `cameras.js` (`createShots`, eased, frame-rate independent, snaps under reduced motion; `follow: true` shots move with the focus), `silhouette.js`, `clips.js` (constants; empty apart from Idle so far).
- **Pattern for 3D pages:** the page script (`03-staging.js`) loads its 3D module (`03-staging-3d.js`) with `import()` the first time 3D is picked, so the 2D view never waits for Three.js or the models. Toggles stay on the stage area's data attributes, shared by both views; the 3D module listens for `statechange`. The stage area gets `is-3d` only in the 3D view. Panel controls that belong to one view carry `only-2d` / `only-3d`.
- **03 specifics:** Y Bot at the origin, X Bot at (-1.6, 0, -1.8); Subject switch eases the lights and the Mid/Close shots to the chosen figure, and dims the other figure in the plot. Clutter in 3D is a set of grey shelves and props. In 3D the plot is larger, and lamps are focusable sliders (arrow keys, Shift for bigger steps).
- **Changed from the reference:** Wide, Mid and Close were framed for the taller stand-in mannequin, so they are reframed for the 1.8-unit bots (the plot wedge lengths 90/58/36 are kept). Light values, fog and floor are unchanged.
- **For Paul to decide:** the 3D lights keep the reference's layout (key front right, fill front left, rim back left). The 2D plot is its mirror (key front left), so lamps swap sides when switching view. Mirroring the 3D angles would make them match.
- Checked in headless Chrome: no scroll or clipped panel at 1280×720, 1366×768, 1920×1080, normal and present; drag, arrow keys, every toggle, Subject, back to 2D; missing XBot and missing YBot; reduced motion. No console errors.

**Done: every Mixamo bot page (02, 04, 05, 07, 08, 09, 10, 12).** Still to do: procedural 3D for 01, 06, 11 (step 5).
- **Shared additions:** `js/three/view.js` (`bindView(load, { onSwitch })` does the 2D/3D switch, `is-3d` and the lazy load for every page; `clock3d` / `clockSeconds` / `handOver` let one timeline drive both views: in 3D the timeline's `getAnims` returns the 3D view's clock, a do-nothing Web Animation on the canvas with `id: 'clock3d'`, which `keepTime()` in toggles.js leaves alone). `js/three/studio.js` (stage + lights + camera; `addBot` with the status line). `js/three/poses.js` (`capturePose`, `scalePose` scales every joint's turn from a reference pose, `turnBone` turns a bone about a world axis, `feetHeight`). `rig.js` gained `bones` and `bone(name)` (from the skin's skeleton: the cloned FBX has a second, unused copy of every bone), `scale`, `play(name, { inPlace })`, `inPlaceClip`, `clipTravel`. `js/core/drop.js` holds 09's drop physics for both views. The 2D/3D CSS (`.stage-3d`, `only-2d` / `only-3d`, `top-2d`) is in `components.css`.
- **Two traps with the bots, both handled in `rig.js`:** (1) YBot.fbx has some bones twice under one name, one nested in the other, and each mesh has its own skeleton. Pose tools must turn the bones the mixer drives (`rig.bones`, found with `PropertyBinding.findNode`), or only part of the Y Bot moves. (2) The mixer only writes a bone when its animated value changes, so while paused a pose tool's change would build up every frame (the figure flew off). `rig.setTime()` puts the last clean mixer pose back before each update. Always pose through `rig.setTime()`, never `mixer.setTime()` directly. Bots also have `frustumCulled = false`, because pushed poses outgrow the skinned mesh's bounds.
- **Clip constants** (`clips.js`) were read off the clips in the browser: Jump crouch 0.15–0.7 s (deepest 0.55), take-off 0.75, top 1.0, landing 1.3; Throw (right hand) wind-up from 0.3, release 1.68; Walking 1.03 s per cycle, travelling 1.72 m; RunToStop stops by 1.0 s. Walking and RunToStop are not "in place" files, so walks use `inPlace` and move the figure at the clip's own speed.
- **02 Anticipation:** Y Bot, Jump only (the Action switch is 2D only: Throw's wind-up includes a big step forward, so cutting it out would jump the figure). Wind-up sets the crouch's length and depth; Off cuts from standing to `anticipationEnd`. Keys and the wind-up highlight follow the slider.
- **04:** X Bot. Keys only = `stepped(JUMP_KEYS)`; onion skin = two see-through copies two frames either side. Make your own is 2D only.
- **05:** Y Bot RunToStop wearing a cloak. Paul turned down a tail (wrong on a human figure) and then a ponytail (it whipped about after he'd stopped). Free cloth was tried too and dropped: his stride pumped it, it flew horizontal, and it could stick over his shoulder. The cloak is a chain of three linked damped pendulums (top, middle, bottom bands) driven by his smoothed forward speed and acceleration, the same idea as the 2D springs. Each column of cloth is built down from the shoulders and pushed out as it goes: behind his back and the backs of his legs (an oval round the spine, its depth measured off the Y Bot's surface: 11 to 16 cm, deepest at the seat), round capsules on his arms and legs (always out behind a limb, never out the front), and never further forward than the middle of his body at the sides. Plain capsules weren't enough: there were gaps at the seat and the cloth could be pushed out the front. The grid is 13 × 24, so a leg can't slip between points. Running: it trails about 35° (air drag). Stopping: it swings forward, each band a moment after the one above. Stiffness is spread evenly along the slider (Paul: at first 50% already looked like 100%). It sets how firmly the bands hold together (exponential, 6 × 50^s), how far forward the cloak can swing (−50° loose to −15° stiff), and how closely it hugs him (stiff stands a little off his back and wraps round his sides less). Measured lag of the hem behind the top band at the stop: 33° at 0%, 24° at 25%, 16° at 50%, 18° at 75%, 4° at 100%. A three-quarter camera from behind shows the cloak's surface. Fixed 1/120 s steps. Drag it (pointer or arrow keys) with Idle. Live physics, so the timeline is 2D only. Try this reads "tail" in 2D and "cloak" in 3D (`only-2d` / `only-3d` also work in the notes strip).
- **07:** X Bot, Throw or Walk, trail on Hand / Head / Foot (fading half second; the hand trail follows the palm), Show motion path adds the whole path with a dot per frame. The ball sits in the palm (between wrist and knuckles, lifted off the palm along the palm's normal). Arc: it leaves the hand at `THROW.releaseUp` (1.54 s, palm at head height moving up and forward about 37°) and flies as a true projectile at the hand's upward angle. In Arc the height slider is the power of the whole throw (Paul: a full wind-up for a feeble lob looked wrong): lower power shrinks the wind-up and follow-through (`scalePose` from the standing pose, 55% at 0%, feet held on the floor) and slows the forward throw (clip 1.3 to 1.9 s played at 65% speed at 0%), and the ball leaves at the palm's actual speed × `BALL_SPEED` (0.65, so the hardest throw lands on the stage). Measured: 0% releases at 1.68 s and flies 0.56 s; 100% releases at 1.56 s and flies 0.96 s. The ball's timing along the arc is an animator's, not pure physics (Paul: the big throw felt one speed): the same parabola, with `arcTime()` spending more frames near the top (about half speed there) and fewer at the ends, so it hangs at the top and speeds up into the floor; the flight takes the same total time. The ball always travels along the way he faces (straight across the screen), never towards the camera. Straight: it leaves at `THROW.release` (1.68 s, hand moving down) at the hand's own speed (about 11 m/s, so it reaches the floor in about 0.3 s) in a straight line. Timeline keys (wind-up, release, landing) follow the choice.
- **08:** Y Bot walks across (three cycles). Subtle: a glance at the camera and a small wave; Too much: head, arms and spine never settle.
- **09:** Drop (balloon, football, bowling ball side by side, same drop code as 2D) or Walk (X Bot, one cycle in 40 / 26 / 16 frames). Linear / Gravity and On twos are shared. Weights, Frames, ghosts and Guess the weight are 2D only.
- **10:** Y Bot Jump; k = 1 + amount × 0.6 (Realistic is the capture as it is). Feet are held on the floor while they touch it. Own 3D note under the presets.
- **12:** X Bot (Y Bot / X Bot switch), OrbitControls plus arrow keys on the focused stage; Wireframe / Clay / Normals / Lit (the key circles slowly in Lit); Twinning = the bind pose with both arms lowered the same amount.

### 17.5 Working notes

- **git** isn't on PATH on Paul's PC. Use GitHub Desktop's copy, for example `%LOCALAPPDATA%\GitHubDesktop\app-3.6.10\resources\app\git\cmd\git.exe` (the version folder changes when Desktop updates). Commits work from Claude Code; **pushing doesn't** (the GitHub login lives in GitHub Desktop), so commit per page and ask Paul to press **Push origin** in GitHub Desktop.
- **Checking pages**: Node 24 and Chrome are installed. Headless Chrome via the DevTools protocol works for screenshots and for measuring scroll and clipped panels; Firefox is also installed. These checks were scratch scripts, not part of the repo.
- **Browsers**: Paul develops in Firefox (for its inspector) and presents in **Chrome**. Judge the look in Chrome.
- **Performance to confirm on a college PC**: the Draig plush filter (`dg-plush`) re-renders while he animates. If a page stutters, remove `filter="url(#dg-plush)"` from that page's copy (Draig guide, Performance).
