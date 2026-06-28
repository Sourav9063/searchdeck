import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSections, fuzzyScore, promoteSelectedSection, scorePath } from '../search/ranking';
import type { SearchResult } from '../search/resultTypes';

test('fuzzyScore rewards contiguous substring matches', () => {
  const contiguous = fuzzyScore('abc', 'src/abc.ts').score;
  const sparse = fuzzyScore('abc', 'a-long-boring-component.ts').score;

  assert.ok(contiguous > sparse);
});

test('scorePath rewards basename matches', () => {
  const basenameMatch = scorePath('panel', 'src/panel/SearchPanel.ts');
  const pathOnlyMatch = scorePath('panel', 'panel-archive/src/SearchView.ts');

  assert.ok(basenameMatch > pathOnlyMatch);
});

test('scorePath does not match unrelated paths', () => {
  assert.equal(scorePath('zzzzzz', 'src/search/ranking.ts'), 0);
});

test('buildSections reorders sections by strongest result category', () => {
  const sections = buildSections('needle', {
    files: [result('files', 'a.ts', 10)],
    text: [result('text', 'b.ts:1', 90), result('text', 'c.ts:2', 80)],
    symbols: [result('symbols', 'NeedleSymbol', 20)]
  });

  assert.equal(sections[0]?.id, 'text');
  assert.equal(sections[1]?.id, 'symbols');
  assert.equal(sections[2]?.id, 'files');
});

test('buildSections does not let many weaker matches outrank the strongest match', () => {
  const sections = buildSections('needle', {
    files: [result('files', 'needle.ts', 100)],
    text: Array.from({ length: 20 }, (_, index) => result('text', `text-${index}.ts:1`, 90)),
    symbols: []
  });

  assert.equal(sections[0]?.id, 'files');
});

test('buildSections keeps default order for empty query', () => {
  const sections = buildSections('', {
    files: [],
    text: [result('text', 'b.ts:1', 90)],
    symbols: [result('symbols', 'NeedleSymbol', 20)]
  });

  assert.deepEqual(sections.map((section) => section.id), ['files', 'text', 'symbols']);
});

test('promoteSelectedSection moves the automatically selected result section first', () => {
  const sections = buildSections('needle', {
    files: [result('files', 'needle.ts', 50)],
    text: [result('text', 'needle.ts:1', 80)],
    symbols: [result('symbols', 'NeedleSymbol', 100)]
  });

  const promoted = promoteSelectedSection(sections, 'files:needle.ts');

  assert.deepEqual(promoted.map((section) => section.id), ['files', 'symbols', 'text']);
});

test('promoteSelectedSection keeps relevance order without a selected result', () => {
  const sections = buildSections('needle', {
    files: [result('files', 'needle.ts', 50)],
    text: [result('text', 'needle.ts:1', 80)],
    symbols: [result('symbols', 'NeedleSymbol', 100)]
  });

  assert.strictEqual(promoteSelectedSection(sections, undefined), sections);
});

function result(section: SearchResult['section'], label: string, score: number): SearchResult {
  return {
    id: `${section}:${label}`,
    section,
    label,
    description: label,
    uri: { toString: () => label } as never,
    relativePath: label,
    score,
    labelMatchPositions: [],
    descriptionMatchPositions: [],
    relativePathMatchPositions: [],
    ...(section === 'text' ? { previewText: label } : {}),
    ...(section === 'symbols' ? { symbolName: label, kind: 'Function' } : {})
  } as SearchResult;
}
