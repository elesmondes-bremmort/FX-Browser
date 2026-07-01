# Changelog

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
