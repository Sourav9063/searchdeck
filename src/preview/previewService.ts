import * as vscode from 'vscode';
import type { PreviewModel, SearchResult } from '../search/resultTypes';
import { decodeText, languageIdForUri } from '../textFile';

export class PreviewService {
  async preview(result: SearchResult | undefined): Promise<PreviewModel> {
    if (!result) {
      return { content: '', startLine: 0, message: 'No result selected.' };
    }

    const maxBytes = vscode.workspace.getConfiguration('searchDeck').get<number>('preview.maxFileBytes') ?? 500000;

    try {
      const stat = await vscode.workspace.fs.stat(result.uri);
      if (stat.size > maxBytes) {
        return {
          uri: result.uri.toString(),
          relativePath: result.relativePath,
          content: '',
          startLine: 0,
          message: `File too large to preview (${stat.size} bytes).`
        };
      }
    } catch {
      return {
        uri: result.uri.toString(),
        relativePath: result.relativePath,
        content: '',
        startLine: 0,
        message: 'Preview unavailable.'
      };
    }

    let content: string | undefined;
    try {
      content = decodeText(await vscode.workspace.fs.readFile(result.uri));
    } catch {
      content = undefined;
    }

    if (content === undefined) {
      return {
        uri: result.uri.toString(),
        relativePath: result.relativePath,
        content: '',
        startLine: 0,
        message: 'Preview unavailable for binary or non-UTF-8 file.'
      };
    }

    const documentLines = content.split(/\r?\n/);
    const targetLine = result.line ?? 0;
    let highlightStartCharacter = result.range?.start.character ?? result.character;
    let highlightEndCharacter = result.range?.end.character;
    if (result.section === 'symbols') {
      const sourceLine = documentLines[targetLine] ?? '';
      const providerStart = Math.max(0, result.character ?? 0);
      const symbolStart = sourceLine.indexOf(result.symbolName, providerStart);
      const fallbackStart = symbolStart >= 0 ? symbolStart : sourceLine.indexOf(result.symbolName);
      highlightStartCharacter = fallbackStart >= 0 ? fallbackStart : undefined;
      highlightEndCharacter = fallbackStart >= 0 ? fallbackStart + result.symbolName.length : undefined;
    }
    const startLine = Math.max(0, targetLine - 80);
    const endLine = Math.min(documentLines.length - 1, targetLine + 160);
    const lines = documentLines.slice(startLine, endLine + 1);

    return {
      uri: result.uri.toString(),
      relativePath: result.relativePath,
      languageId: languageIdForUri(result.uri),
      content: lines.join('\n'),
      startLine,
      ...(result.section === 'files' ? {} : {
        highlightLine: targetLine,
        highlightStartCharacter,
        highlightEndCharacter,
        highlightLabel: result.section === 'symbols' ? `${result.kind}: ${result.label}` : 'Text match'
      })
    };
  }
}
