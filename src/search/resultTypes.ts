import type * as vscode from 'vscode';

export type SectionId = 'files' | 'text' | 'symbols';

export interface BaseResult {
  id: string;
  section: SectionId;
  label: string;
  description: string;
  uri: vscode.Uri;
  relativePath: string;
  score: number;
  labelMatchPositions: number[];
  descriptionMatchPositions: number[];
  relativePathMatchPositions: number[];
  line?: number;
  character?: number;
  range?: vscode.Range;
}

export interface FileResult extends BaseResult {
  section: 'files';
}

export interface TextResult extends BaseResult {
  section: 'text';
  previewText: string;
}

export interface SymbolResult extends BaseResult {
  section: 'symbols';
  symbolName: string;
  containerName?: string;
  kind: string;
}

export type SearchResult = FileResult | TextResult | SymbolResult;

export interface ResultSection {
  id: SectionId;
  title: string;
  score: number;
  results: SearchResult[];
}

export interface SerializedRange {
  startLine: number;
  startCharacter: number;
  endLine: number;
  endCharacter: number;
}

export interface SerializedResult {
  id: string;
  section: SectionId;
  label: string;
  description: string;
  relativePath: string;
  previewText?: string;
  labelMatchPositions: number[];
  descriptionMatchPositions: number[];
  relativePathMatchPositions: number[];
}

export interface SerializedSection {
  id: SectionId;
  title: string;
  results: SerializedResult[];
}

export interface PreviewModel {
  uri?: string;
  relativePath?: string;
  languageId?: string;
  content: string;
  startLine: number;
  highlightLine?: number;
  highlightStartCharacter?: number;
  highlightEndCharacter?: number;
  highlightLabel?: string;
  message?: string;
}

export function serializeResult(result: SearchResult): SerializedResult {
  const base: SerializedResult = {
    id: result.id,
    section: result.section,
    label: result.label,
    description: result.description,
    relativePath: result.relativePath,
    labelMatchPositions: result.labelMatchPositions,
    descriptionMatchPositions: result.descriptionMatchPositions,
    relativePathMatchPositions: result.relativePathMatchPositions
  };

  if (result.section === 'text') {
    base.previewText = result.previewText;
  }

  return base;
}
