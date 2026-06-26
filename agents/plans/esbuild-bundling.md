# Esbuild Bundling Plan

## Goal

Bundle the extension entry point with esbuild and minify release builds to reduce packaged JavaScript size.

## Constraints

- Keep `vscode` external because the extension host provides it.
- Preserve CommonJS Node output required by VS Code.
- Compile tests separately because the extension bundle contains no test files.
- Package only the extension bundle from `out/` so stale compiler output cannot inflate the VSIX.

## Success Checks

- `npm run compile` emits `out/extension.js` and its source map.
- `npm run vscode:prepublish` emits a minified `out/extension.js`.
- `npm test` passes.
