import * as vscode from 'vscode';
import { SearchController } from '../search/searchController';
import { recordRecentFile } from '../search/recentFiles';
import { serializeResult, type SerializedSection } from '../search/resultTypes';
import { referencePath } from '../search/workspacePaths';
import { SearchSession } from '../state/SearchSession';
import { getPanelHtml } from './panelHtml';
import type { ExtensionToWebviewMessage, WebviewToExtensionMessage } from './messageTypes';

export class SearchPanel {
  static readonly viewType = 'searchDeck.search';
  private static activePanel?: SearchPanel;
  private static readonly panels = new Set<SearchPanel>();

  readonly panel: vscode.WebviewPanel;
  private readonly session: SearchSession;
  private readonly controller: SearchController;
  private readonly disposables: vscode.Disposable[] = [];

  static create(context: vscode.ExtensionContext): SearchPanel {
    const panel = vscode.window.createWebviewPanel(
      SearchPanel.viewType,
      'SearchDeck',
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(context.extensionUri, 'media')
        ]
      }
    );

    return new SearchPanel(context, panel);
  }

  static active(): SearchPanel | undefined {
    return SearchPanel.activePanel;
  }

  static disposeActive(): void {
    SearchPanel.activePanel?.panel.dispose();
  }

  private constructor(
    private readonly context: vscode.ExtensionContext,
    panel: vscode.WebviewPanel
  ) {
    this.panel = panel;
    this.session = new SearchSession();
    this.controller = new SearchController(this.session, this);

    SearchPanel.panels.add(this);
    SearchPanel.activePanel = this;

    this.panel.webview.html = getPanelHtml(this.panel.webview, context.extensionUri, nonce());

    this.disposables.push(
      this.panel.onDidDispose(() => this.dispose()),
      this.panel.onDidChangeViewState(() => {
        if (this.panel.active) {
          SearchPanel.activePanel = this;
          this.postFocusSearch();
        }
      }),
      this.panel.webview.onDidReceiveMessage((message: WebviewToExtensionMessage) => {
        void this.handleMessage(message);
      })
    );
  }

  postState(): void {
    const sections: SerializedSection[] = this.session.sections.map((section) => ({
      id: section.id,
      title: section.title,
      results: section.results.map(serializeResult)
    }));

    const message: ExtensionToWebviewMessage = {
      type: 'state',
      query: this.session.query,
      selectedResultId: this.session.selectedResultId,
      sections,
      preview: this.session.preview,
      wrapPreview: vscode.workspace.getConfiguration('searchDeck').get<boolean>('preview.wrap') ?? false
    };

    void this.panel.webview.postMessage(message);
  }

  focusSearch(): void {
    this.panel.reveal();
    this.postFocusSearch();
  }

  private postFocusSearch(): void {
    void this.panel.webview.postMessage({ type: 'focusSearch' } satisfies ExtensionToWebviewMessage);
  }

  async refresh(): Promise<void> {
    await this.controller.refresh();
  }

  clear(): void {
    this.controller.scheduleSearch('');
    this.focusSearch();
  }

  async openSelected(side = false): Promise<void> {
    const result = this.session.getSelectedResult();
    if (!result) {
      return;
    }

    const selection = new vscode.Range(
      result.line ?? 0,
      result.character ?? 0,
      result.line ?? 0,
      result.character ?? 0
    );

    await vscode.window.showTextDocument(result.uri, {
      viewColumn: side ? vscode.ViewColumn.Beside : vscode.ViewColumn.Active,
      selection,
      preview: false
    });
    recordRecentFile(result.uri);
  }

  async copySelectedReference(): Promise<void> {
    const result = this.session.getSelectedResult();
    if (!result) {
      return;
    }

    const reference = referencePath(result.uri);
    await vscode.env.clipboard.writeText(reference);
    vscode.window.setStatusBarMessage(`$(check) Copied reference: ${reference}`, 3000);
  }

  private async handleMessage(message: WebviewToExtensionMessage): Promise<void> {
    if (!message || typeof message.type !== 'string') {
      return;
    }

    switch (message.type) {
      case 'ready':
        this.controller.scheduleSearch(this.session.query);
        this.postState();
        break;
      case 'query':
        this.controller.scheduleSearch(message.query);
        break;
      case 'select':
        await this.controller.select(message.resultId);
        break;
      case 'open':
        await this.openSelected(message.side);
        break;
      case 'copyReference':
        await this.copySelectedReference();
        break;
      case 'refresh':
        await this.refresh();
        break;
      case 'clear':
        this.clear();
        break;
      case 'close':
        this.panel.dispose();
        break;
    }
  }

  private dispose(): void {
    this.controller.dispose();
    for (const disposable of this.disposables) {
      disposable.dispose();
    }

    SearchPanel.panels.delete(this);
    if (SearchPanel.activePanel === this) {
      SearchPanel.activePanel = [...SearchPanel.panels].at(-1);
    }
  }
}

function nonce(): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';
  for (let i = 0; i < 32; i += 1) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  return text;
}
