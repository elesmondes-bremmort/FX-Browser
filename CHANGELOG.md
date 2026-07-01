# Changelog

## 0.0.20

- Add a Scene FX manager panel for native FX Tiles, opened from the FX Browser toolbar.
- Add Normal and Foreground render modes using `sort/elevation` values of `1` or `999`.
- Add scene-list selection, visibility toggles, per-FX deletion, and global normalize/hide/show actions without changing native Tile interactivity.

## 0.0.19

- Remove the experimental ambient light compensation preset and automatic AmbientLight creation from FX drops.
- Return scene cleanup to deleting only native FX Tile documents.
- Add an emergency cleanup button for legacy V0.0.18 generated FX lights marked with `fx-browser.generatedLight`.

## 0.0.18

- Add optional experimental AmbientLight compensation for newly dropped native FX Tiles.
- Store a global light compensation preset with enablement, level, intensity, radius, color, reset, and manual sync controls.
- Link generated lights to FX Tiles so they follow movement and are removed with their Tile or by the scene-wide FX cleanup.

## 0.0.17

- Revert scene FX handling to plain native Foundry Tile documents with `fx-browser` flags only.
- Remove the custom FX Overlay edit layer, selection frame, canvas pointer listeners, and Pixi interactivity overrides.
- Simplify FX drops to create one native Tile at `sort = 1` and `elevation = 1`, with scene-wide FX deletion kept behind a confirmation dialog.

## 0.0.16

- Restore native Foundry Tiles/select interaction for FX Browser overlays while keeping pass-through behavior in other controls.
- Reapply FX tile interactivity on ready, canvas ready, tile creation, scene-control changes, and Tiles layer activation.
- Keep FX drops lightweight by creating only the Tile document and avoiding full app refreshes or layer redraws during drop.

## 0.0.15

- Restore FX Browser tile interactivity while the FX Overlay edit tool is active, with pointer cursor support for selectable scene FX.
- Return FX Browser tiles to non-interactive pass-through behavior outside FX Overlay mode.
- Keep manual FX hit testing scoped to FX Overlay mode and apply the same FX identification to scene-wide deletion.

## 0.0.14

- Add manual FX tile hit testing in scene coordinates so high z-index overlays can be selected independently of native Tile selection.
- Add a PIXI selection frame and label for the active FX Overlay, with click-empty deselection and manual drag-to-move updates.
- Mark new overlays with robust `fx-browser` flags and include fallback detection for older WebM overlays.
- Move Scene Controls wiring to Foundry v13 `onChange` and use Foundry Dialog confirmation for scene-wide FX cleanup.

## 0.0.13

- Add an FX Overlay edit tool to the native canvas controls so scene FX can be selected, moved, focused, edited, and deleted on demand.
- Disable FX Overlay tile interactivity outside FX edit mode so high z-index effects no longer block native Token, Tile, Lighting, Wall, or other tools.
- Default new FX Overlays to z-index 10 while keeping the value editable.
- Add Delete-key removal for the selected FX and an internal confirmation flow to delete all FX Overlays from the current scene.

## 0.0.12

- Simplify the main library navigation around virtual tabs: ALL, FAVORIS, and GM-created folders.
- Move Origin Vault source management behind a discreet Sources panel while keeping scans and source counts available.
- Replace browser prompts with an internal dark/gold context menu and inline forms for asset and folder organization.
- Expand the selected asset detail panel with original name, category, source, favorite state, virtual tabs, path, and quick actions.

## 0.0.11

- Separate top-bar asset search from source management and show precise empty states for missing libraries, unscanned sources, and no search matches.
- Clean the library sidebar with compact single-line Origin Vault source rows, inline enable toggles, counts, and remove actions.
- Widen and stabilize the sidebar so Sources, virtual folders, and detected sources remain readable without horizontal scrolling.

## 0.0.10

- Add persistent Origin Vault source selection with enabled/disabled repositories, manual source entry, and recursive scanning.
- Make Origin Vault the primary FX source while keeping direct JB2A scanning optional.
- Persist virtual organization metadata with Origin Vault repository ids, item ids, folder parent/sort data, favorites, and display names.

## 0.0.9

- Fix search input focus loss by updating only the asset grid with a light debounce while typing.
- Keep Scene Control events native and limit event cancellation to FX Browser internals and FX overlay drops.
- Add virtual library organization with source filters, favorites, personal folders, virtual renaming, and missing-asset display.

## 0.0.7

- Move the GM-only FX Browser launcher back into Foundry's native left Scene Controls with a flame icon.
- Increase fixed asset card dimensions so large libraries remain scrollable and readable without eager-loading videos.

## 0.0.6

- Move FX Browser to a GM-only right-side custom control button with matching dark/gold round styling.
- Improve asset list readability with fixed-height scrollable cards that keep names, categories, and playback badges visible.

## 0.0.5

- Stop Foundry native audio handling from creating AmbientSound documents when dropping FX Browser overlays.
- Restrict FX Browser drag payloads to the custom overlay MIME/type and keep native non-FX drops untouched.

## 0.1.0

- Create the initial Foundry VTT v13 FX Browser module.
- Add GM-only dock button and toggleable browser window.
- Add JB2A/custom folder WebM scan with caching.
- Add search, category filters, animated cards, and preview panel.
- Add placement settings and drag/drop Tile creation.
- Refactor placement into persistent synchronized FX Overlays backed by native Foundry Tiles and module flags.
- Add scene FX list and minimal overlay editor for movement, sizing, rotation, opacity, visibility, locking, z-index, and deletion.
