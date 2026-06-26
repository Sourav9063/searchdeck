(function () {
  const vscode = acquireVsCodeApi();

  const search = document.getElementById('search');
  const resultsRoot = document.getElementById('results');
  const previewPath = document.getElementById('preview-path');
  const previewLang = document.getElementById('preview-lang');
  const previewContent = document.getElementById('preview-content');

  let state = {
    query: '',
    selectedResultId: undefined,
    sections: [],
    preview: { content: '', startLine: 0, message: 'Loading...' },
    wrapPreview: false
  };

  let suppressInput = false;

  search.addEventListener('input', () => {
    if (suppressInput) {
      return;
    }

    vscode.postMessage({ type: 'query', query: search.value });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.altKey) {
      event.preventDefault();
      vscode.postMessage({ type: 'open', side: true });
      return;
    }

    if (event.key === 'Enter' && event.shiftKey) {
      event.preventDefault();
      vscode.postMessage({ type: 'copyReference' });
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

    if (event.altKey && lowerKey(event) === 'n') {
      event.preventDefault();
      vscode.postMessage({ type: 'newTab' });
      return;
    }

    if (event.altKey && lowerKey(event) === 'w') {
      event.preventDefault();
      vscode.postMessage({ type: 'close' });
      return;
    }

    if (event.altKey && lowerKey(event) === 'r') {
      event.preventDefault();
      vscode.postMessage({ type: 'refresh' });
      return;
    }

    if ((event.altKey && !event.shiftKey && lowerKey(event) === 'j') || event.key === 'ArrowDown' || (event.ctrlKey && lowerKey(event) === 'n')) {
      event.preventDefault();
      moveSelection(1);
      return;
    }

    if ((event.altKey && !event.shiftKey && lowerKey(event) === 'k') || event.key === 'ArrowUp' || (event.ctrlKey && lowerKey(event) === 'p')) {
      event.preventDefault();
      moveSelection(-1);
      return;
    }

    if (event.altKey && event.shiftKey && lowerKey(event) === 'j') {
      event.preventDefault();
      moveSection(1);
      return;
    }

    if (event.altKey && event.shiftKey && lowerKey(event) === 'k') {
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

    if (event.altKey && lowerKey(event) === 'f') {
      event.preventDefault();
      focusSection('files');
      return;
    }

    if (event.altKey && lowerKey(event) === 't') {
      event.preventDefault();
      focusSection('text');
      return;
    }

    if (event.altKey && lowerKey(event) === 's') {
      event.preventDefault();
      focusSection('symbols');
      return;
    }

    if (event.key === 'Tab') {
      event.preventDefault();
      moveSection(event.shiftKey ? -1 : 1);
    }
  });

  window.addEventListener('message', (event) => {
    const message = event.data;

    if (message.type === 'state') {
      state = message;
      render();
      return;
    }

    if (message.type === 'focusSearch') {
      search.focus();
      search.select();
      return;
    }

    if (message.type === 'command') {
      handleCommand(message.command);
    }
  });

  function handleCommand(command) {
    if (command === 'open') {
      vscode.postMessage({ type: 'open' });
    } else if (command === 'openSide') {
      vscode.postMessage({ type: 'open', side: true });
    } else if (command === 'copyReference') {
      vscode.postMessage({ type: 'copyReference' });
    } else if (command === 'clear') {
      setQuery('');
    } else if (command === 'refresh') {
      vscode.postMessage({ type: 'refresh' });
    } else if (command === 'close') {
      vscode.postMessage({ type: 'close' });
    } else if (command === 'newTab') {
      vscode.postMessage({ type: 'newTab' });
    }
  }

  function render() {
    if (search.value !== state.query) {
      suppressInput = true;
      search.value = state.query;
      suppressInput = false;
    }

    renderResults();
    renderPreview();
  }

  function renderResults() {
    resultsRoot.replaceChildren();

    for (const section of state.sections) {
      const sectionElement = document.createElement('section');
      sectionElement.className = 'result-section';
      sectionElement.dataset.section = section.id;

      const header = document.createElement('button');
      header.className = 'section-header';
      header.type = 'button';
      header.textContent = `${section.title} ${section.results.length}`;
      header.addEventListener('click', () => focusSection(section.id));
      sectionElement.appendChild(header);

      if (section.results.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty';
        empty.textContent = 'No results';
        sectionElement.appendChild(empty);
      }

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
        title.textContent = result.label;

        const detail = document.createElement('span');
        detail.className = 'result-detail';
        detail.textContent = result.previewText || result.description;

        row.append(title, detail);
        row.addEventListener('click', () => selectResult(result.id));
        row.addEventListener('dblclick', () => vscode.postMessage({ type: 'open' }));
        sectionElement.appendChild(row);
      }

      resultsRoot.appendChild(sectionElement);
    }

    const selected = resultsRoot.querySelector('.result-row.selected');
    selected?.scrollIntoView({ block: 'nearest' });
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
      }

      const gutter = document.createElement('span');
      gutter.className = 'gutter';
      gutter.textContent = String(lineNumber + 1).padStart(4, ' ');

      const text = document.createElement('span');
      text.className = 'line-text';
      text.textContent = lines[index] || ' ';

      line.append(gutter, text);
      previewContent.appendChild(line);
    }
  }

  function setQuery(query) {
    search.value = query;
    vscode.postMessage({ type: 'query', query });
  }

  function selectResult(resultId) {
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

  function lowerKey(event) {
    return event.key.toLowerCase();
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  vscode.postMessage({ type: 'ready' });
  search.focus();
})();
