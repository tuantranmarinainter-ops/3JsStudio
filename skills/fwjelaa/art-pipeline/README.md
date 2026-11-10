# Roblox art pipeline (Blender → Roblox)

A code-driven art pipeline for Roblox games, extracted from "Run a Haunted Graveyard". You describe props, icons and
UI panels in short Python/Blender scripts; one command turns them into hand-painted, low-poly **meshes with baked
textures** that load in Roblox as `MeshPart`s, plus painted **UI icons and 9-slice UI panels**. A generator writes the
Luau tables (`Art.luau`, `UiAssets.luau`) your game reads, so a prop in code is one line: `ArtService.clone("Lamp_Post")`.

58 example props and 44 example icons (a haunted-graveyard set) are included. Use them as templates or delete them.

![props](docs/example-props.png)
![icons](docs/example-icons.png)

## What you need
- **Blender 5.1** (the scripts run headless; tested on 5.1 on Windows). Other 5.x versions will probably work, older
  ones may not.
- **Python 3.10+** with `pillow` and `numpy` (`pip install pillow numpy`).
- A Roblox account and Roblox Studio to upload and import the results.
- Optional: [Rojo](https://rojo.space) if you want the generated `.luau` files synced into Studio.

## Folder map
```
art/
  blender/    mhg.py = the engine (shapes, paint, bake, export)    assets_*.py = the props and icons (examples)
              build.py = the command you run                         icons_post.py / sheet.py = finishing and previews
  tools/      uploads.py   make_art.py   make_ui_assets.py   make_fbx.py   publish_animations.py
  ui/         make_ui.py (paints the 9-slice UI kit)   mockup.py (a quick look)   fonts/
  animation/  Blender scripts for R15 animations (advanced, optional)
  plugin/     a Studio plugin that uploads meshes (see "Uploading")
  uploads.json   empty to start: which file is uploaded as which Roblox asset id
src/shared/Game/   where Art.luau and UiAssets.luau get written (move it if your project differs)
```
Generated output goes to `art/out/` (meshes, textures, icons, ui, manifest) and `art/previews/` (a render per asset).
You can delete `art/out` and `art/previews` any time and rebuild.

## Quick start
Run these from the folder that contains `art/`. On Windows the Blender path is usually
`C:/Program Files/Blender Foundation/Blender 5.1/blender.exe`.

```bash
# 1. Build props and icons (headless). The part after -- is a name pattern; leave it out to build everything.
blender -b --factory-startup -P art/blender/build.py -- "Gravestone_*" "Icon_Coin"

# 2. Finish icons: dark outline, soft shadow, 256 px
python art/blender/icons_post.py

# 3. Look at what you made: a render per asset is in art/previews/, or one contact sheet:
python art/blender/sheet.py

# 4. Paint the UI kit (panels, buttons, chips) with its 9-slice margins
python art/ui/make_ui.py
```
A first full build of everything takes a few minutes.

## Making your own props
Open `art/blender/assets_plot.py` for examples. An asset is a function that returns a Blender object (or a dict of
named parts) and is registered with a decorator:

```python
from mhg import asset, box, cyl, join, paint, wobble, solid

@asset("Prop_Lantern", texture=512, collide="Box")
def lantern():
    iron = paint("iron", rust=0.4)                       # a painted material kind (see PAINTS in mhg.py)
    post = cyl(0.12, 3.0, loc=(0, 0, 1.5), verts=8, mat=iron)
    base = box((0.9, 0.9, 0.3), loc=(0, 0, 0.15), mat=paint("stone", moss=0.5))
    wobble(base, 0.02, 1.5, seed=3)                      # hand-made, not perfectly straight
    glass = cyl(0.3, 0.6, loc=(0, 0, 3.2), mat=solid("#FFB050"))   # untextured glowing part
    return {"Main": join([post, base], "Main"), "Glow": glass}
```
Rules the engine follows (so things land correctly in Roblox):
- **1 Blender unit = 1 stud.** Blender is Z-up with the front facing **-Y**; export converts to Roblox (Y-up, front -Z).
- **The origin is the ground centre** of the prop, so `PivotTo` puts it on the floor.
- A normal part gets its own **baked texture** (procedural paint + ambient occlusion + worn edges). A part made with
  `solid("#hex", kind="Neon" | "Glass")` is untextured and becomes a Neon/Glass `MeshPart`.
- `collide="Box" | "Hull" | "Default"` sets the collision fidelity for the whole asset.
- Add a new file `assets_myset.py` and one line `import assets_myset` in `build.py`.
- Icons use `@icon("Icon_Name")` the same way, facing the camera (-Y), chunky enough to read at 40 px.

Helpers worth knowing: `box cyl ball ico torus tube from_profile arch_points text cut chip wobble taper lean radial
join paint solid` (all in `mhg.py`, with docstrings).

## Uploading and getting the Luau tables
The pipeline tracks what is uploaded in `art/uploads.json` (file name → Roblox asset id + a hash, so a changed file is
flagged for re-upload).

```bash
python art/tools/uploads.py pending           # lists the meshes/textures/icons that still need uploading
# ...upload them (below), write {"<file key>": <asset id>} into ids.json...
python art/tools/uploads.py record ids.json   # records the ids with file hashes
python art/tools/make_art.py                  # writes src/shared/Game/Art.luau (only fully uploaded assets)
python art/tools/make_ui_assets.py            # writes src/shared/Game/UiAssets.luau (icons + UI kit)
```
File keys look like `Prop_Lantern_Main` (a mesh), `Prop_Lantern_Main.png` (its texture), `icons/Icon_Coin.png`,
`ui/ui_panel.png`. Run `pending` to see the exact keys.

How the original project uploaded:
- **Textures, icons and UI images:** through the Roblox Studio MCP tool `upload_image`, which returns an image asset id.
  I have not tested uploading them by hand in Creator Hub; if you do, make sure you record the **Image** asset id, not
  the Decal id (they differ).
- **Meshes:** in Studio, File → Import 3D. `python art/tools/make_fbx.py` packs every mesh part into one FBX
  (`art/out/MHG_Props.fbx`); for only some assets, pass a file name and name patterns after `--`, for example
  `blender -b --factory-startup -P art/tools/make_fbx.py -- MyProps.fbx "Prop_*"`. After importing, read each
  MeshPart's `MeshId` from the imported model and record it under its mesh key.
- `art/plugin/` is a small Studio plugin that uploads meshes automatically with `AssetService:CreateAssetAsync`.
  Roblox had that call disabled in Studio at the time of writing (a Roblox bug, Oct 2026), so use Import 3D instead.

Using `Art.luau` in a game is up to you. The original `ArtService` (not included) turned each entry into a `Model` of
`MeshPart`s with `AssetService:CreateMeshPartAsync`, cached it, and handed out clones.

## UI kit
`art/ui/make_ui.py` paints panels, ribbons, buttons, chips and toasts as PNGs in `art/out/ui/` and writes `kit.json`
with each image's 9-slice margin. `make_ui_assets.py` turns uploaded ones into `UiAssets.luau` so a Roblox
`ImageLabel` can use `ScaleType = Slice` with the right `SliceCenter`. `python art/ui/mockup.py` composes a test screen.
Colours come from the `PALETTE` dict at the top; change it to restyle everything.

Fonts in `art/ui/fonts` (Creepster, Fondamento, Fredoka, Grenze Gotisch, Luckiest Guy, Nunito) are from Google Fonts
under open licenses (SIL OFL / Apache 2.0). Check each font's license page before redistributing the files.

## Animations (advanced, optional)
`art/animation/` holds the Blender scripts that made 16 R15 animations (idle, walk, dig, chop, mine, zombie shamble...)
in the original game. They are more fragile than the rest: they need

1. the **animate-roblox-characters** Claude skill's scripts (provides `authentic_rig.py`), not included. Set the
   environment variable `ANIMATE_SKILL_SCRIPTS` to that folder before running;
2. the **rbx_anims** Blender add-on, not included (it imports/exports Roblox `.rbxanim`);
3. an R15 Motor6D rig in Blender: `zombie_r15_work.blend` is the one used.

Run from the `art/animation` folder: `blender -b zombie_r15_work.blend -P build_player_tools.py`. It writes `.rbxanim`
files to `export/` and review renders to `review/`. `python art/tools/publish_animations.py convert|publish|luau`
converts them to KeyframeSequences and uploads them with Roblox Open Cloud. It reads your API key from the
`ROBLOX_API_KEY` environment variable (never saved to disk) and your user id from `ROBLOX_USER_ID`; it publishes under
a **user**, not a group. The key needs the Assets read and write permission.

## What is not included (on purpose)
- The game itself, its Roblox ids (`uploads.json` starts empty), store ids and API keys.
- The `create_monetization.py` store-item tool (it belongs to the game, not the art).
- Generated output (`art/out`, `art/previews`, `.rbxanim`/`.rbxmx` files): rebuild it.
- The `rbx_anims` add-on and the animate-roblox-characters skill (other people's work; get them from their authors).

## Checked
The pipeline was run from a clean copy of this folder: props and icons built in Blender 5.1, icons finished, the UI kit
painted, an FBX exported, ids recorded, and `Art.luau` and `UiAssets.luau` generated. The animation part was not re-run
from the clean copy (it needs the two outside dependencies above).

Add your own license before sharing. The example props and icons are original work made for the haunted-graveyard game.
