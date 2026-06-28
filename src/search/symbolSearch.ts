import * as vscode from 'vscode';
import { fuzzyScore, sortResults } from './ranking';
import { filterGitIgnored } from './gitIgnore';
import type { SymbolResult } from './resultTypes';
import { excludeGlob, workspaceRelativePath } from './workspacePaths';

let typescriptProviderActivation: Promise<void> | undefined;

export async function searchSymbols(query: string, maxResults: number, token: vscode.CancellationToken): Promise<SymbolResult[]> {
  const trimmed = query.trim();
  if (!trimmed || token.isCancellationRequested) {
    return [];
  }

  await activateTypescriptProvider();
  if (token.isCancellationRequested) {
    return [];
  }

  const symbols = await vscode.commands.executeCommand<vscode.SymbolInformation[]>(
    'vscode.executeWorkspaceSymbolProvider',
    trimmed
  );

  if (token.isCancellationRequested || !symbols) {
    return [];
  }

  const results = symbols.slice(0, maxResults * 3).map((symbol, index) => {
    const relativePath = workspaceRelativePath(symbol.location.uri);
    const description = `${symbol.containerName ? `${symbol.containerName} - ` : ''}${relativePath}`;
    const nameScore = fuzzyScore(trimmed, symbol.name).score;
    const containerScore = symbol.containerName ? fuzzyScore(trimmed, symbol.containerName).score : 0;
    const pathScore = fuzzyScore(trimmed, relativePath).score;

    return {
      id: `symbol:${symbol.location.uri.toString()}:${symbol.location.range.start.line}:${symbol.location.range.start.character}:${index}`,
      section: 'symbols' as const,
      label: symbol.name,
      description,
      uri: symbol.location.uri,
      relativePath,
      score: Math.max(nameScore, Math.floor(containerScore / 2), Math.floor(pathScore / 3)),
      line: symbol.location.range.start.line,
      character: symbol.location.range.start.character,
      range: symbol.location.range,
      symbolName: symbol.name,
      containerName: symbol.containerName,
      kind: vscode.SymbolKind[symbol.kind] ?? 'Symbol',
      labelMatchPositions: fuzzyScore(trimmed, symbol.name).positions,
      descriptionMatchPositions: fuzzyScore(trimmed, description).positions,
      relativePathMatchPositions: fuzzyScore(trimmed, relativePath).positions
    };
  });

  return sortResults(await filterGitIgnored(results, token)).slice(0, maxResults);
}

async function activateTypescriptProvider(): Promise<void> {
  typescriptProviderActivation ??= (async () => {
    const files = await vscode.workspace.findFiles(
      '**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}',
      excludeGlob(),
      1
    );
    if (files.length === 0) {
      return;
    }

    const extension = vscode.extensions.getExtension('vscode.typescript-language-features');
    if (extension && !extension.isActive) {
      await extension.activate();
    }

    await vscode.workspace.openTextDocument(files[0]);
    await vscode.commands.executeCommand(
      'vscode.executeDocumentSymbolProvider',
      files[0]
    );
  })();

  await typescriptProviderActivation;
}
