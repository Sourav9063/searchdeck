import * as fs from 'fs/promises';
import * as vscode from 'vscode';
import type { PreviewModel, SearchResult } from '../search/resultTypes';

export class PreviewService {
  async preview(result: SearchResult | undefined): Promise<PreviewModel> {
    if (!result) {
      return { content: '', startLine: 0, message: 'No result selected.' };
    }

    const maxBytes = vscode.workspace.getConfiguration('vsFzf').get<number>('preview.maxFileBytes') ?? 500000;

    try {
      const stat = await fs.stat(result.uri.fsPath);
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

    const document = await vscode.workspace.openTextDocument(result.uri);
    const targetLine = result.line ?? 0;
    const highlightStartCharacter = result.range?.start.character ?? result.character;
    const highlightEndCharacter = result.range?.end.character;
    const startLine = Math.max(0, targetLine - 80);
    const endLine = Math.min(document.lineCount - 1, targetLine + 160);
    const lines: string[] = [];

    for (let line = startLine; line <= endLine; line += 1) {
      lines.push(document.lineAt(line).text);
    }

    return {
      uri: result.uri.toString(),
      relativePath: result.relativePath,
      languageId: document.languageId,
      content: lines.join('\n'),
      startLine,
      highlightLine: targetLine,
      highlightStartCharacter,
      highlightEndCharacter,
      highlightLabel: result.section === 'symbols' ? `${result.kind}: ${result.label}` : result.section === 'text' ? 'Text match' : undefined
    };
  }
}
