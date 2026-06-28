import assert from 'node:assert/strict';
import test from 'node:test';
import type { FileResult, SymbolResult, TextResult } from '../search/resultTypes';
import { serializeResult } from '../search/resultTypes';

const uri = { toString: () => 'file:///workspace/src/example.ts' } as never;

test('serializeResult keeps file fuzzy match positions', () => {
  const file: FileResult = {
    id: 'file:example',
    section: 'files',
    label: 'commands.ts',
    description: 'src/commands.ts',
    uri,
    relativePath: 'src/commands.ts',
    score: 100,
    labelMatchPositions: [0, 2, 4],
    descriptionMatchPositions: [4, 6, 8],
    relativePathMatchPositions: [4, 6, 8]
  };

  assert.deepEqual(serializeResult(file), {
    id: 'file:example',
    section: 'files',
    label: 'commands.ts',
    description: 'src/commands.ts',
    relativePath: 'src/commands.ts',
    labelMatchPositions: [0, 2, 4],
    descriptionMatchPositions: [4, 6, 8],
    relativePathMatchPositions: [4, 6, 8]
  });
});

test('serializeResult sends only fields used by the webview', () => {
  const symbol: SymbolResult = {
    id: 'symbol:example',
    section: 'symbols',
    label: 'example',
    description: 'src/example.ts',
    uri,
    relativePath: 'src/example.ts',
    score: 100,
    line: 12,
    character: 3,
    symbolName: 'example',
    containerName: 'Example',
    kind: 'Function',
    labelMatchPositions: [0, 1, 2],
    descriptionMatchPositions: [4, 5, 6],
    relativePathMatchPositions: [4, 5, 6]
  };

  assert.deepEqual(serializeResult(symbol), {
    id: 'symbol:example',
    section: 'symbols',
    label: 'example',
    description: 'src/example.ts',
    relativePath: 'src/example.ts',
    labelMatchPositions: [0, 1, 2],
    descriptionMatchPositions: [4, 5, 6],
    relativePathMatchPositions: [4, 5, 6]
  });
});

test('serializeResult keeps text preview content', () => {
  const result: TextResult = {
    id: 'text:example',
    section: 'text',
    label: 'src/example.ts:1',
    description: 'const example = true;',
    uri,
    relativePath: 'src/example.ts',
    score: 50,
    previewText: 'const example = true;',
    labelMatchPositions: [],
    descriptionMatchPositions: [6, 7, 8],
    relativePathMatchPositions: []
  };

  assert.equal(serializeResult(result).previewText, result.previewText);
});
