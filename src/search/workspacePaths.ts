import * as vscode from 'vscode';

export function workspaceRelativePath(uri: vscode.Uri): string {
  const folders = vscode.workspace.workspaceFolders ?? [];
  return vscode.workspace.asRelativePath(uri, folders.length > 1).replace(/\\/g, '/');
}

export function referencePath(uri: vscode.Uri, line?: number): string {
  const suffix = typeof line === 'number' ? `:${line + 1}` : '';
  return `@${workspaceRelativePath(uri)}${suffix}`;
}

export function excludeGlob(): string {
  const configured = vscode.workspace.getConfiguration('vsFzf').get<string[]>('search.exclude') ?? [];
  const patterns = configured.length > 0 ? configured : ['**/.git/**', '**/node_modules/**', '**/dist/**', '**/build/**', '**/out/**'];
  return patterns.length === 1 ? patterns[0] : `{${patterns.join(',')}}`;
}
