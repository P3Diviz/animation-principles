# Principles of Animation site

Read `docs/Animation_Handover.md` in full before any work. It holds every decision for this site.
**Tier 1 is complete and Tier 2 (3D) is nearly done. Read section 17, then start at 17.6** (the next job, decisions Paul has settled, and testing lessons). Paul's decisions in section 17 override earlier sections.

- Match the approved pages in `docs/reference/`. Don't redesign them.
- Follow the build order in section 14 and commit after each page. Paul pushes from GitHub Desktop (section 17.5).
- Don't stop to ask about anything section 15 already gives a default for.
- Never change Paul's ball values or its `transform-origin` (section 16). The small stretch at speed was added at his request.
- Plain HTML, CSS and ES modules. No build tools, no `innerHTML`, relative paths only.
- Draig is the 2D character: see `docs/Draig_Character_Guide.md`.
- Keep the live glass blur (section 16, Glass flicker). Paul presents in Chrome.
- 3D pages: use the shared `js/three/` modules and the pattern in 17.4a. Pose bots only through `rig.setTime()` and the tools in `poses.js`; never turn arms about a fixed world axis.
- Paul checks every 3D view by eye: check poses close up, at slider extremes and while paused, and measure (don't eyeball) before calling a page done.
