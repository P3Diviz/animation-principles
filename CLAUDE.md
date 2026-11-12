# Principles of Animation site

Read `docs/Animation_Handover.md` in full before any work. It holds every decision for this site.
**Tier 1 is complete; start with section 17** (what's built, Paul's Tier 1 decisions, which override earlier sections, and the Tier 2 handover).

- Match the approved pages in `docs/reference/`. Don't redesign them.
- Follow the build order in section 14 and commit after each page. Paul pushes from GitHub Desktop (section 17.5).
- Don't stop to ask about anything section 15 already gives a default for.
- Never change Paul's ball values or its `transform-origin` (section 16). The small stretch at speed was added at his request.
- Plain HTML, CSS and ES modules. No build tools, no `innerHTML`, relative paths only.
- Draig is the 2D character: see `docs/Draig_Character_Guide.md`.
- Keep the live glass blur (section 16, Glass flicker). Paul presents in Chrome.
