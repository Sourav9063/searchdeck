# VS FZF

Telescope-style search for VS Code.

VS FZF opens inside the editor area as a real tab. Search results stay where you left them, previews stay visible, and multiple searches can remain open while you keep working.

![VS FZF interface](https://img.shields.io/badge/editor--tab-files%20%7C%20text%20%7C%20symbols-blue)

## Why Install

VS Code already has great Quick Open, text search, and symbol search. VS FZF brings those workflows into one persistent, keyboard-first editor tab:

- Keep search results open like any other editor tab.
- Open several independent search tabs for different tasks.
- Search files, text, and symbols from one input.
- Preview selected files without leaving the search tab.
- Jump with fast Telescope-like keys.
- Copy project-relative references like `@src/abc.js` with one shortcut.
- Use VS Code native commands when you want the built-in overlays.

## What It Looks Like

```text
+-------------------------------------------------------------+
| Search                                                       |
+-------------------------------+-----------------------------+
| Files                         | Preview                     |
|   src/extension.ts            | import * as vscode...       |
|   src/search/ranking.ts       |                             |
|                               |                             |
| Text                          | highlighted match context   |
|   README.md:42                |                             |
|   src/panel/SearchPanel.ts:9  |                             |
|                               |                             |
| Symbols                       |                             |
|   activate                    |                             |
|   SearchPanel                 |                             |
+-------------------------------+-----------------------------+
```

## Features

### Editor-Tab Search

Run `VS FZF: Open Search Tab` or press `Alt+Space`.

VS FZF opens as a normal VS Code editor tab. You can switch away, come back later, and keep the same search context.

### Three Search Sections

VS FZF searches:

- `Files`: fuzzy path and filename search
- `Text`: workspace text matches
- `Symbols`: workspace symbols from installed language extensions

When the input is empty, VS FZF shows file results first, similar to Quick Open behavior.

### Smart Section Ordering

Results stay grouped by section, but sections reorder based on strongest match.

Example: if text matches are strongest, order becomes:

```text
Text
Files
Symbols
```

### Preview Pane

Move selection and the right side updates immediately.

- File result previews file content.
- Text result previews matching line.
- Symbol result previews symbol location.

### Copy `@` References

Press `Shift+Enter` to copy selected result as a project-relative reference:

```text
@src/abc.js
@src/abc.js:42
```

Multi-root workspaces include workspace folder name:

```text
@client/src/app.ts
```

## Keyboard Shortcuts

All commands are contributed to VS Code, so users can change them in Keyboard Shortcuts.

### Global

| Key | Action |
| --- | --- |
| `Alt+Space` | Open VS FZF search tab |
| `Alt+P` | Open native VS Code Quick Open |
| `Alt+G` | Open native VS Code text search |
| `Alt+O` | Open native VS Code workspace symbols |

### Inside VS FZF

| Key | Action |
| --- | --- |
| `Enter` | Open selected result |
| `Shift+Enter` | Copy selected `@path` reference |
| `Alt+Enter` | Open selected result to side |
| `Escape` | Clear query, or close tab if query is empty |
| `Alt+J` / `ArrowDown` / `Ctrl+N` | Next result |
| `Alt+K` / `ArrowUp` / `Ctrl+P` | Previous result |
| `Alt+Shift+J` | Next section |
| `Alt+Shift+K` | Previous section |
| `PageDown` / `PageUp` | Page movement |
| `Alt+F` | Jump to Files |
| `Alt+T` | Jump to Text |
| `Alt+S` | Jump to Symbols |
| `Tab` / `Shift+Tab` | Cycle sections |
| `Alt+N` | New VS FZF tab |
| `Alt+W` | Close current VS FZF tab |
| `Alt+R` | Refresh results |
| `Alt+Backspace` | Clear query |

Some operating systems reserve `Alt` shortcuts. If a key does not reach VS Code, remap that command in Keyboard Shortcuts.

## Commands

| Command | Description |
| --- | --- |
| `VS FZF: Open Search Tab` | Open a new persistent search tab |
| `VS FZF: Native Quick Open` | Run `workbench.action.quickOpen` |
| `VS FZF: Native Text Search` | Run `workbench.action.quickTextSearch` |
| `VS FZF: Native Workspace Symbols` | Run `workbench.action.showAllSymbols` |
| `VS FZF: Focus Search` | Focus active VS FZF input |
| `VS FZF: New Search Tab` | Open another search tab |
| `VS FZF: Close Search Tab` | Close active search tab |
| `VS FZF: Refresh` | Refresh active search results |
| `VS FZF: Clear Query` | Clear active query |
| `VS FZF: Open Selected` | Open selected result |
| `VS FZF: Open Selected to Side` | Open selected result beside current editor |
| `VS FZF: Copy Selected Reference` | Copy selected result as `@path` |

## Settings

| Setting | Default | Description |
| --- | ---: | --- |
| `vsFzf.search.debounceMs` | `120` | Delay before running search after typing |
| `vsFzf.search.maxFiles` | `200` | Max file results |
| `vsFzf.search.maxText` | `200` | Max text results |
| `vsFzf.search.maxSymbols` | `200` | Max symbol results |
| `vsFzf.search.exclude` | common build/vendor folders | Glob patterns excluded from search |
| `vsFzf.preview.maxFileBytes` | `500000` | Max file size loaded into preview |
| `vsFzf.preview.wrap` | `false` | Wrap preview text |

## Install From Source

This repository is a VS Code extension project.

```bash
npm install
npm run compile
```

Then launch an Extension Development Host:

```bash
code --extensionDevelopmentPath .
```

Inside the new VS Code window:

1. Open Command Palette.
2. Run `VS FZF: Open Search Tab`.
3. Or press `Alt+Space`.

## Package Locally

Install `vsce` if needed:

```bash
npm install -g @vscode/vsce
```

Build package:

```bash
vsce package
```

Install generated `.vsix`:

```bash
code --install-extension vs-fzf-0.0.1.vsix
```

## Development

```bash
npm install
npm run compile
npm test
```

Watch mode:

```bash
npm run watch
```

## Notes

VS Code native Quick Open, text search, and symbol search are overlay UIs. Extensions cannot embed those overlays inside a custom editor tab.

VS FZF uses VS Code APIs and providers for the editor-tab experience, and also exposes wrappers for the native commands when you want the built-in overlays.

Text search in this version scans workspace files from the extension host because the stable VS Code typings used here do not expose an embeddable `findTextInFiles` API. Result caps and exclude settings keep that bounded.

## Best For

- users who like Telescope-style workflows
- users who want search results to stay open
- users who often jump between files, matches, and symbols
- users who want fast keyboard navigation without losing editor context

