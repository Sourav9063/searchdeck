import * as vscode from 'vscode';
import { PreviewService } from '../preview/previewService';
import { SearchSession } from '../state/SearchSession';
import { FileSearch } from './fileSearch';
import { buildSections, preferTextSelection, promoteSelectedSection } from './ranking';
import type { SearchResult, SectionId } from './resultTypes';
import { searchSymbols } from './symbolSearch';
import { searchText } from './textSearch';

export interface SearchUpdateSink {
  postState(): void;
}

export class SearchController {
  private readonly files = new FileSearch();
  private readonly previewService = new PreviewService();
  private debounceTimer?: ReturnType<typeof setTimeout>;
  private searchRevision = 0;
  private selectionRevision = 0;
  private selectionIsManual = false;

  constructor(
    private readonly session: SearchSession,
    private readonly sink: SearchUpdateSink
  ) {}

  dispose(): void {
    this.session.disposeSearch();
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
  }

  scheduleSearch(query: string): void {
    const revision = this.searchRevision + 1;
    this.searchRevision = revision;
    const queryChanged = query !== this.session.query;
    this.session.query = query;
    if (queryChanged) {
      this.selectionRevision += 1;
      this.session.selectedResultId = undefined;
      this.selectionIsManual = false;
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    const debounceMs = query.trim()
      ? vscode.workspace.getConfiguration('searchDeck').get<number>('search.debounceMs') ?? 120
      : 0;
    this.debounceTimer = setTimeout(() => {
      void this.runSearch(revision);
    }, debounceMs);
  }

  async runSearch(revision = this.searchRevision + 1): Promise<void> {
    this.searchRevision = revision;
    this.session.disposeSearch();
    const cts = new vscode.CancellationTokenSource();
    this.session.cancellation = cts;

    const query = this.session.query;
    const config = vscode.workspace.getConfiguration('searchDeck');
    const maxFiles = config.get<number>('search.maxFiles') ?? 200;
    const maxText = config.get<number>('search.maxText') ?? 200;
    const maxSymbols = config.get<number>('search.maxSymbols') ?? 200;

    const grouped: Record<SectionId, SearchResult[]> = {
      files: [],
      text: [],
      symbols: []
    };

    grouped.files = await this.files.search(query, maxFiles, cts.token);
    if (!this.applySections(revision, query, grouped)) {
      return;
    }

    if (!query.trim() || cts.token.isCancellationRequested) {
      const preview = await this.previewService.preview(this.session.getSelectedResult());
      if (!this.isCurrentSearch(revision, query)) {
        return;
      }

      this.session.preview = preview;
      this.sink.postState();
      return;
    }

    const symbolPromise = searchSymbols(query, maxSymbols, cts.token)
      .then((symbols) => {
        grouped.symbols = symbols;
        this.applySections(revision, query, grouped);
      })
      .catch(() => {
        grouped.symbols = [];
        this.applySections(revision, query, grouped);
      });

    const textPromise = this.files.workspaceFiles(Math.max(maxText * 12, 1000), cts.token)
      .then((files) => searchText(query, maxText, files, cts.token))
      .then((text) => {
        grouped.text = text;
        this.applySections(revision, query, grouped);
      })
      .catch(() => {
        grouped.text = [];
        this.applySections(revision, query, grouped);
      });

    await Promise.all([symbolPromise, textPromise]);

    if (this.isCurrentSearch(revision, query)) {
      const preview = await this.previewService.preview(this.session.getSelectedResult());
      if (this.isCurrentSearch(revision, query)) {
        this.session.preview = preview;
        this.sink.postState();
      }
    }
  }

  async refresh(): Promise<void> {
    const cts = new vscode.CancellationTokenSource();
    try {
      await this.files.refresh(cts.token);
    } finally {
      cts.dispose();
    }

    await this.runSearch();
  }

  async select(resultId: string): Promise<void> {
    const revision = this.selectionRevision + 1;
    this.selectionRevision = revision;
    this.session.selectedResultId = resultId;
    this.selectionIsManual = true;
    const result = this.session.getSelectedResult();
    const preview = await this.previewService.preview(result);
    if (revision !== this.selectionRevision) {
      return;
    }

    this.session.preview = preview;
    this.sink.postState();
  }

  private applySections(revision: number, query: string, grouped: Record<SectionId, SearchResult[]>): boolean {
    if (!this.isCurrentSearch(revision, query)) {
      return false;
    }

    this.session.sections = buildSections(query, grouped);
    this.session.keepValidSelection();
    if (!this.selectionIsManual) {
      this.session.selectedResultId = preferTextSelection(this.session.sections, this.session.selectedResultId);
      this.session.sections = promoteSelectedSection(this.session.sections, this.session.selectedResultId);
    }
    this.sink.postState();
    return true;
  }

  private isCurrentSearch(revision: number, query: string): boolean {
    return revision === this.searchRevision && query === this.session.query;
  }
}
