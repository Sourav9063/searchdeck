import * as vscode from 'vscode';
import { fuzzyScore, sortResults } from './ranking';
import { filterGitIgnoredUris } from './gitIgnore';
import type { TextResult } from './resultTypes';
import { excludeGlob, workspaceRelativePath } from './workspacePaths';

export async function searchText(query: string, maxResults: number, token: vscode.CancellationToken): Promise<TextResult[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const results: TextResult[] = [];
  const files = await filterGitIgnoredUris(
    await vscode.workspace.findFiles('**/*', excludeGlob(), Math.max(maxResults * 12, 1000), token),
    token
  );
  const needle = trimmed.toLowerCase();

  for (const uri of files) {
    if (token.isCancellationRequested || results.length >= maxResults) {
      break;
    }

    let document: vscode.TextDocument;
    try {
      document = await vscode.workspace.openTextDocument(uri);
    } catch {
      continue;
    }

    if (document.isUntitled || document.lineCount === 0) {
      continue;
    }

    for (let line = 0; line < document.lineCount && results.length < maxResults; line += 1) {
      if (token.isCancellationRequested) {
        break;
      }

      const text = document.lineAt(line).text;
      const character = text.toLowerCase().indexOf(needle);
      if (character < 0) {
        continue;
      }

      const relativePath = workspaceRelativePath(uri);
      const range = new vscode.Range(line, character, line, character + trimmed.length);
      const previewText = text.trim();
      const score = fuzzyScore(trimmed, previewText).score + fuzzyScore(trimmed, relativePath).score;

      results.push({
        id: `text:${uri.toString()}:${line}:${character}:${results.length}`,
        section: 'text',
        label: `${relativePath}:${line + 1}`,
        description: previewText,
        uri,
        relativePath,
        score,
        line,
        character,
        range,
        previewText
      });
    }
  }

  return sortResults(results).slice(0, maxResults);
}
