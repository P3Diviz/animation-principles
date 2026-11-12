# Principles of Animation

Interactive classroom site for the 12 principles of animation (UAL Level 2 Creative Media).

## Run locally
Open the folder in VS Code and use the Live Server extension ("Go Live"). Opening files by double-click won't work, because the pages use JavaScript modules.

## Publish
Settings › Pages › Deploy from a branch › `main` / root. The site appears at `https://<username>.github.io/animation-principles/`.

## 3D models
Download these from Mixamo (FBX Binary, 30 fps) and put them in `assets/models/` with exactly these names:

- `YBot.fbx` and `XBot.fbx`: With Skin, T-pose
- `Idle.fbx`, `Jump.fbx`, `Walking.fbx`, `Throw.fbx`, `RunToStop.fbx`: Without Skin (tick In Place where offered)

That's all. No other software is needed. Pages show a stand-in mannequin until the files are there.
