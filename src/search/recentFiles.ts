import * as vscode from 'vscode';

const storageKey = 'searchDeck.recentFiles';
const maxRecentFiles = 200;
let context: vscode.ExtensionContext | undefined;
let recentUris: string[] = [];

export function initializeRecentFiles(extensionContext: vscode.ExtensionContext): vscode.Disposable[] {
  context = extensionContext;
  recentUris = extensionContext.workspaceState.get<string[]>(storageKey, []);

  seedOpenEditors();
  recordUris([vscode.window.activeTextEditor?.document.uri]);

  return [
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      recordUris([editor?.document.uri]);
    }),
    vscode.window.tabGroups.onDidChangeTabs(() => {
      seedOpenEditors();
    })
  ];
}

export function recentFileUris(): vscode.Uri[] {
  return recentUris.map((value) => vscode.Uri.parse(value, true));
}

export function recordRecentFile(uri: vscode.Uri): void {
  recordUris([uri]);
}

function seedOpenEditors(): void {
  const uris: Array<vscode.Uri | undefined> = [];

  for (const group of vscode.window.tabGroups.all) {
    for (const tab of group.tabs) {
      if (tab.input instanceof vscode.TabInputText) {
        uris.push(tab.input.uri);
      }
    }
  }

  for (const document of vscode.workspace.textDocuments) {
    uris.push(document.uri);
  }

  recordUris(uris);
}

function recordUris(uris: Array<vscode.Uri | undefined>): void {
  const values = uris
    .filter((uri): uri is vscode.Uri => Boolean(uri && vscode.workspace.getWorkspaceFolder(uri)))
    .map((uri) => uri.toString())
    .reverse();
  const next = [...new Set([...values, ...recentUris])].slice(0, maxRecentFiles);
  if (next.length === recentUris.length && next.every((value, index) => value === recentUris[index])) {
    return;
  }

  recentUris = next;
  void context?.workspaceState.update(storageKey, recentUris);
}
