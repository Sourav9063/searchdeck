(function () {
  const vscode = acquireVsCodeApi();

  const search = document.getElementById('search');
  const resultsRoot = document.getElementById('results');
  const previewPath = document.getElementById('preview-path');
  const previewLang = document.getElementById('preview-lang');
  const previewContent = document.getElementById('preview-content');
  const tokenPattern = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\/\/.*|#.*|\b(?:const|let|var|function|class|interface|type|import|from|export|return|if|else|for|while|switch|case|break|continue|async|await|new|try|catch|throw|extends|implements|public|private|protected|readonly|static|def|elif|fn|struct|enum|impl|use|pub|mod|package|func|map|range)\b|\b(?:true|false|null|undefined|None|nil)\b|\b\d+(?:\.\d+)?\b)/g;
  const hashSyntaxLanguages = new Set(['css', 'scss']);

  let state = {
    query: '',
    selectedResultId: undefined,
    sections: [],
    preview: { content: '', startLine: 0, message: 'Loading...' },
    wrapPreview: false
  };

  let pendingQuery;
  let pendingSelectedResultId;

  search.addEventListener('input', () => {
    pendingQuery = search.value;
    pendingSelectedResultId = undefined;
    vscode.postMessage({ type: 'query', query: search.value });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.altKey) {
      event.preventDefault();
      vscode.postMessage({ type: 'copyReference' });
      return;
    }

    if (event.key === 'Enter' && event.shiftKey) {
      event.preventDefault();
      vscode.postMessage({ type: 'open', side: true });
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      vscode.postMessage({ type: 'open' });
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      if (search.value) {
        setQuery('');
      } else {
        vscode.postMessage({ type: 'close' });
      }
      return;
    }

    if (event.key === 'Backspace' && event.altKey) {
      event.preventDefault();
      setQuery('');
      return;
    }

    if (event.altKey && keyMatches(event, 'w')) {
      event.preventDefault();
      vscode.postMessage({ type: 'close' });
      return;
    }

    if (event.altKey && keyMatches(event, 'r')) {
      event.preventDefault();
      vscode.postMessage({ type: 'refresh' });
      return;
    }

    if (event.altKey && !event.shiftKey && keyMatches(event, 'h')) {
      event.preventDefault();
      return;
    }

    if (event.altKey && !event.shiftKey && keyMatches(event, 'l')) {
      event.preventDefault();
      return;
    }

    if ((event.altKey && !event.shiftKey && keyMatches(event, 'j')) || event.key === 'ArrowDown' || (event.ctrlKey && keyMatches(event, 'n'))) {
      event.preventDefault();
      moveSelection(1);
      return;
    }

    if ((event.altKey && !event.shiftKey && keyMatches(event, 'k')) || event.key === 'ArrowUp' || (event.ctrlKey && keyMatches(event, 'p'))) {
      event.preventDefault();
      moveSelection(-1);
      return;
    }

    if (event.altKey && event.shiftKey && keyMatches(event, 'j')) {
      event.preventDefault();
      moveSection(1);
      return;
    }

    if (event.altKey && event.shiftKey && keyMatches(event, 'k')) {
      event.preventDefault();
      moveSection(-1);
      return;
    }

    if (event.key === 'PageDown') {
      event.preventDefault();
      moveSelection(10);
      return;
    }

    if (event.key === 'PageUp') {
      event.preventDefault();
      moveSelection(-10);
      return;
    }

    if (event.altKey && keyMatches(event, 'f')) {
      event.preventDefault();
      focusSection('files');
      return;
    }

    if (event.altKey && keyMatches(event, 't')) {
      event.preventDefault();
      focusSection('text');
      return;
    }

    if (event.altKey && keyMatches(event, 's')) {
      event.preventDefault();
      focusSection('symbols');
      return;
    }

    if (event.key === 'Tab') {
      event.preventDefault();
      moveSection(event.shiftKey ? -1 : 1);
    }
  }, true);

  window.addEventListener('resize', renderSelectedPathOverlay);
  resultsRoot.addEventListener('scroll', renderSelectedPathOverlay, true);

  window.addEventListener('message', (event) => {
    const message = event.data;

    if (message.type === 'state') {
      state = message;
      if (pendingQuery !== undefined) {
        if (state.query === pendingQuery) {
          pendingQuery = undefined;
        } else {
          state.query = pendingQuery;
        }
      }

      if (pendingSelectedResultId) {
        if (state.selectedResultId === pendingSelectedResultId) {
          pendingSelectedResultId = undefined;
        } else if (findResult(pendingSelectedResultId)) {
          state.selectedResultId = pendingSelectedResultId;
        }
      }

      render();
      return;
    }

    if (message.type === 'focusSearch') {
      search.focus();
      search.select();
      return;
    }

  });

  function render() {
    if (pendingQuery === undefined && search.value !== state.query) {
      search.value = state.query;
    }

    renderResults();
    renderPreview();
  }

  function renderResults() {
    resultsRoot.replaceChildren();
    for (const section of state.sections.filter((candidate) => candidate.results.length > 0)) {
      const sectionElement = document.createElement('section');
      sectionElement.className = 'result-section';
      sectionElement.dataset.section = section.id;

      const header = document.createElement('button');
      header.className = 'section-header';
      header.type = 'button';
      header.textContent = `${section.title} ${section.results.length}`;
      header.addEventListener('click', () => focusSection(section.id));
      sectionElement.appendChild(header);

      const body = document.createElement('div');
      body.className = 'section-body';

      for (const result of section.results) {
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'result-row';
        row.dataset.resultId = result.id;
        row.setAttribute('role', 'option');
        row.setAttribute('aria-selected', String(result.id === state.selectedResultId));
        if (result.id === state.selectedResultId) {
          row.classList.add('selected');
        }

        const title = document.createElement('span');
        title.className = 'result-title';
        appendTextWithMatches(title, result.label, result.labelMatchPositions);

        const detail = document.createElement('span');
        detail.className = 'result-detail';
        const selected = result.id === state.selectedResultId;
        const detailText = selected ? result.relativePath : result.previewText || result.description;
        const detailMatchPositions = selected ? result.relativePathMatchPositions : result.descriptionMatchPositions;
        appendTextWithMatches(detail, detailText, detailMatchPositions);
        detail.title = result.relativePath;

        row.append(title, detail);
        row.addEventListener('click', () => selectResult(result.id));
        row.addEventListener('dblclick', () => vscode.postMessage({ type: 'open' }));
        body.appendChild(row);
      }

      sectionElement.appendChild(body);
      resultsRoot.appendChild(sectionElement);
    }

    const selected = resultsRoot.querySelector('.result-row.selected');
    const sectionBody = selected?.closest('.section-body');
    if (selected && sectionBody) {
      scrollWithin(sectionBody, selected, 'nearest');
    }
    renderSelectedPathOverlay();
  }

  function renderSelectedPathOverlay() {
    document.getElementById('selected-path-overlay')?.remove();
    resultsRoot.querySelector('.result-detail.overlayed')?.classList.remove('overlayed');

    const selected = selectedResult();
    const selectedDetail = resultsRoot.querySelector('.result-row.selected .result-detail');
    if (!selected || !selectedDetail || selectedDetail.scrollWidth <= selectedDetail.clientWidth) {
      return;
    }

    const bounds = selectedDetail.getBoundingClientRect();
    const overlay = document.createElement('div');
    overlay.id = 'selected-path-overlay';
    appendTextWithMatches(overlay, selected.relativePath, selected.relativePathMatchPositions);
    overlay.title = selected.relativePath;
    overlay.style.left = `${bounds.left}px`;
    overlay.style.top = `${bounds.top - 5}px`;
    overlay.style.height = `${bounds.height + 10}px`;
    overlay.style.lineHeight = `${bounds.height}px`;
    overlay.style.maxWidth = `${window.innerWidth - bounds.left - 12}px`;
    selectedDetail.classList.add('overlayed');
    document.body.appendChild(overlay);
  }

  function appendTextWithMatches(parent, value, positions) {
    const text = String(value || '');
    if (!Array.isArray(positions) || positions.length === 0) {
      parent.textContent = text;
      return;
    }

    let cursor = 0;
    let positionIndex = 0;
    while (positionIndex < positions.length) {
      const start = positions[positionIndex];
      if (start > cursor) {
        parent.appendChild(document.createTextNode(text.slice(cursor, start)));
      }

      let end = start + 1;
      positionIndex += 1;
      while (positionIndex < positions.length && positions[positionIndex] === end) {
        end += 1;
        positionIndex += 1;
      }

      const match = document.createElement('span');
      match.className = 'fuzzy-match';
      match.textContent = text.slice(start, end);
      parent.appendChild(match);
      cursor = end;
    }

    if (cursor < text.length) {
      parent.appendChild(document.createTextNode(text.slice(cursor)));
    }
  }

  function renderPreview() {
    const preview = state.preview || {};
    previewPath.textContent = preview.relativePath || '';
    previewLang.textContent = preview.languageId || '';
    previewContent.classList.toggle('wrap', Boolean(state.wrapPreview));
    previewContent.replaceChildren();

    if (preview.message) {
      previewContent.textContent = preview.message;
      return;
    }

    const lines = String(preview.content || '').split('\n');
    for (let index = 0; index < lines.length; index += 1) {
      const lineNumber = (preview.startLine || 0) + index;
      const line = document.createElement('div');
      line.className = 'preview-line';
      if (lineNumber === preview.highlightLine) {
        line.classList.add('highlight');
        line.title = preview.highlightLabel || 'Match';
      }

      const gutter = document.createElement('span');
      gutter.className = 'gutter';
      gutter.textContent = lineNumber === preview.highlightLine ? `>${String(lineNumber + 1).padStart(3, ' ')}` : String(lineNumber + 1).padStart(4, ' ');

      const text = document.createElement('span');
      text.className = 'line-text';
      appendHighlightedCode(text, lines[index] || ' ', preview.languageId, lineNumber === preview.highlightLine ? preview : undefined);

      line.append(gutter, text);
      previewContent.appendChild(line);
    }

    const selected = selectedResult();
    if (selected?.section === 'text' || selected?.section === 'symbols') {
      const highlighted = previewContent.querySelector('.preview-line.highlight');
      if (highlighted) {
        requestAnimationFrame(() => scrollWithin(previewContent, highlighted, 'center'));
      }
    }
  }

  function scrollWithin(container, element, alignment) {
    const containerBounds = container.getBoundingClientRect();
    const elementBounds = element.getBoundingClientRect();

    if (alignment === 'center') {
      container.scrollTop += elementBounds.top - containerBounds.top
        - (container.clientHeight - elementBounds.height) / 2;
      return;
    }

    if (elementBounds.top < containerBounds.top) {
      container.scrollTop -= containerBounds.top - elementBounds.top;
    } else if (elementBounds.bottom > containerBounds.bottom) {
      container.scrollTop += elementBounds.bottom - containerBounds.bottom;
    }
  }

  function appendHighlightedCode(parent, line, languageId, preview) {
    const matchStart = typeof preview?.highlightStartCharacter === 'number' ? preview.highlightStartCharacter : -1;
    const matchEnd = typeof preview?.highlightEndCharacter === 'number' && preview.highlightEndCharacter > matchStart
      ? preview.highlightEndCharacter
      : matchStart >= 0 ? matchStart + Math.max(1, currentQuery().length) : -1;
    const tokens = tokenizeLine(line, languageId);

    for (const token of tokens) {
      appendTokenWithMatch(parent, token, matchStart, matchEnd);
    }
  }

  function appendTokenWithMatch(parent, token, matchStart, matchEnd) {
    const tokenStart = token.start;
    const tokenEnd = token.start + token.text.length;

    if (matchStart < 0 || matchEnd <= tokenStart || matchStart >= tokenEnd) {
      parent.appendChild(tokenSpan(token.text, token.className));
      return;
    }

    const beforeLength = Math.max(0, matchStart - tokenStart);
    const matchOffset = Math.max(0, matchStart - tokenStart);
    const matchLength = Math.min(tokenEnd, matchEnd) - Math.max(tokenStart, matchStart);
    const afterOffset = matchOffset + matchLength;

    if (beforeLength > 0) {
      parent.appendChild(tokenSpan(token.text.slice(0, beforeLength), token.className));
    }

    const match = tokenSpan(token.text.slice(matchOffset, afterOffset), `${token.className} match-token`);
    parent.appendChild(match);

    if (afterOffset < token.text.length) {
      parent.appendChild(tokenSpan(token.text.slice(afterOffset), token.className));
    }
  }

  function tokenSpan(text, className) {
    const span = document.createElement('span');
    span.className = className;
    span.textContent = text || ' ';
    return span;
  }

  function tokenizeLine(line, languageId) {
    const language = String(languageId || '').toLowerCase();
    if (!line) {
      return [{ text: ' ', className: 'tok-text', start: 0 }];
    }

    const tokens = [];
    let index = 0;
    let match;

    tokenPattern.lastIndex = 0;
    while ((match = tokenPattern.exec(line)) !== null) {
      if (match.index > index) {
        tokens.push({ text: line.slice(index, match.index), className: 'tok-text', start: index });
      }

      const text = match[0];
      tokens.push({ text, className: tokenClass(text, language), start: match.index });
      index = match.index + text.length;
    }

    if (index < line.length) {
      tokens.push({ text: line.slice(index), className: 'tok-text', start: index });
    }

    return tokens;
  }

  function tokenClass(text, language) {
    if (text.startsWith('//') || (text.startsWith('#') && !hashSyntaxLanguages.has(language))) {
      return 'tok-comment';
    }
    if (text.startsWith('"') || text.startsWith("'") || text.startsWith('`')) {
      return 'tok-string';
    }
    if (/^\d/.test(text)) {
      return 'tok-number';
    }
    if (/^(true|false|null|undefined|None|nil)$/.test(text)) {
      return 'tok-constant';
    }
    return 'tok-keyword';
  }

  function setQuery(query) {
    search.value = query;
    pendingQuery = query;
    pendingSelectedResultId = undefined;
    vscode.postMessage({ type: 'query', query });
  }

  function selectResult(resultId) {
    pendingSelectedResultId = resultId;
    state.selectedResultId = resultId;
    renderResults();
    vscode.postMessage({ type: 'select', resultId });
  }

  function moveSelection(delta) {
    const flat = flattenedResults();
    if (flat.length === 0) {
      return;
    }

    const currentIndex = Math.max(0, flat.findIndex((result) => result.id === state.selectedResultId));
    const nextIndex = clamp(currentIndex + delta, 0, flat.length - 1);
    selectResult(flat[nextIndex].id);
  }

  function moveSection(delta) {
    const nonEmptySections = state.sections.filter((section) => section.results.length > 0);
    if (nonEmptySections.length === 0) {
      return;
    }

    const selected = flattenedResults().find((result) => result.id === state.selectedResultId);
    const currentSectionId = selected?.section || nonEmptySections[0].id;
    const currentIndex = Math.max(0, nonEmptySections.findIndex((section) => section.id === currentSectionId));
    const nextIndex = clamp(currentIndex + delta, 0, nonEmptySections.length - 1);
    selectResult(nonEmptySections[nextIndex].results[0].id);
  }

  function focusSection(sectionId) {
    const section = state.sections.find((candidate) => candidate.id === sectionId);
    if (!section || section.results.length === 0) {
      return;
    }

    selectResult(section.results[0].id);
  }

  function flattenedResults() {
    return state.sections.flatMap((section) => section.results);
  }

  function selectedResult() {
    return findResult(state.selectedResultId);
  }

  function findResult(resultId) {
    return flattenedResults().find((result) => result.id === resultId);
  }

  function currentQuery() {
    return pendingQuery === undefined ? state.query : pendingQuery;
  }

  function keyMatches(event, key) {
    const expected = key.toLowerCase();
    return event.key.toLowerCase() === expected || event.code === `Key${expected.toUpperCase()}`;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  vscode.postMessage({ type: 'ready' });
  search.focus();
})();
