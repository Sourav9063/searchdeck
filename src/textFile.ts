import * as path from 'node:path';
import type * as vscode from 'vscode';

const languageByExtension: Record<string, string> = {
  '.c': 'c',
  '.cpp': 'cpp',
  '.css': 'css',
  '.go': 'go',
  '.html': 'html',
  '.java': 'java',
  '.js': 'javascript',
  '.json': 'json',
  '.jsx': 'javascriptreact',
  '.md': 'markdown',
  '.php': 'php',
  '.py': 'python',
  '.rb': 'ruby',
  '.rs': 'rust',
  '.scss': 'scss',
  '.sh': 'shellscript',
  '.sql': 'sql',
  '.ts': 'typescript',
  '.tsx': 'typescriptreact',
  '.xml': 'xml',
  '.yaml': 'yaml',
  '.yml': 'yaml'
};

export function decodeText(bytes: Uint8Array): string | undefined {
  if (bytes.includes(0)) {
    return undefined;
  }

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return undefined;
  }
}

export function languageIdForUri(uri: Pick<vscode.Uri, 'path'>): string {
  const name = path.posix.basename(uri.path).toLowerCase();
  if (name === 'dockerfile' || name.startsWith('dockerfile.')) {
    return 'dockerfile';
  }

  return languageByExtension[path.posix.extname(name)] ?? 'plaintext';
}
