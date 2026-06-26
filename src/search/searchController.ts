import * as vscode from 'vscode';
import { PreviewService } from '../preview/previewService';
import { SearchSession } from '../state/SearchSession';
import { FileSearch } from './fileSearch';
import { buildSections } from './ranking';
import type { SearchResult, SectionId } from './resultTypes';
import { searchSymbols } from './symbolSearch';
import { searchText } from './textSearch';

export interface SearchUpdateSink {
  postState(): void;
}

export class SearchController {
  private readonly files = new FileSearch();
  private readonly previewService = new PreviewService();
  private debounceTimer?: NodeJS.Timeout;

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
    this.session.query = query;
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    const debounceMs = vscode.workspace.getConfiguration('vsFzf').get<number>('search.debounceMs') ?? 120;
    this.debounceTimer = setTimeout(() => {
      void this.runSearch();
    }, debounceMs);
  }

  async runSearch(): Promise<void> {
    this.session.disposeSearch();
    const cts = new vscode.CancellationTokenSource();
    this.session.cancellation = cts;

    const query = this.session.query;
    const config = vscode.workspace.getConfiguration('vsFzf');
    const maxFiles = config.get<number>('search.maxFiles') ?? 200;
    const maxText = config.get<number>('search.maxText') ?? 200;
    const maxSymbols = config.get<number>('search.maxSymbols') ?? 200;

    const grouped: Record<SectionId, SearchResult[]> = {
      files: [],
      text: [],
      symbols: []
    };

    grouped.files = await this.files.search(query, maxFiles, cts.token);
    this.applySections(query, grouped);

    if (!query.trim() || cts.token.isCancellationRequested) {
      this.session.preview = await this.previewService.preview(this.session.getSelectedResult());
      this.sink.postState();
      return;
    }

    const symbolPromise = searchSymbols(query, maxSymbols, cts.token)
      .then((symbols) => {
        grouped.symbols = symbols;
        this.applySections(query, grouped);
      })
      .catch(() => {
        grouped.symbols = [];
        this.applySections(query, grouped);
      });

    const textPromise = searchText(query, maxText, cts.token)
      .then((text) => {
        grouped.text = text;
        this.applySections(query, grouped);
      })
      .catch(() => {
        grouped.text = [];
        this.applySections(query, grouped);
      });

    await Promise.allSettled([symbolPromise, textPromise]);

    if (!cts.token.isCancellationRequested) {
      this.session.preview = await this.previewService.preview(this.session.getSelectedResult());
      this.sink.postState();
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
    this.session.selectedResultId = resultId;
    const result = this.session.getSelectedResult();
    if (result) {
      this.session.focusedSection = result.section;
    }

    this.session.preview = await this.previewService.preview(result);
    this.sink.postState();
  }

  private applySections(query: string, grouped: Record<SectionId, SearchResult[]>): void {
    this.session.sections = buildSections(query, grouped);
    this.session.keepValidSelection();
    this.sink.postState();
  }
}

