// Componentes compartilhados, sem dependências e sem acesso às fontes financeiras.
(() => {
  'use strict';
  const el = (tag, attrs = {}, ...children) => {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (value == null) continue;
      if (key === 'text') node.textContent = value;
      else if (key === 'class') node.className = value;
      else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
      else node.setAttribute(key, value);
    }
    children.flat().filter(c => c != null).forEach(c => node.append(c));
    return node;
  };
  const currency = cents => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100).replace('-', '−');
  const date = value => value ? value.slice(0, 10).split('-').reverse().join('/') : '—';
  const badge = status => el('span', { class: 'pill ' + (/Vencid/.test(status) ? 'pill-neg' : /Pago|Recebido|Importado/.test(status) ? 'pill-pos' : /hoje/.test(status) ? 'pill-warn' : 'pill-neutral'), text: status });
  function notify(message) {
    const node = document.getElementById('notification');
    node.textContent = message;
    node.hidden = false;
    clearTimeout(notify.timer);
    notify.timer = setTimeout(() => { node.hidden = true; }, 6000);
  }
  function dialog(title, content, { confirm, label = 'Confirmar' } = {}) {
    const node = el('dialog', { class: 'dialog', 'aria-labelledby': 'dialog-title' });
    const close = el('button', { type: 'button', class: 'btn btn-ghost', text: 'Fechar', onclick: () => node.close() });
    const actions = el('div', { class: 'actions dialog-actions' }, close);
    if (confirm) actions.append(el('button', { type: 'button', class: 'btn btn-primary', text: label, onclick: () => { node.close(); confirm(); } }));
    node.append(el('div', { class: 'dialog-head' }, el('h2', { id: 'dialog-title', text: title })), content, actions);
    node.addEventListener('close', () => node.remove());
    node.addEventListener('click', e => { if (e.target === node) { const r = node.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) node.close(); } });
    document.body.append(node);
    node.showModal();
    return node;
  }
  const csvValue = value => {
    let str = String(value ?? '');
    // Arquivos exportados não executam fórmulas de texto fornecido por terceiros.
    if (/^[\s]*[=+@-]/.test(str)) str = "'" + str;
    return '"' + str.replace(/"/g, '""') + '"';
  };
  function downloadCSV(name, columns, rows, context = '') {
    const lines = [context ? [context] : null, columns.map(c => c.label), ...rows.map(row => columns.map(c => c.export ? c.export(row) : row[c.key]))].filter(Boolean);
    const blob = new Blob(['\uFEFF' + lines.map(line => line.map(csvValue).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob), link = el('a', { href: url, download: name + '.csv' });
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify(`${rows.length} registros exportados. ${context}`);
  }
  // A tabela recebe somente resultados da camada de cálculos. Estado preservado por instância.
  function dataTable(host, { columns, rows, name, filters = [], dateKey, context = '' }) {
    const state = { query: '', sort: null, dir: 1, page: 1, de: '', ate: '', filters: {} };
    const input = el('input', { type: 'search', class: 'input', placeholder: 'Pesquisar registros…', 'aria-label': `Pesquisar ${name}` });
    const toolbar = el('div', { class: 'filters' }, el('label', { class: 'field field-grow' }, el('span', { text: 'Pesquisar' }), input));
    const body = el('tbody'), head = el('thead'), table = el('table', { 'aria-label': name }, head, body);
    const empty = el('div', { class: 'empty', text: 'Nenhum registro encontrado. Altere os filtros ou importe os dados correspondentes.' });
    const count = el('span', { class: 'stamp', role: 'status', 'aria-live': 'polite' });
    const prev = el('button', { type: 'button', class: 'btn btn-ghost', text: 'Anterior' });
    const next = el('button', { type: 'button', class: 'btn btn-ghost', text: 'Próxima' });
    const pager = el('div', { class: 'table-pagination' }, count, el('div', { class: 'actions' }, prev, next));
    const exportBtn = el('button', { type: 'button', class: 'btn btn-ghost', text: 'Exportar CSV' });
    const controls = [];
    filters.forEach(filter => {
      const select = el('select', { class: 'select', 'aria-label': filter.label }, el('option', { value: '', text: 'Todos' }), ...[...new Set(rows.map(r => r[filter.key]).filter(Boolean))].sort().map(value => el('option', { value, text: value })));
      select.onchange = () => { state.filters[filter.key] = select.value; state.page = 1; draw(); };
      toolbar.append(el('label', { class: 'field' }, el('span', { text: filter.label }), select));
      controls.push(select);
    });
    if (dateKey) for (const [key, label] of [['de', 'De'], ['ate', 'Até']]) {
      const field = el('input', { type: 'date', class: 'input', 'aria-label': label });
      field.onchange = () => { state[key] = field.value; state.page = 1; draw(); };
      toolbar.append(el('label', { class: 'field' }, el('span', { text: label }), field));
      controls.push(field);
    }
    toolbar.append(el('button', { type: 'button', class: 'btn btn-text', text: 'Limpar', onclick: () => { Object.assign(state, { query: '', page: 1, de: '', ate: '', filters: {} }); input.value = ''; controls.forEach(c => { c.value = ''; }); draw(); } }), exportBtn);
    const error = el('p', { class: 'field-error', role: 'alert' });
    const filtered = () => rows.filter(row => (!state.query || columns.some(c => String(c.export ? c.export(row) : row[c.key] ?? '').toLocaleLowerCase('pt-BR').includes(state.query))) && Object.entries(state.filters).every(([key, value]) => !value || row[key] === value) && (!dateKey || ((!state.de || row[dateKey] >= state.de) && (!state.ate || row[dateKey] <= state.ate))));
    function draw() {
      const invalid = state.de && state.ate && state.de > state.ate;
      error.textContent = invalid ? 'A data final deve ser igual ou posterior à data inicial.' : '';
      exportBtn.disabled = !!invalid;
      let visible = invalid ? [] : filtered();
      if (state.sort) visible.sort((a, b) => {
        const x = a[state.sort], y = b[state.sort];
        return (typeof x === 'number' ? x - y : String(x ?? '').localeCompare(String(y ?? ''), 'pt-BR')) * state.dir;
      });
      head.replaceChildren(el('tr', {}, ...columns.map(c => {
        const th = el('th', { class: c.numeric ? 'num' : '' });
        if (c.key) {
          th.setAttribute('aria-sort', state.sort === c.key ? (state.dir === 1 ? 'ascending' : 'descending') : 'none');
          th.append(el('button', { type: 'button', class: 'sort', text: c.label, onclick: () => { state.dir = state.sort === c.key ? -state.dir : 1; state.sort = c.key; draw(); } }));
        } else th.textContent = c.label;
        return th;
      })));
      const pages = Math.max(1, Math.ceil(visible.length / 15));
      state.page = Math.min(state.page, pages);
      body.replaceChildren(...visible.slice((state.page - 1) * 15, state.page * 15).map(row => el('tr', {}, ...columns.map(c => el('td', { class: c.numeric ? 'num' : '' }, c.render ? c.render(row) : String(row[c.key] ?? '—'))))));
      empty.hidden = !!visible.length;
      count.textContent = `${visible.length} registros · Página ${state.page} de ${pages}`;
      prev.disabled = state.page === 1; next.disabled = state.page === pages;
    }
    input.oninput = () => { state.query = input.value.trim().toLocaleLowerCase('pt-BR'); state.page = 1; draw(); };
    prev.onclick = () => { state.page--; draw(); }; next.onclick = () => { state.page++; draw(); };
    exportBtn.onclick = () => downloadCSV(name, columns.filter(c => c.key), filtered(), context);
    host.replaceChildren(toolbar, error, el('div', { class: 'tbl-wrap data-table-wrap', tabindex: '0', 'aria-label': `Tabela de ${name}, role para ver todas as colunas` }, table), empty, pager);
    draw();
  }
  window.CaixaUI = { el, currency, date, badge, notify, dialog, dataTable, downloadCSV };
})();
