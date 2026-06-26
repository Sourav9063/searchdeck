import * as vscode from 'vscode';
import type { PreviewModel, ResultSection, SearchResult, SectionId } from '../search/resultTypes';

export class SearchSession {
  readonly id: string;
  query = '';
  sections: ResultSection[] = [];
  preview: PreviewModel = { content: '', startLine: 0, message: 'Select a result to preview.' };
  selectedResultId?: string;
  focusedSection: SectionId = 'files';
  cancellation?: vscode.CancellationTokenSource;

  constructor(id: string) {
    this.id = id;
  }

  disposeSearch(): void {
    this.cancellation?.cancel();
    this.cancellation?.dispose();
    this.cancellation = undefined;
  }

  getSelectedResult(): SearchResult | undefined {
    for (const section of this.sections) {
      const found = section.results.find((result) => result.id === this.selectedResultId);
      if (found) {
        return found;
      }
    }

    return this.firstResult();
  }

  firstResult(): SearchResult | undefined {
    for (const section of this.sections) {
      if (section.results.length > 0) {
        return section.results[0];
      }
    }

    return undefined;
  }

  keepValidSelection(): void {
    if (this.getSelectedResult()) {
      return;
    }

    this.selectedResultId = this.firstResult()?.id;
  }
}

