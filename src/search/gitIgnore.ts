import * as vscode from 'vscode';

interface IgnoreRule {
  folder: vscode.WorkspaceFolder;
  basePath: string;
  negated: boolean;
  regex: RegExp;
}

let cachedMatcher: Promise<GitIgnoreMatcher> | undefined;

export function resetGitIgnoreCache(): void {
  cachedMatcher = undefined;
}

export async function filterGitIgnored<T extends { uri: vscode.Uri }>(items: T[], token?: vscode.CancellationToken): Promise<T[]> {
  const matcher = await loadGitIgnoreMatcher(token);
  return items.filter((item) => !matcher.ignores(item.uri));
}

export async function filterGitIgnoredUris(uris: vscode.Uri[], token?: vscode.CancellationToken): Promise<vscode.Uri[]> {
  const matcher = await loadGitIgnoreMatcher(token);
  return uris.filter((uri) => !matcher.ignores(uri));
}

export async function isGitIgnoredUri(uri: vscode.Uri, token?: vscode.CancellationToken): Promise<boolean> {
  const matcher = await loadGitIgnoreMatcher(token);
  return matcher.ignores(uri);
}

async function loadGitIgnoreMatcher(token?: vscode.CancellationToken): Promise<GitIgnoreMatcher> {
  cachedMatcher ??= buildGitIgnoreMatcher(token);
  return cachedMatcher;
}

async function buildGitIgnoreMatcher(token?: vscode.CancellationToken): Promise<GitIgnoreMatcher> {
  const ignoreFiles = await vscode.workspace.findFiles('**/.gitignore', undefined, undefined, token);
  const rules: IgnoreRule[] = [];

  for (const uri of ignoreFiles) {
    if (token?.isCancellationRequested) {
      break;
    }

    const folder = vscode.workspace.getWorkspaceFolder(uri);
    if (!folder) {
      continue;
    }

    let content: string;
    try {
      content = new TextDecoder().decode(await vscode.workspace.fs.readFile(uri));
    } catch {
      continue;
    }

    const relativePath = vscode.workspace.asRelativePath(uri, false).replace(/\\/g, '/');
    const basePath = relativePath.endsWith('/.gitignore') ? relativePath.slice(0, -'/.gitignore'.length) : '';
    rules.push(...parseIgnoreFile(content, folder, basePath));
  }

  return new GitIgnoreMatcher(rules);
}

class GitIgnoreMatcher {
  constructor(private readonly rules: IgnoreRule[]) {}

  ignores(uri: vscode.Uri): boolean {
    let ignored = false;

    for (const rule of this.rules) {
      const folder = vscode.workspace.getWorkspaceFolder(uri);
      if (folder?.uri.toString() !== rule.folder.uri.toString()) {
        continue;
      }

      const relativePath = vscode.workspace.asRelativePath(uri, false).replace(/\\/g, '/');
      const scopedPath = scopedRelativePath(relativePath, rule.basePath);
      if (scopedPath === undefined) {
        continue;
      }

      if (rule.regex.test(scopedPath)) {
        ignored = !rule.negated;
      }
    }

    return ignored;
  }
}

function parseIgnoreFile(content: string, folder: vscode.WorkspaceFolder, basePath: string): IgnoreRule[] {
  return content
    .split(/\r?\n/)
    .map((line) => parseRule(line, folder, basePath))
    .filter((rule): rule is IgnoreRule => Boolean(rule));
}

function parseRule(line: string, folder: vscode.WorkspaceFolder, basePath: string): IgnoreRule | undefined {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) {
    return undefined;
  }

  const negated = trimmed.startsWith('!');
  const rawPattern = negated ? trimmed.slice(1) : trimmed;
  const anchored = rawPattern.startsWith('/');
  const pattern = rawPattern.replace(/^\/+/, '').replace(/\/+$/, '');

  if (!pattern) {
    return undefined;
  }

  return {
    folder,
    basePath,
    negated,
    regex: patternRegex(pattern, anchored)
  };
}

function scopedRelativePath(relativePath: string, basePath: string): string | undefined {
  if (!basePath) {
    return relativePath;
  }

  if (relativePath === basePath) {
    return '';
  }

  const prefix = `${basePath}/`;
  return relativePath.startsWith(prefix) ? relativePath.slice(prefix.length) : undefined;
}

function patternRegex(pattern: string, anchored: boolean): RegExp {
  const source = globRegex(pattern);
  const hasSlash = pattern.includes('/');
  const prefix = anchored || hasSlash ? '^' : '(^|.*/)';
  return new RegExp(`${prefix}${source}(/.*)?$`);
}

function globRegex(pattern: string): string {
  let source = '';

  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];
    const next = pattern[index + 1];

    if (char === '*' && next === '*') {
      source += '.*';
      index += 1;
    } else if (char === '*') {
      source += '[^/]*';
    } else if (char === '?') {
      source += '[^/]';
    } else {
      source += escapeRegex(char);
    }
  }

  return source;
}

function escapeRegex(char: string): string {
  return /[\\^$+?.()|[\]{}]/.test(char) ? `\\${char}` : char;
}
