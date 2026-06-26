import * as path from 'path';
import * as vscode from 'vscode';

export function workspaceRelativePath(uri: vscode.Uri): string {
  const folder = vscode.workspace.getWorkspaceFolder(uri);
  if (!folder) {
    return uri.fsPath;
  }

  const relative = path.relative(folder.uri.fsPath, uri.fsPath).replace(/\\/g, '/');
  const folders = vscode.workspace.workspaceFolders ?? [];
  if (folders.length > 1) {
    return `${folder.name}/${relative}`;
  }

  return relative;
}

export function referencePath(uri: vscode.Uri, line?: number): string {
  const suffix = typeof line === 'number' ? `:${line + 1}` : '';
  return `@${workspaceRelativePath(uri)}${suffix}`;
}

export function excludeGlob(): string {
  const configured = vscode.workspace.getConfiguration('vsFzf').get<string[]>('search.exclude') ?? [];
  const patterns = configured.length > 0 ? configured : ['**/.git/**', '**/node_modules/**', '**/dist/**', '**/build/**', '**/out/**'];
  return `{${patterns.join(',')}}`;
}

