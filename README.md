# Principles of Animation

Interactive classroom site for the 12 principles of animation (UAL Level 2 Creative Media).

Plain HTML, CSS and JavaScript modules. No build step: GitHub Pages serves the files as they are, and every file can be edited in GitHub's web editor.

## Run locally
Open the folder in VS Code and use the Live Server extension ("Go Live"). Opening files by double-click won't work, because the pages use JavaScript modules.

## Publish
Settings › Pages › Deploy from a branch › `main` / root. The site appears at `https://<username>.github.io/animation-principles/`.

The site is unlisted, not private: anyone with the link can open it. Every page carries `<meta name="robots" content="noindex, nofollow">` so search engines skip it.

## Keyboard
| Key | Does |
|---|---|
| `Space` | Play / pause |
| `Page Up` / `Page Down` | Back / forward one frame |
| `Home` / `End` | First / last frame |
| `P` | Present mode (projector) |
| `Esc` | Close the menu, or leave present mode |

## Where things are
| Path | What |
|---|---|
| `index.html`, `principles.html` | Home and the Principles page |
| `principles/NN-*.html` | One page per principle |
| `css/` | `tokens.css`, `base.css`, `shell.css`, `components.css`, `glass.css`, and `pages/` for each page |
| `js/core/` | Shared modules: menu, present mode, toggles, sliders, timeline, Bézier maths |
| `js/three/` | Shared 3D modules: stage, Mixamo rig, lights and light plot, camera shots, silhouette test, clip constants |
| `js/pages/` | One small script per page |
| `assets/fonts/` | Inter and JetBrains Mono, self-hosted (SIL Open Font License) |
| `docs/` | Build handover and the approved reference pages |

## 3D models
Download these from Mixamo (FBX Binary, 30 fps) and put them in `assets/models/` with exactly these names:

- `YBot.fbx` and `XBot.fbx`: With Skin, T-pose
- `Idle.fbx`, `Jump.fbx`, `Walking.fbx`, `Throw.fbx`, `RunToStop.fbx`: Without Skin (tick In Place where offered)

That's all. No other software is needed. All seven are already in the repo; if one goes missing, pages show a stand-in mannequin (or a still model) instead of breaking.
