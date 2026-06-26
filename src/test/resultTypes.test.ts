import assert from 'node:assert/strict';
import test from 'node:test';
import type { SymbolResult, TextResult } from '../search/resultTypes';
import { serializeResult } from '../search/resultTypes';

const uri = { toString: () => 'file:///workspace/src/example.ts' } as never;

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
    kind: 'Function'
  };

  assert.deepEqual(serializeResult(symbol), {
    id: 'symbol:example',
    section: 'symbols',
    label: 'example',
    description: 'src/example.ts',
    relativePath: 'src/example.ts'
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
    previewText: 'const example = true;'
  };

  assert.equal(serializeResult(result).previewText, result.previewText);
});
