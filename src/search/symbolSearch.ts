import * as vscode from 'vscode';
import { fuzzyScore, sortResults } from './ranking';
import { filterGitIgnored } from './gitIgnore';
import type { SymbolResult } from './resultTypes';
import { workspaceRelativePath } from './workspacePaths';

export async function searchSymbols(query: string, maxResults: number, token: vscode.CancellationToken): Promise<SymbolResult[]> {
  const trimmed = query.trim();
  if (!trimmed || token.isCancellationRequested) {
    return [];
  }

  const symbols = await vscode.commands.executeCommand<vscode.SymbolInformation[]>(
    'vscode.executeWorkspaceSymbolProvider',
    trimmed
  );

  if (token.isCancellationRequested || !symbols) {
    return [];
  }

  const results = symbols.slice(0, Math.max(maxResults * 3, maxResults)).map((symbol, index) => {
    const relativePath = workspaceRelativePath(symbol.location.uri);
    const nameScore = fuzzyScore(trimmed, symbol.name).score;
    const containerScore = symbol.containerName ? fuzzyScore(trimmed, symbol.containerName).score : 0;
    const pathScore = fuzzyScore(trimmed, relativePath).score;

    return {
      id: `symbol:${symbol.location.uri.toString()}:${symbol.location.range.start.line}:${symbol.location.range.start.character}:${index}`,
      section: 'symbols' as const,
      label: symbol.name,
      description: `${symbol.containerName ? `${symbol.containerName} - ` : ''}${relativePath}`,
      uri: symbol.location.uri,
      relativePath,
      score: nameScore + Math.floor(containerScore / 2) + Math.floor(pathScore / 3),
      line: symbol.location.range.start.line,
      character: symbol.location.range.start.character,
      range: symbol.location.range,
      symbolName: symbol.name,
      containerName: symbol.containerName,
      kind: vscode.SymbolKind[symbol.kind] ?? 'Symbol'
    };
  });

  return sortResults(await filterGitIgnored(results, token)).slice(0, maxResults);
}
