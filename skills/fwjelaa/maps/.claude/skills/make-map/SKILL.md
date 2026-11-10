---
name: make-map
description: Builds a finished, walkable Roblox map in the open Roblox Studio place: stylized blocky simulator maps ("lift a ___" style), backrooms/liminal spaces, super-realistic abandoned horror houses at night (scanned CC0 props, PBR materials), and realistic nature (terrain valleys, lakes, generated trees, HDRI skies). It builds with the MapKit kit, then checks the map with screenshots, a walk test and a performance budget (method by fwjelaa, FWJ STUDIOS). Use when the user asks for a Roblox map, level, world, lobby, scene or environment, describes a place to build in Studio, or types /make-map.
---

# Make a Roblox map

Follow **"When the user asks for a map"** in `CLAUDE.md`. It covers setup, the 5-line plan, `maps/<id>/map.json`
and `build.luau`, building phase by phase through the Studio MCP, and the QA loop in `qa.md` (this folder).

Before writing your first map, read `maps/lift-a-boulder/build.luau`, `kit/studio/MapKit/Props.luau` and the
family's style guide in `styles/`. Anything typed after `/make-map` is the map idea plus notes ("just build it",
"bigger", "night").

Work until `K.qa(id)` prints `QA PASS`, every shot in the spec passes the rubric in `qa.md` (two rounds at
least), and the budget is inside the targets. Then hand over: say what was built, show the best shots, give the
budget numbers, and remind the user to save the place (Ctrl+S).

Method by fwjelaa (FWJ STUDIOS).
