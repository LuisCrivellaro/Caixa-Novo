// Módulos de consulta: dependem dos cálculos e dos componentes compartilhados.
'use strict';
window.criarWorkspace = ({ get, posicao, origem, abrirMovimentos }) => {
  const { el, currency, date, badge, dialog, dataTable, notify } = window.CaixaUI;
  const money = key => r => el('span', { class: r[key] < 0 ? 'neg' : r[key] > 0 ? 'pos' : '', text: currency(r[key]) });
  const amount = (label, key) => ({ label, key, numeric: true, render: money(key), export: r => (r[key] / 100).toFixed(2).replace('.', ',') });
  const dateColumn = (label, key) => ({ label, key, render: r => date(r[key]), export: r => date(r[key]) });
  const titleColumns = [
    dateColumn('Vencimento', 'vencimento'), { label: 'Cliente / fornecedor', key: 'contraparte' },
    { label: 'Documento', key: 'documento' }, { label: 'Categoria / forma', key: 'categoria' },
    { ...amount('Valor líquido', 'liquido_centavos'), render: r => {
      const value = r.tipo === 'A pagar' ? -r.liquido_centavos : r.liquido_centavos;
      return el('span', { class: value < 0 ? 'neg' : value > 0 ? 'pos' : '', text: (value > 0 ? '+' : '') + currency(value) });
    }, export: r => ((r.tipo === 'A pagar' ? -1 : 1) * r.liquido_centavos / 100).toFixed(2).replace('.', ',') }, { label: 'Situação', key: 'situacao', render: r => badge(r.situacao) },
    { label: 'Detalhes', render: r => el('button', { type: 'button', class: 'btn btn-text', text: 'Ver título', onclick: () => detalhe(r) }) },
  ];
  function detalhe(row) {
    const list = el('dl', { class: 'kv' });
    const fields = [
      ['Identificação', row.id], ['Tipo', row.tipo], ['Cliente / fornecedor', row.contraparte], ['Documento', row.documento],
      ['Emissão', date(row.emissao)], ['Vencimento', date(row.vencimento)],
      ['Pagamento / recebimento', date(row.pago_em)], ['Situação', row.situacao],
      ['Valor original', currency(row.valor_centavos)], ['Abatimento', currency(row.abatimento_centavos)],
      ['Valor líquido', currency(row.liquido_centavos)], ...(row.motivo ? [['Motivo do abatimento', row.motivo]] : []),
    ];
    fields.forEach(([label, value]) => list.append(el('div', {}, el('dt', { text: label }), el('dd', { text: value }))));
    const linked = get('movimentos_consulta').filter(m => m.origem === row.id);
    const history = el('div', {}, el('h3', { text: 'Movimentos vinculados' }), ...(linked.length ? linked.map(m => el('p', { class: 'card-note', text: `${date(m.data)} · ${m.descricao} · ${currency(m.assinado_centavos)} · ${m.conta}` })) : [el('p', { class: 'card-note', text: 'Nenhum movimento com vínculo a este título na fonte carregada.' })]));
    dialog('Detalhes do título', el('div', { class: 'stack' }, badge(row.situacao), list, history,
      el('p', { class: 'card-note', text: 'A situação corresponde à fonte importada. O formato atual registra a data da baixa e não contém histórico de pagamentos parciais ou competência.' })));
  }
  const modules = [
    ['contas', 'Contas financeiras', 'Saldos informados pelas fontes e consulta dos movimentos por conta.'],
    ['pessoas', 'Clientes e fornecedores', 'Clientes cadastrados e fornecedores identificados nos títulos a pagar.'],
    ['categorias', 'Categorias', 'Categorias que já são utilizadas nos movimentos e nas contas a pagar.'],
    ['relatorios', 'Relatórios', 'Consulte e exporte os registros com os filtros que você precisa.'],
    ['configuracoes', 'Configurações', 'Aparência e informações sobre as fontes deste navegador.'],
  ];
  modules.forEach(([id, title, description]) => {
    const section = el('section', { id, class: 'view', 'aria-labelledby': 'h-' + id, hidden: '' },
      el('div', { class: 'title-row' }, el('div', {}, el('span', { class: 'eyebrow', text: 'CAIXA-NOVO / GESTÃO FINANCEIRA' }), el('h1', { id: 'h-' + id, text: title }), el('p', { class: 'finding', text: description }))),
      el('article', { class: 'card', id: id + '-content' }));
    document.getElementById('main').append(section);
  });
  function mountTitles(type, id) {
    let card = document.getElementById(id);
    if (!card) {
      card = el('article', { class: 'card', id }, el('div', { class: 'card-head' }, el('h2', { text: type === 'A receber' ? 'Títulos a receber' : 'Histórico de títulos a pagar' })), el('div', { class: 'title-table' }));
      const section = document.getElementById(type === 'A receber' ? 'receber' : 'pagar');
      section.insertBefore(card, section.children[2]);
    }
    dataTable(card.querySelector('.title-table'), { name: type, columns: titleColumns, rows: get('titulos_consulta').filter(r => r.tipo === type), dateKey: 'vencimento', filters: [{ label: 'Situação', key: 'situacao' }, { label: 'Categoria / forma', key: 'categoria' }], context: origem() });
  }
  const renderContas = () => {
    const cards = el('div', { class: 'account-grid' });
    const rows = get('contas_consulta');
    rows.forEach(c => cards.append(el('article', { class: 'account-card' },
      el('span', { class: 'account-icon', text: c.tipo.includes('Caixa') ? 'CX' : 'BC' }),
      el('h2', { text: c.conta }), el('span', { class: 'stamp', text: c.tipo }),
      el('strong', { class: 'account-balance ' + (c.saldo_centavos < 0 ? 'neg' : c.saldo_centavos > 0 ? 'pos' : ''), text: currency(c.saldo_centavos) }),
      el('span', { class: 'stamp', text: 'Posição de ' + date(c.data_saldo) }),
      el('button', { type: 'button', class: 'btn btn-ghost', text: 'Ver movimentações →', onclick: () => abrirMovimentos(c.conta) }))));
    document.getElementById('contas-content').replaceChildren(el('div', { class: 'card-head' }, el('h2', { text: 'Suas contas' }), el('span', { class: 'meta', text: rows.length + ' contas' })), cards,
      el('p', { class: 'card-note', text: 'Os saldos são os informados na fonte de contas. A lista de movimentos não recalcula esses saldos.' }));
  };
  const renderPessoas = () => dataTable(document.getElementById('pessoas-content'), {
    name: 'Clientes e fornecedores', rows: get('pessoas_consulta'), context: origem(), filters: [{ label: 'Tipo', key: 'tipo' }],
    columns: [{ label: 'Nome', key: 'nome' }, { label: 'Tipo', key: 'tipo', render: r => badge(r.tipo) }, { label: 'Segmento', key: 'grupo' }, { label: 'Vendedor', key: 'vendedor' }, { label: 'Rota', key: 'rota' }, { ...amount('Limite de crédito', 'limite_centavos'), render: r => r.limite_centavos == null ? '—' : currency(r.limite_centavos), export: r => r.limite_centavos == null ? '' : (r.limite_centavos / 100).toFixed(2) }],
  });
  const renderCategorias = () => dataTable(document.getElementById('categorias-content'), {
    name: 'Categorias', rows: get('categorias_consulta'), context: origem(), filters: [{ label: 'Tipo', key: 'tipo' }],
    columns: [{ label: 'Categoria', key: 'categoria' }, { label: 'Tipo', key: 'tipo', render: r => badge(r.tipo) }, { label: 'Registros nas fontes', key: 'registros', numeric: true }],
  });
  function renderRelatorios() {
    const host = document.getElementById('relatorios-content'), target = el('div');
    const select = el('select', { class: 'select', 'aria-label': 'Relatório' }, ...['Movimentações', 'Contas a receber', 'Contas a pagar', 'Fluxo de caixa'].map(v => el('option', { text: v, value: v })));
    host.replaceChildren(el('div', { class: 'card-head' }, el('h2', { text: 'Consulta e exportação' }), select), target);
    const draw = () => {
      const type = select.value;
      const common = { name: type, context: origem() + ' · Posição de ' + date(posicao()) };
      if (type === 'Movimentações') dataTable(target, { ...common, rows: get('movimentos_consulta'), dateKey: 'data', filters: [{ label: 'Tipo', key: 'tipo' }, { label: 'Conta', key: 'conta' }], columns: [dateColumn('Data', 'data'), { label: 'Descrição', key: 'descricao' }, { label: 'Categoria', key: 'categoria' }, { label: 'Conta', key: 'conta' }, { label: 'Tipo', key: 'tipo' }, amount('Valor', 'assinado_centavos')] });
      else if (type === 'Fluxo de caixa') dataTable(target, { ...common, rows: get('fluxo'), dateKey: 'periodo', filters: [{ label: 'Agrupamento', key: 'grao' }, { label: 'Natureza', key: 'natureza' }], columns: [dateColumn('Período', 'periodo'), { label: 'Agrupamento', key: 'grao' }, { label: 'Natureza', key: 'natureza', render: r => badge(r.natureza === 'previsto' ? 'Previsto' : 'Realizado') }, ...['entradas', 'saidas', 'liquido'].map((key, i) => ({ label: ['Entradas', 'Saídas', 'Resultado'][i], key, numeric: true, render: r => currency(Math.round(r[key] * 100)) }))] });
      else dataTable(target, { ...common, rows: get('titulos_consulta').filter(r => r.tipo === (type === 'Contas a receber' ? 'A receber' : 'A pagar')), columns: titleColumns, dateKey: 'vencimento', filters: [{ label: 'Situação', key: 'situacao' }] });
    };
    select.onchange = draw; draw();
  }
  function renderConfig() {
    const group = el('div', { class: 'theme', role: 'group', 'aria-label': 'Aparência' });
    [['auto', 'Sistema'], ['light', 'Claro'], ['dark', 'Escuro']].forEach(([key, label]) => group.append(el('button', { type: 'button', 'aria-pressed': String((document.documentElement.dataset.theme || 'auto') === key), text: label, onclick: () => { document.querySelector(`[data-theme-set="${key}"]`).click(); notify('Aparência atualizada.'); } })));
    document.getElementById('configuracoes-content').replaceChildren(
      el('div', { class: 'card-head' }, el('h2', { text: 'Preferências do painel' })),
      el('div', { class: 'settings-row' }, el('div', {}, el('h3', { text: 'Aparência' }), el('p', { class: 'card-note', text: 'Escolha o tema ou acompanhe a preferência do dispositivo.' })), group),
      el('div', { class: 'settings-row' }, el('div', {}, el('h3', { text: 'Fontes de dados' }), el('p', { class: 'card-note', text: origem() + '. Dados importados ficam somente neste navegador.' })), el('a', { class: 'btn btn-ghost', href: '#dados', text: 'Gerenciar importação' })),
      el('div', { class: 'settings-row' }, el('div', {}, el('h3', { text: 'Posição financeira' }), el('p', { class: 'card-note', text: 'A data de referência vem da fonte de contas: ' + date(posicao()) + '. O painel não representa uma conexão bancária em tempo real.' }))),
      el('div', { class: 'settings-row' }, el('div', {}, el('h3', { text: 'Operações financeiras' }), el('p', { class: 'card-note', text: 'Este projeto consulta arquivos e planilhas. Cadastros, baixas, estornos, transferências e pagamentos parciais dependem de um backend com persistência e histórico.' }))));
  }
  function renderFlowTable() {
    let card = document.getElementById('f-details');
    if (!card) {
      card = el('article', { id: 'f-details', class: 'card' }, el('div', { class: 'card-head' }, el('h2', { text: 'Fluxo por período' }), el('span', { class: 'meta', text: 'O resultado do período não representa o saldo da conta.' })), el('div', { class: 'flow-table' }));
      document.getElementById('fluxo').append(card);
    }
    dataTable(card.querySelector('.flow-table'), { name: 'Fluxo de caixa', rows: get('fluxo'), dateKey: 'periodo', context: origem(), filters: [{ label: 'Agrupamento', key: 'grao' }, { label: 'Natureza', key: 'natureza' }], columns: [dateColumn('Período', 'periodo'), { label: 'Agrupamento', key: 'grao' }, { label: 'Natureza', key: 'natureza', render: r => badge(r.natureza === 'previsto' ? 'Previsto' : 'Realizado') }, ...['entradas', 'saidas', 'liquido'].map((key, i) => ({ label: ['Entradas', 'Saídas', 'Resultado'][i], key, numeric: true, render: r => currency(Math.round(r[key] * 100)), export: r => r[key].toFixed(2).replace('.', ',') }))] });
  }
  return { views: { contas: renderContas, pessoas: renderPessoas, categorias: renderCategorias, relatorios: renderRelatorios, configuracoes: renderConfig }, renderTitles: mountTitles, renderFlowTable };
};
