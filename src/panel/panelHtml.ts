import * as vscode from 'vscode';

export function getPanelHtml(webview: vscode.Webview, extensionUri: vscode.Uri, nonce: string): string {
  const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'main.js'));
  const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'main.css'));
  const cspSource = webview.cspSource;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource}; script-src 'nonce-${nonce}';">
  <link href="${styleUri}" rel="stylesheet">
  <title>SearchDeck</title>
</head>
<body>
  <main class="app">
    <label class="search-label" for="search">Search</label>
    <input id="search" class="search" type="text" autocomplete="off" spellcheck="false" autofocus>
    <section class="content">
      <div class="results" id="results" role="listbox" aria-label="SearchDeck results"></div>
      <aside class="preview">
        <div class="preview-header">
          <span id="preview-path"></span>
          <span id="preview-lang"></span>
        </div>
        <pre id="preview-content"></pre>
      </aside>
    </section>
  </main>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}
