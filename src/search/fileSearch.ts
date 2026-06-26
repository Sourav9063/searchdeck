import * as vscode from 'vscode';
import { scorePath, sortResults } from './ranking';
import { filterGitIgnoredUris, resetGitIgnoreCache } from './gitIgnore';
import { recentFileUris } from './recentFiles';
import type { FileResult } from './resultTypes';
import { excludeGlob, workspaceRelativePath } from './workspacePaths';

export class FileSearch {
  private cachedFiles: vscode.Uri[] = [];
  private cachedLimit = 0;
  private cacheComplete = false;

  async search(query: string, maxResults: number, token: vscode.CancellationToken): Promise<FileResult[]> {
    const files = await this.workspaceFiles(Math.max(maxResults * 8, 1000), token);
    if (token.isCancellationRequested) {
      return [];
    }

    const trimmed = query.trim();
    const recent = trimmed ? [] : recentFileUris();
    const recentRank = new Map(recent.map((uri, index) => [uri.toString(), recent.length - index + 1000]));
    const candidates = await filterGitIgnoredUris(uniqueUris([...recent, ...files]), token);
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
    this.cachedFiles = [];
    this.cachedLimit = 0;
    this.cacheComplete = false;
    resetGitIgnoreCache();
    await this.workspaceFiles(5000, token);
  }

  async workspaceFiles(limit: number, token?: vscode.CancellationToken): Promise<readonly vscode.Uri[]> {
    if (this.cacheComplete || this.cachedLimit >= limit) {
      return this.cachedFiles;
    }

    const files = await vscode.workspace.findFiles('**/*', excludeGlob(), limit, token);
    if (!token?.isCancellationRequested && limit >= this.cachedLimit) {
      this.cachedFiles = files;
      this.cachedLimit = limit;
      this.cacheComplete = files.length < limit;
    }

    return files;
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
