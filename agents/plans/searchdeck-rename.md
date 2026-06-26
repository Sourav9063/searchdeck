# SearchDeck Rename Plan

## Goal

Rename the prior extension identity to SearchDeck / `searchdeck` / `searchDeck`.

## Scope

- Package and visible product names
- Command IDs, webview ID, configuration keys, and persisted recent-file key
- Runtime UI labels and accessibility text
- README, launch configuration, license, lockfile, and existing implementation plan

Repository directory name is outside extension identity and remains unchanged.

## Compatibility

This is a complete pre-release identity rename. Old command IDs, configuration keys, and persisted recent-file state are not retained as aliases.

## Success Checks

- No prior product-name or identifier references remain in project files.
- TypeScript compilation passes.
- Automated tests pass.
