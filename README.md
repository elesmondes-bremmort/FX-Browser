# FX Browser

FX Browser is a Foundry VTT v13 module for GMs who want to browse, search, preview, and drag animated `.webm` effects onto a scene as synchronized FX Overlays.

The first version focuses on JB2A-style animated assets and custom folders. It does not require Sequencer or FXMaster. Internally, FX Browser uses native Foundry Tile documents with module flags so overlays persist in the scene and synchronize to connected players.

## Features

- GM-only dock button with toggle behavior.
- Floating, draggable, resizable browser window with remembered size and position.
- Automatic scan of common JB2A Free and Patreon module folders.
- Custom scan folders through Foundry module settings.
- Cached `.webm` library with a manual Rescan action.
- Search by cleaned name, full path, or category.
- Automatic categories such as Fire, Smoke, Magic, Explosion, Portal, Rune, Aura, and Other.
- Animated card thumbnails and large checkerboard preview.
- Play/Pause and Restart controls.
- Placement settings for width, height, opacity, rotation, loop, visibility, lock state, z-index, elevation, and overlay name.
- Drag and drop to the canvas to create an FX Overlay at the drop position.
- Scene FX list with select, edit, and delete actions.
- Editor for X, Y, width, height, rotation, opacity, loop, visibility, lock state, and z-index.

## Installation

Copy the `fx-browser` folder into Foundry's `Data/modules` directory, enable the module in your world, then reload the world.

## Custom folders

Open Foundry's module settings for FX Browser and add one Foundry data path per line or separated by commas.

Example:

```text
modules/my-effects
worlds/my-world/assets/fx
```

## Robustness

Missing JB2A folders, invalid custom folders, deleted WebM files, no active scene, or an unready canvas should show a notification instead of blocking play. Players see FX Overlays through Foundry synchronization, but only GMs can create, edit, or delete them.

## Version

Current version: `0.1.0`.
