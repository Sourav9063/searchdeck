import * as vscode from 'vscode';
import type { PreviewModel, ResultSection, SearchResult } from '../search/resultTypes';

export class SearchSession {
  query = '';
  sections: ResultSection[] = [];
  preview: PreviewModel = { content: '', startLine: 0, message: 'Select a result to preview.' };
  selectedResultId?: string;
  cancellation?: vscode.CancellationTokenSource;

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

  private firstResult(): SearchResult | undefined {
    for (const section of this.sections) {
      if (section.results.length > 0) {
        return section.results[0];
      }
    }

    return undefined;
  }

  keepValidSelection(): void {
    const selected = this.selectedResultId
      ? this.sections.some((section) => section.results.some((result) => result.id === this.selectedResultId))
      : false;

    if (selected) {
      return;
    }

    this.selectedResultId = this.firstResult()?.id;
  }
}
