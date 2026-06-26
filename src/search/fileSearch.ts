import * as vscode from 'vscode';
import { scorePath, sortResults } from './ranking';
import { recentFileUris } from './recentFiles';
import type { FileResult } from './resultTypes';
import { excludeGlob, workspaceRelativePath } from './workspacePaths';

export class FileSearch {
  private cachedFiles: vscode.Uri[] = [];
  private cacheReady = false;

  async search(query: string, maxResults: number, token: vscode.CancellationToken): Promise<FileResult[]> {
    const files = await this.getFiles(Math.max(maxResults * 8, 1000), token);
    if (token.isCancellationRequested) {
      return [];
    }

    const trimmed = query.trim();
    const recent = trimmed ? [] : recentFileUris();
    const recentRank = new Map(recent.map((uri, index) => [uri.toString(), recent.length - index + 1000]));
    const candidates = uniqueUris([...recent, ...files]);
    const results = candidates
      .map((uri) => {
        const relativePath = workspaceRelativePath(uri);
        const score = trimmed ? scorePath(trimmed, relativePath) : recentRank.get(uri.toString()) ?? 1;
        return {
          id: `file:${uri.toString()}`,
          section: 'files' as const,
          label: basename(relativePath),
          description: relativePath,
          uri,
          relativePath,
          score
        };
      })
      .filter((result) => !trimmed || result.score > 0);

    return sortResults(results).slice(0, maxResults);
  }

  async refresh(token?: vscode.CancellationToken): Promise<void> {
    this.cacheReady = false;
    await this.getFiles(5000, token);
  }

  private async getFiles(limit: number, token?: vscode.CancellationToken): Promise<vscode.Uri[]> {
    if (this.cacheReady) {
      return this.cachedFiles;
    }

    const files = await vscode.workspace.findFiles('**/*', excludeGlob(), limit, token);
    this.cachedFiles = files;
    this.cacheReady = true;
    return this.cachedFiles;
  }
}

function basename(value: string): string {
  const normalized = value.replace(/\\/g, '/');
  return normalized.slice(normalized.lastIndexOf('/') + 1);
}

function uniqueUris(uris: vscode.Uri[]): vscode.Uri[] {
  const seen = new Set<string>();
  return uris.filter((uri) => {
    const key = uri.toString();
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}
