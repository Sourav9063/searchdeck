# SearchDeck

Telescope-style search for VS Code with agent-ready `@path` references.

SearchDeck opens inside the editor area as a real tab. Search results stay where you left them, previews stay visible, and multiple searches can remain open while you keep working.


https://github.com/user-attachments/assets/396cf7db-3292-42f9-86a6-3ef60e337cb3





## Why Install

VS Code already has great Quick Open, text search, and symbol search. SearchDeck brings those workflows into one persistent, keyboard-first editor tab:

- Keep search results open like any other editor tab.
- Open several independent search tabs for different tasks.
- Search files, text, and symbols from one input.
- Preview selected files without leaving the search tab.
- Jump with fast Telescope-like keys.
- Send exact files to coding agents by copying references like `@src/abc.js` with one shortcut.
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

Run `SearchDeck: Open Search Tab` or press `Alt+Space`.

SearchDeck opens as a normal VS Code editor tab. You can switch away, come back later, and keep the same search context.

### Three Search Sections

SearchDeck searches:

- `Files`: fuzzy path and filename search
- `Text`: workspace text matches
- `Symbols`: workspace symbols from installed language extensions

When the input is empty, SearchDeck shows file results first, similar to Quick Open behavior.

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

### Agent-Ready `@` References

SearchDeck turns any selected result into a precise reference for agent programming. Press `Shift+Enter`, then paste directly into your coding-agent prompt or chat:

```text
@src/abc.js
@src/abc.js:42
```

- File results copy the project-relative `@path`.
- Text and symbol results copy the file path without a line number.
- No manual path typing, file browsing, or ambiguous filenames.
- Copy several references to build focused multi-file prompts quickly.

Example agent prompt:

```text
Compare @src/search/ranking.ts with @src/search/fileSearch.ts:24 and simplify the scoring flow.
```

This is especially useful with coding agents and assistants that accept `@path` context: SearchDeck finds the relevant code, and the copied reference tells the agent exactly where to look.

Multi-root workspaces include workspace folder name:

```text
@client/src/app.ts
```

## Keyboard Shortcuts

All commands are contributed to VS Code, so users can change them in Keyboard Shortcuts.

### Global

| Key | Action |
| --- | --- |
| `Alt+Space` | Open SearchDeck search tab |
| `Alt+P` | Open native VS Code Quick Open |
| `Alt+G` | Open native VS Code text search |
| `Alt+O` | Open native VS Code workspace symbols |

### Inside SearchDeck

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
| `Alt+W` | Close current SearchDeck tab |
| `Alt+R` | Refresh results |
| `Alt+Backspace` | Clear query |

SearchDeck contributes `searchdeck.open` to `terminal.integrated.commandsToSkipShell`, so `Alt+Space` is handled by VS Code even when the integrated terminal is focused. It also includes a terminal-editor keybinding for terminals opened with `workbench.action.createTerminalEditor`.

Some operating systems reserve `Alt+Space` for the window menu before VS Code can receive it. If the OS captures the key, remap `SearchDeck: Open Search Tab` in Keyboard Shortcuts.

## Commands

| Command | Description |
| --- | --- |
| `SearchDeck: Open Search Tab` | Open a new persistent search tab |
| `SearchDeck: Native Quick Open` | Run `workbench.action.quickOpen` |
| `SearchDeck: Native Text Search` | Run `workbench.action.quickTextSearch` |
| `SearchDeck: Native Workspace Symbols` | Run `workbench.action.showAllSymbols` |
| `SearchDeck: Focus Search` | Focus active SearchDeck input |
| `SearchDeck: New Search Tab` | Open another search tab |
| `SearchDeck: Close Search Tab` | Close active search tab |
| `SearchDeck: Refresh` | Refresh active search results |
| `SearchDeck: Clear Query` | Clear active query |
| `SearchDeck: Open Selected` | Open selected result |
| `SearchDeck: Open Selected to Side` | Open selected result beside current editor |
| `SearchDeck: Copy Selected Reference` | Copy selected result as `@path` |

## Settings

| Setting | Default | Description |
| --- | ---: | --- |
| `searchDeck.search.debounceMs` | `120` | Delay before running search after typing |
| `searchDeck.search.maxFiles` | `200` | Max file results |
| `searchDeck.search.maxText` | `200` | Max text results |
| `searchDeck.search.maxSymbols` | `200` | Max symbol results |
| `searchDeck.search.exclude` | common build/vendor folders | Glob patterns excluded from search |
| `searchDeck.preview.maxFileBytes` | `500000` | Max file size loaded into preview |
| `searchDeck.preview.wrap` | `false` | Wrap preview text |

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
2. Run `SearchDeck: Open Search Tab`.
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
code --install-extension searchdeck-0.0.1.vsix
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

SearchDeck uses VS Code APIs and providers for the editor-tab experience, and also exposes wrappers for the native commands when you want the built-in overlays.

Text search in this version scans workspace files from the extension host because the stable VS Code typings used here do not expose an embeddable `findTextInFiles` API. Result caps and exclude settings keep that bounded.

## Best For

- users who like Telescope-style workflows
- users who want search results to stay open
- users who often jump between files, matches, and symbols
- users who want fast keyboard navigation without losing editor context
