---
name: make-model
description: Turns a reference picture into a polished, textured Roblox model built in Blender (method by fwjelaa, FWJ STUDIOS). Use when the user sends, attaches or names a picture of a character or prop and wants a 3D model, a Roblox model or "this made in Blender", or types /make-model.
---

# Make a Roblox model from a picture

Follow **"When the user sends a picture"** in `CLAUDE.md` from start to finish, using the kit rules, quality bar and
gotchas there. `build/BearBuddy.py` is the finished example.

Anything the user typed after `/make-model` is the model's name or extra notes ("make the hat bigger", "it's a
pet, not a character").

Work until the model passes the quality bar and `python kit/run.py export <ModelId>` prints `ROBLOX READY`. Then show
the final compare image, list the Roblox files, and explain how to get it into Roblox (auto-upload if set up,
otherwise File → Import 3D).

Method by fwjelaa (FWJ STUDIOS).
