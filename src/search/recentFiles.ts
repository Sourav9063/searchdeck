import * as vscode from 'vscode';

const storageKey = 'vsFzf.recentFiles';
const maxRecentFiles = 200;
let context: vscode.ExtensionContext | undefined;
let recentUris: string[] = [];

export function initializeRecentFiles(extensionContext: vscode.ExtensionContext): vscode.Disposable[] {
  context = extensionContext;
  recentUris = extensionContext.workspaceState.get<string[]>(storageKey, []);

  seedOpenEditors();
  recordUri(vscode.window.activeTextEditor?.document.uri);

  return [
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      recordUri(editor?.document.uri);
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
  recordUri(uri);
}

function seedOpenEditors(): void {
  for (const group of vscode.window.tabGroups.all) {
    for (const tab of group.tabs) {
      if (tab.input instanceof vscode.TabInputText) {
        recordUri(tab.input.uri);
      }
    }
  }

  for (const document of vscode.workspace.textDocuments) {
    recordUri(document.uri);
  }
}

function recordUri(uri: vscode.Uri | undefined): void {
  if (!uri || !vscode.workspace.getWorkspaceFolder(uri)) {
    return;
  }

  const value = uri.toString();
  recentUris = [value, ...recentUris.filter((candidate) => candidate !== value)].slice(0, maxRecentFiles);
  void context?.workspaceState.update(storageKey, recentUris);
}
