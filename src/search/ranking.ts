import type { ResultSection, SearchResult, SectionId } from './resultTypes';

const sectionTitles: Record<SectionId, string> = {
  files: 'Files',
  text: 'Text',
  symbols: 'Symbols'
};

const defaultSectionOrder: SectionId[] = ['files', 'text', 'symbols'];

export interface FuzzyScore {
  score: number;
  positions: number[];
}

export function fuzzyScore(query: string, value: string): FuzzyScore {
  const normalizedQuery = query.trim().toLowerCase();
  const normalizedValue = value.toLowerCase();

  if (!normalizedQuery) {
    return { score: 1, positions: [] };
  }

  let queryIndex = 0;
  const positions: number[] = [];
  let score = 0;
  let consecutive = 0;

  for (let valueIndex = 0; valueIndex < normalizedValue.length && queryIndex < normalizedQuery.length; valueIndex += 1) {
    if (normalizedValue[valueIndex] !== normalizedQuery[queryIndex]) {
      consecutive = 0;
      continue;
    }

    positions.push(valueIndex);
    score += 8;

    if (valueIndex === 0 || '/._- '.includes(normalizedValue[valueIndex - 1])) {
      score += 6;
    }

    if (consecutive > 0) {
      score += 10 + consecutive;
    }

    consecutive += 1;
    queryIndex += 1;
  }

  if (queryIndex !== normalizedQuery.length) {
    return { score: 0, positions: [] };
  }

  const substringIndex = normalizedValue.indexOf(normalizedQuery);
  if (substringIndex >= 0) {
    score += 50;
    if (substringIndex === 0) {
      score += 25;
    }
  }

  score += Math.max(0, 20 - Math.floor(normalizedValue.length / 8));

  return { score, positions };
}

export function basename(path: string): string {
  const normalized = path.replace(/\\/g, '/');
  return normalized.slice(normalized.lastIndexOf('/') + 1);
}

export function scorePath(query: string, relativePath: string): number {
  if (!query.trim()) {
    return 1;
  }

  const pathScore = fuzzyScore(query, relativePath).score;
  const nameScore = fuzzyScore(query, basename(relativePath)).score;
  const boostedNameScore = nameScore > 0 ? nameScore + 40 : 0;
  return Math.max(pathScore, boostedNameScore);
}

export function sortResults<T extends SearchResult>(results: T[]): T[] {
  return [...results].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    if (a.relativePath.length !== b.relativePath.length) {
      return a.relativePath.length - b.relativePath.length;
    }

    return a.relativePath.localeCompare(b.relativePath) || a.label.localeCompare(b.label);
  });
}

export function buildSections(query: string, results: Record<SectionId, SearchResult[]>): ResultSection[] {
  const sections = defaultSectionOrder.map((id) => {
    const sorted = sortResults(results[id]);
    return {
      id,
      title: sectionTitles[id],
      score: sectionScore(sorted),
      results: sorted
    };
  });

  if (!query.trim()) {
    return sections;
  }

  return sections.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    return defaultSectionOrder.indexOf(a.id) - defaultSectionOrder.indexOf(b.id);
  });
}

export function promoteSelectedSection(sections: ResultSection[], selectedResultId: string | undefined): ResultSection[] {
  if (!selectedResultId) {
    return sections;
  }

  const selectedSectionIndex = sections.findIndex((section) =>
    section.results.some((result) => result.id === selectedResultId)
  );
  if (selectedSectionIndex <= 0) {
    return sections;
  }

  return [
    sections[selectedSectionIndex],
    ...sections.slice(0, selectedSectionIndex),
    ...sections.slice(selectedSectionIndex + 1)
  ];
}

export function sectionScore(results: SearchResult[]): number {
  return results[0]?.score ?? 0;
}
