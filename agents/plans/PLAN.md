# SearchDeck Telescope-Style VS Code Extension Plan

## Goal

Build VS Code extension named `searchdeck` that gives Telescope-like search inside normal editor tabs.

User opens command with `Alt+Space`. Extension opens editor-area tab containing:

- Left pane: three result sections: `Files`, `Text`, `Symbols`
- Top/left search input
- Right pane: file preview
- Multiple search tabs can stay open independently
- Empty query shows file picker results equivalent to `workbench.action.quickOpen`
- Non-empty query searches files, text, and symbols together
- Results sorted by fuzzy match quality
- Keyboard-first actions with default `Alt` keybindings, user-overridable through VS Code keybindings

## Existing Project State

Repo currently contains only:

- `AGENTS.md`

Missing:

- `package.json`
- extension source
- tests
- `agents/knowledge/`
- prior `agents/plans/`

No architecture constraints found beyond `AGENTS.md`.

## Product Assumptions

- "Use native VS Code command" means expose shortcuts that call VS Code built-in commands where useful, and use VS Code extension APIs for embedded editor-tab UI.
- `workbench.action.quickOpen`, `workbench.action.quickTextSearch`, and `workbench.action.showAllSymbols` open VS Code native overlays. They cannot be embedded as left-pane sections inside a custom editor tab.
- For Telescope-like editor UI, implement our own `WebviewPanel` backed by native VS Code APIs:
  - file search from `workspace.findFiles`
  - text search from `workspace.findTextInFiles`
  - workspace symbols from `vscode.executeWorkspaceSymbolProvider`
  - file preview from `workspace.openTextDocument`
  - open result via `window.showTextDocument`
- Built-in commands remain available as explicit commands/keybindings:
  - `searchdeck.native.quickOpen` -> `workbench.action.quickOpen`
  - `searchdeck.native.quickTextSearch` -> `workbench.action.quickTextSearch`
  - `searchdeck.native.showAllSymbols` -> `workbench.action.showAllSymbols`

## Technical Pushback

Do not try to reuse VS Code Quick Open UI inside a webview. VS Code does not expose Quick Open as embeddable component. Calling `workbench.action.quickOpen` will move focus to the command palette-style overlay, not render results in extension UI.

Correct fit:

- Use native commands for compatibility shortcuts.
- Use native APIs/providers for custom tab data.
- Use `WebviewPanel` for editor-tab behavior.

## Target UX

### Layout

Single webview editor tab:

```text
+-------------------------------------------------------------+
| Search input                                                 |
+-------------------------------+-----------------------------+
| Files                         | Preview                     |
|   src/index.ts                |                             |
|   package.json                | file content with highlights|
|                               |                             |
| Text                          |                             |
|   README.md:12 match line     |                             |
|   src/ext.ts:44 match line    |                             |
|                               |                             |
| Symbols                       |                             |
|   activate()                  |                             |
|   SearchPanel                 |                             |
+-------------------------------+-----------------------------+
```

### Empty Query Behavior

When search input is empty:

- Show file results only.
- Populate from workspace files.
- Rank by recently opened files first if practical, then fuzzy score/path score.
- This mirrors intent of `workbench.action.quickOpen`, while staying inside the editor tab.

### Non-Empty Query Behavior

When user types:

- Search files by fuzzy path match.
- Highlight fuzzy-matched characters in file result filenames and paths.
- Search text by `workspace.findTextInFiles`.
- Search symbols by `vscode.executeWorkspaceSymbolProvider`.
- Merge into three visible sections.
- Sort within each section by fuzzy score, then useful tie-breakers:
  - exact prefix matches
  - basename matches
  - shorter path
  - recently selected result

### Preview Behavior

Selection change updates right preview:

- File result: show file content.
- Text result: show file content with matched line centered and highlighted.
- Symbol result: show file content with symbol range centered and highlighted.

Preview should not dirty editor state. It remains read-only inside webview.

### Open Behavior

`Enter` opens selected result in normal VS Code editor.

- File: open file.
- Text: open file at match location.
- Symbol: open file at symbol location.

`Alt+Enter` copies selected result project-relative path to clipboard with `@` prefix.

- File result example: `@src/abc.js`
- Text result example: `@src/abc.js`
- Symbol result example: `@src/abc.js`
- If workspace has multiple folders, path format is `@workspace-folder-name/path/from/folder`.

Search tab remains open unless user closes it.

## Commands

Extension commands:

- `searchdeck.open`
  - Open new SearchDeck search tab.
- `searchdeck.openNativeQuickOpen`
  - Execute `workbench.action.quickOpen`.
- `searchdeck.openNativeTextSearch`
  - Execute `workbench.action.quickTextSearch`.
- `searchdeck.openNativeSymbols`
  - Execute `workbench.action.showAllSymbols`.
- `searchdeck.focusSearch`
  - Focus active SearchDeck tab search input.
- `searchdeck.newSearchTab`
  - Open another independent SearchDeck tab.
- `searchdeck.closeSearchTab`
  - Close active SearchDeck tab.
- `searchdeck.refresh`
  - Refresh active search results.
- `searchdeck.clear`
  - Clear active query.
- `searchdeck.openSelected`
  - Open selected result.
- `searchdeck.openSelectedToSide`
  - Open selected result beside current group.
- `searchdeck.copySelectedReference`
  - Copy selected result as `@project/relative/path` reference.

Webview-only commands, sent through message bridge:

- move selection up/down
- move selection to previous/next section
- page up/down
- jump to `Files`
- jump to `Text`
- jump to `Symbols`
- cycle section
- toggle preview wrap
- copy selected reference with `@` prefix
- copy result path without prefix
- copy result line

## Default Keybindings

Use `package.json contributes.keybindings` so users can override in VS Code Keyboard Shortcuts.

Global:

- `Alt+Space` -> `searchdeck.open`
- `Alt+P` -> `searchdeck.openNativeQuickOpen`
- `Alt+G` -> `searchdeck.openNativeTextSearch`
- `Alt+O` -> `searchdeck.openNativeSymbols`

When SearchDeck webview focused:

- `Alt+W` -> close current SearchDeck search tab
- `Alt+R` -> refresh results
- `Alt+Backspace` -> clear query
- `Shift+Enter` -> open selected result to side

Inside webview DOM:

- `Enter` -> open selected result
- `Alt+Enter` -> copy selected result reference, e.g. `@src/abc.js`
- `Escape` -> clear query if query exists, otherwise close tab
- `Alt+J` / `ArrowDown` / `Ctrl+N` -> next result
- `Alt+K` / `ArrowUp` / `Ctrl+P` -> previous result
- `Alt+Shift+J` -> next section
- `Alt+Shift+K` -> previous section
- `PageDown` / `PageUp` -> page movement
- `Alt+F` -> focus `Files`
- `Alt+T` -> focus `Text`
- `Alt+S` -> focus `Symbols`
- `Tab` / `Shift+Tab` -> cycle sections

Note: Some `Alt` combinations are OS/window-manager dependent. Keep defaults simple and document all commands so users can remap.

## Extension Architecture

### Files

Planned structure:

```text
package.json
tsconfig.json
src/
  extension.ts
  commands.ts
  panel/
    SearchPanel.ts
    panelHtml.ts
    messageTypes.ts
  search/
    searchController.ts
    fileSearch.ts
    textSearch.ts
    symbolSearch.ts
    ranking.ts
    resultTypes.ts
  preview/
    previewService.ts
  state/
    SearchSession.ts
  test/
    ranking.test.ts
    searchController.test.ts
media/
  main.js
  main.css
```

### Core Modules

`extension.ts`

- Activate extension.
- Register commands.
- Own active panel registry.
- Dispose resources cleanly.

`SearchPanel.ts`

- Create `WebviewPanel`.
- Set `retainContextWhenHidden: true` for tab persistence.
- Bridge messages between webview and extension host.
- Maintain one `SearchSession` per tab.

`SearchSession.ts`

- Store query.
- Store selected section/result.
- Store result lists.
- Store cancellation tokens for in-flight searches.
- Store preview state.

`searchController.ts`

- Debounce query changes.
- Cancel stale search.
- Decide empty-query vs non-empty-query behavior.
- Run file/text/symbol searches.
- Send incremental updates to webview.

`ranking.ts`

- Fuzzy score paths, symbols, and text result labels.
- Prefer exact substring and basename matches.
- Keep deterministic sort.

`previewService.ts`

- Load text document.
- Produce preview model:
  - uri
  - language id
  - content excerpt or full content
  - highlighted ranges
  - centered line

`main.js` / `main.css`

- Render UI.
- Handle keyboard navigation.
- Keep input focused.
- Send query/action messages.
- Render sections and preview.

## Search Implementation

### File Search

Empty query:

- `workspace.findFiles('**/*', exclude, limit)`
- Exclude common heavy directories:
  - `node_modules`
  - `.git`
  - `dist`
  - `build`
  - `out`
- Respect `search.exclude` and `files.exclude` where possible.

Non-empty query:

- Search file list from cached workspace files.
- Refresh cache on demand and file system changes.
- Rank by fuzzy path score.

### Text Search

Use `workspace.findTextInFiles`.

Plan:

- Convert user query into safe literal text search first.
- Optional later setting: regex mode.
- Limit results per tab to protect performance.
- Show `path:line: preview text`.

Tradeoff:

- Literal text search gives predictable behavior.
- Fuzzy text search over all file contents is expensive. Initial version should use VS Code text search provider for candidate matches, then rank displayed matches fuzzily.

### Symbol Search

Use command:

- `commands.executeCommand('vscode.executeWorkspaceSymbolProvider', query)`

Rank returned symbols by:

- symbol name fuzzy score
- container name score
- path score
- symbol kind priority only as tie-breaker

### Combined Ranking

Keep three visible sections instead of one mixed list, matching requested UI.

Within each section:

- Sort by score descending.
- Use stable tiebreakers.

Across sections:

- Reorder sections dynamically by strongest current match category.
- Example: if text results have stronger scores than file and symbol results, section order becomes `Text`, `Files`, `Symbols`.
- Empty query keeps fixed order: `Files`, `Text`, `Symbols`, with only `Files` populated.
- Non-empty query computes a section score from top result score plus result density.
- Keep section contents grouped; do not intermix individual file/text/symbol rows.
- Preserve user's focused section when possible after reordering. If focused section disappears, move focus to first non-empty section.

## State And Multiple Tabs

Each `searchdeck.open` call creates a new `WebviewPanel`.

Each panel has:

- independent query
- independent result cache
- independent selection
- independent preview

Use unique session id:

```text
searchdeck:<timestamp>:<counter>
```

Use VS Code webview lifecycle:

- `onDidDispose` clears session.
- `onDidChangeViewState` updates active session.
- `retainContextWhenHidden` preserves DOM state while tab hidden.

No disk persistence in first version. User can keep tabs open for future use during current VS Code session.

## Configuration

Contribute settings:

- `searchDeck.search.debounceMs`
  - default `120`
- `searchDeck.search.maxFiles`
  - default `200`
- `searchDeck.search.maxText`
  - default `200`
- `searchDeck.search.maxSymbols`
  - default `200`
- `searchDeck.search.exclude`
  - default `["**/.git/**", "**/node_modules/**", "**/dist/**", "**/build/**", "**/out/**"]`
- `searchDeck.preview.maxFileBytes`
  - default `500000`
- `searchDeck.preview.wrap`
  - default `false`

Do not add many settings in first pass. Keep only performance and preview controls.

## Accessibility

- Input has label.
- Results use listbox/option semantics.
- Selected result announced through `aria-selected`.
- Keyboard navigation works without mouse.
- Use VS Code theme variables:
  - `--vscode-editor-background`
  - `--vscode-editor-foreground`
  - `--vscode-list-activeSelectionBackground`
  - `--vscode-list-hoverBackground`
  - `--vscode-input-background`
  - `--vscode-focusBorder`

## Security

- Webview scripts use nonce.
- Webview content security policy allows only local script/style.
- No remote content.
- Escape all rendered text.
- Use `webview.asWebviewUri` for local assets.
- Validate every incoming webview message by `type`.

## Performance

- Debounce query input.
- Cancel stale searches.
- Send partial results:
  - files first
  - symbols next
  - text as provider returns
- Cap results per section.
- Cache workspace file list.
- Refresh file cache through file watcher.
- Avoid reading large files for preview.

## Implementation Phases

### Phase 1: Extension Scaffold

Tasks:

- Add npm TypeScript extension project files.
- Add `package.json` activation events and contributions.
- Add commands and keybindings.
- Add build/test scripts.
- Add minimal `extension.ts`.

Success checks:

- `npm install`
- `npm run compile`
- `searchdeck.open` command appears in Command Palette.
- `Alt+Space` opens empty SearchDeck tab.

### Phase 2: Webview UI Skeleton

Tasks:

- Create `WebviewPanel`.
- Render Telescope-like layout.
- Implement search input.
- Implement three result sections.
- Implement preview pane placeholder.
- Implement basic keyboard movement inside webview.

Success checks:

- Multiple SearchDeck tabs can open.
- Tabs preserve query when switching away and back.
- Keyboard can move through mock results.

### Phase 3: File Search

Tasks:

- Implement workspace file cache.
- Implement empty-query file list.
- Implement fuzzy path search.
- Show file results.
- Open selected file.
- Preview selected file.

Success checks:

- Empty query shows workspace files.
- Typed query narrows files.
- `Enter` opens file.
- Preview updates on selection.

### Phase 4: Text Search

Tasks:

- Implement `workspace.findTextInFiles`.
- Add cancellation for stale queries.
- Show `path:line:text`.
- Open selected match at line/column.
- Preview match with highlight.

Success checks:

- Query returns text results.
- Fast typing does not show stale results.
- Large result sets are capped.

### Phase 5: Symbol Search

Tasks:

- Implement `vscode.executeWorkspaceSymbolProvider`.
- Render symbol kind/name/container/path.
- Open selected symbol at range.
- Preview selected symbol.

Success checks:

- Query returns workspace symbols.
- Symbol open jumps to correct location.

### Phase 6: Native Command Bridges

Tasks:

- Add wrapper commands for:
  - `workbench.action.quickOpen`
  - `workbench.action.quickTextSearch`
  - `workbench.action.showAllSymbols`
- Add default keybindings.
- Document that these open native overlays, separate from SearchDeck tab.

Success checks:

- Wrapper commands execute native VS Code UI.
- User can rebind all commands.

### Phase 7: Polish And Hardening

Tasks:

- Add CSP nonce.
- Escape all text.
- Add theme variable styling.
- Add result loading/empty/error states.
- Add config reads.
- Add tests for fuzzy ranking and controller cancellation.

Success checks:

- `npm run compile`
- `npm test`
- Manual Extension Development Host test:
  - open tab
  - empty file list
  - file search
  - text search
  - symbol search
  - preview
  - multiple tabs
  - native command wrappers

## Testing Plan

Automated:

- Unit test `ranking.ts`.
- Unit test result sorting.
- Unit test message validation.
- Unit test search cancellation behavior with mocked providers.

Manual:

- Fresh empty workspace.
- Small TypeScript workspace.
- Large repo.
- Workspace with no symbol provider.
- Binary/large file selected for preview.
- Multiple open SearchDeck tabs.
- Keybinding conflicts on macOS/Linux/Windows.

## Risks

- `Alt+Space` may conflict with OS/window manager on some platforms.
  - Mitigation: command exposed, user can rebind.
- `workbench.action.quickOpen` cannot be embedded.
  - Mitigation: custom UI uses native provider APIs; native commands exposed separately.
- Text search can be expensive.
  - Mitigation: debounce, cancellation, result caps.
- Symbol provider availability depends on installed language extensions.
  - Mitigation: show empty symbols state without error.
- Webview preview will not match VS Code editor rendering exactly.
  - Mitigation: use theme colors and language id labels; open real editor on `Enter`.

## Verification Commands

After implementation:

```bash
rtk npm install
rtk npm run compile
rtk npm test
```

Manual verification through VS Code Extension Development Host:

```bash
rtk code --extensionDevelopmentPath .
```

## External References Checked

- VS Code API reference: `https://code.visualstudio.com/api/references/vscode-api`
- VS Code built-in commands reference: `https://code.visualstudio.com/api/references/commands`
- VS Code keybindings contribution docs: `https://code.visualstudio.com/api/references/contribution-points#contributes.keybindings`
