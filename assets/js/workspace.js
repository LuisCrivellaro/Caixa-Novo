// Tabelas e detalhes das páginas. Recebem só resultados da camada de cálculos.
'use strict';
window.criarWorkspace = ({ get, posicao, origem, irPara }) => {
  const { el, currency, date, badge, dialog, dataTable } = window.CaixaUI;
  const signed = (cents, sentido = 1) => {
    const v = sentido * cents;
    return el('span', { class: v < 0 ? 'neg' : v > 0 ? 'pos' : '', text: (v > 0 ? '+' : '') + currency(v) });
  };
  const exportCents = (cents) => (cents / 100).toFixed(2).replace('.', ',');
  const kv = (pairs) => el('dl', { class: 'kv' }, ...pairs.filter(([, v]) => v !== undefined).map(([label, value]) => el('div', {}, el('dt', { text: label }), el('dd', {}, value == null || value === '' ? '—' : value))));
  const pct = (v) => (v == null || !isFinite(v) ? '—' : new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 }).format(v));
  const context = () => origem() + ' · Posição de ' + date(posicao());

  // ---- Títulos (Contas a receber e Contas a pagar)
  const RANK = { Vencido: 0, 'Vence hoje': 1, 'A vencer': 2 };
  const ordemTitulos = (a, b) => {
    const ra = RANK[a.situacao] ?? 3, rb = RANK[b.situacao] ?? 3;
    if (ra !== rb) return ra - rb;
    return ra === 3 ? b.vencimento.localeCompare(a.vencimento) : a.vencimento.localeCompare(b.vencimento);
  };
  const novoEstado = (filters = {}) => ({ query: '', sort: null, dir: 1, page: 1, de: '', ate: '', filters });
  const estados = { 'A receber': novoEstado(), 'A pagar': novoEstado(), clientes: novoEstado(), fornecedores: novoEstado(), movimentos: novoEstado(), categorias: novoEstado(), fluxo: novoEstado() };

  function detalheTitulo(row) {
    const receber = row.tipo === 'A receber';
    const pairs = [
      [receber ? 'Cliente' : 'Fornecedor', row.contraparte], ['Situação', badge(row.situacao)], ['Vencimento', date(row.vencimento)],
      [receber ? 'Valor em aberto' : 'Valor a pagar', row.pago_em ? currency(0) : signed(row.liquido_centavos, receber ? 1 : -1)],
      ['Documento', row.documento], ['Parcela', row.parcela || undefined], ['Emissão', date(row.emissao)],
      [receber ? 'Recebido em' : 'Pago em', date(row.pago_em)], ['Valor original', currency(row.valor_centavos)],
    ];
    if (receber) pairs.push(['Forma', row.forma], ...(row.adquirente ? [['Adquirente', row.adquirente]] : []), ['Vendedor', row.vendedor], ['Rota', row.rota]);
    else pairs.push(['Categoria', row.categoria], ['Abatimento', row.abatimento_centavos ? currency(row.abatimento_centavos) : currency(0)], ...(row.motivo ? [['Motivo do abatimento', row.motivo]] : []));
    const linked = get('movimentos_consulta').filter(m => m.origem === row.id);
    const content = el('div', { class: 'stack' }, kv(pairs));
    if (linked.length) content.append(el('div', {}, el('h3', { class: 'detail-sub', text: 'Movimentações vinculadas' }), ...linked.map(m => el('p', { class: 'card-note', text: `${date(m.data)} · ${m.descricao} · ${currency(m.assinado_centavos)} · ${m.conta}` }))));
    if (receber && row.cliente_id) content.append(el('button', { type: 'button', class: 'btn btn-ghost', text: 'Ver cliente', onclick: () => { document.querySelector('dialog[open]')?.close(); const c = clientesRows().find(c => c.id === row.cliente_id); if (c) detalheCliente(c); } }));
    dialog(receber ? 'Título a receber' : 'Título a pagar', content);
  }
  function renderTitulos(tipo) {
    const receber = tipo === 'A receber';
    const host = document.querySelector(receber ? '#r-titulos .title-table' : '#p-titulos .title-table');
    const pago = receber ? 'Recebido' : 'Pago';
    const situacoes = [{ value: 'aberto', label: 'Em aberto', test: r => !r.pago_em }, { value: 'Vencido', label: 'Vencido' }, { value: 'Vence hoje', label: 'Vence hoje' }, { value: 'A vencer', label: 'A vencer' }, { value: pago, label: receber ? 'Recebidos' : 'Pagos' }, { value: 'todos', label: 'Todos', test: () => true }];
    dataTable(host, {
      name: receber ? 'Contas a receber' : 'Contas a pagar', state: estados[tipo], context: context(), onOpen: detalheTitulo, order: ordemTitulos,
      rows: get('titulos_consulta').filter(r => r.tipo === tipo), dateKey: 'vencimento', searchKeys: ['contraparte', 'documento', 'categoria'],
      emptyText: receber ? 'Nenhum título a receber com estes filtros.' : 'Nenhum título a pagar com estes filtros.',
      filters: [{ label: 'Situação', key: 'situacao', options: situacoes, default: 'aberto' }],
      advanced: receber ? [{ label: 'Forma', key: 'forma' }, { label: 'Vendedor', key: 'vendedor' }, { label: 'Rota', key: 'rota' }] : [{ label: 'Categoria', key: 'categoria' }],
      columns: [
        { label: receber ? 'Cliente' : 'Fornecedor', key: 'contraparte', action: true, className: 'id' },
        { label: 'Vencimento', key: 'vencimento', render: r => date(r.vencimento), export: r => date(r.vencimento) },
        { label: receber ? 'Valor em aberto' : 'Valor a pagar', key: 'liquido_centavos', numeric: true, render: r => r.pago_em ? el('span', { class: 'dash', text: currency(0) }) : signed(r.liquido_centavos, receber ? 1 : -1), export: r => exportCents(r.pago_em ? 0 : (receber ? 1 : -1) * r.liquido_centavos) },
        { label: 'Situação', key: 'situacao', render: r => badge(r.situacao) },
        { label: 'Documento', key: 'documento', className: 'csv-only' },
        { label: receber ? 'Forma' : 'Categoria', key: 'categoria', className: 'csv-only' },
      ],
    });
  }

  // ---- Clientes (dentro de Contas a receber)
  const NOTA = { 'Paga em dia': 'pill-pos', 'Atrasa às vezes': 'pill-warn', 'Costuma atrasar': 'pill-neg', 'Sem histórico': 'pill-neutral' };
  function clientesRows() {
    const dev = new Map(get('devedores').map(d => [d.cliente_id, d]));
    const notas = new Map(get('pagadores').map(p => [p.cliente_id, p]));
    return get('pessoas_consulta').filter(p => p.tipo === 'Cliente').map(c => {
      const d = dev.get(c.id), n = notas.get(c.id);
      const vencido = d ? Math.round(d.vencido * 100) : 0, aVencer = d ? Math.round(d.a_vencer * 100) : 0;
      return { ...c, cliente: c.nome, vencido_centavos: vencido, a_vencer_centavos: aVencer, aberto_centavos: vencido + aVencer, maior_atraso: d ? d.maior_atraso : 0,
        uso_limite: c.limite_centavos ? (vencido + aVencer) / c.limite_centavos : null, nota: n ? n.nota : 'Sem histórico', em_dia: n ? n.em_dia : null };
    });
  }
  function detalheCliente(c) {
    const content = el('div', { class: 'stack' }, kv([
      ['Nota de pagador', el('span', { class: 'pill ' + NOTA[c.nota], text: c.nota })], ['Pago em dia', pct(c.em_dia)],
      ['Vencido', signed(c.vencido_centavos)], ['A vencer', signed(c.a_vencer_centavos)], ['Maior atraso', c.maior_atraso ? `${c.maior_atraso} dias` : '—'],
      ['Limite de crédito', currency(c.limite_centavos)], ['Limite usado', c.uso_limite == null ? '—' : el('span', { class: c.uso_limite > 1 ? 'neg' : '', text: pct(c.uso_limite) })],
      ['Vendedor', c.vendedor], ['Rota', c.rota], ['Segmento', c.grupo],
    ]), el('button', { type: 'button', class: 'btn btn-ghost', text: 'Ver títulos deste cliente', onclick: () => {
      document.querySelector('dialog[open]')?.close();
      Object.assign(estados['A receber'], { query: c.cliente.toLocaleLowerCase('pt-BR'), page: 1, filters: { situacao: 'todos' } });
      irPara('receber/titulos');
    } }));
    dialog(c.cliente, content);
  }
  function renderClientes() {
    dataTable(document.querySelector('#r-clientes .client-table'), {
      name: 'Clientes', state: estados.clientes, context: context(), onOpen: detalheCliente, rows: clientesRows(), searchKeys: ['cliente', 'vendedor', 'rota'],
      order: (a, b) => b.vencido_centavos - a.vencido_centavos || b.aberto_centavos - a.aberto_centavos || a.cliente.localeCompare(b.cliente, 'pt-BR'),
      emptyText: 'Nenhum cliente com estes filtros.',
      filters: [{ label: 'Situação', key: 'situacao_cliente', default: 'aberto', options: [
        { value: 'aberto', label: 'Com saldo em aberto', test: c => c.aberto_centavos > 0 }, { value: 'vencido', label: 'Com valor vencido', test: c => c.vencido_centavos > 0 },
        { value: 'limite', label: 'Acima do limite', test: c => c.uso_limite > 1 }, { value: 'todos', label: 'Todos', test: () => true }] }],
      advanced: [{ label: 'Nota', key: 'nota' }, { label: 'Vendedor', key: 'vendedor' }, { label: 'Rota', key: 'rota' }],
      columns: [
        { label: 'Cliente', key: 'cliente', action: true, className: 'id' },
        { label: 'Vencido', key: 'vencido_centavos', numeric: true, render: r => r.vencido_centavos ? el('span', { class: 'neg', text: currency(r.vencido_centavos) }) : el('span', { class: 'dash', text: '—' }), export: r => exportCents(r.vencido_centavos) },
        { label: 'Em aberto', key: 'aberto_centavos', numeric: true, render: r => signed(r.aberto_centavos), export: r => exportCents(r.aberto_centavos) },
        { label: 'Nota', key: 'nota', render: r => el('span', { class: 'pill ' + NOTA[r.nota], text: r.nota }) },
        { label: 'Limite de crédito', key: 'limite_centavos', className: 'csv-only', export: r => exportCents(r.limite_centavos) },
        { label: 'Vendedor', key: 'vendedor', className: 'csv-only' }, { label: 'Rota', key: 'rota', className: 'csv-only' },
      ],
    });
  }

  // ---- Fornecedores (dentro de Contas a pagar)
  function detalheFornecedor(f) {
    dialog(f.fornecedor, el('div', { class: 'stack' }, kv([
      ['Em aberto', signed(f.aberto_centavos, -1)], ['Vencido', f.vencido_centavos ? signed(f.vencido_centavos, -1) : '—'],
      ['Próximo vencimento', date(f.proximo_vencimento)], ['Títulos em aberto', String(f.abertos_qtd)], ['Títulos nas fontes', String(f.titulos_qtd)], ['Categorias', f.categorias],
    ]), el('button', { type: 'button', class: 'btn btn-ghost', text: 'Ver títulos deste fornecedor', onclick: () => {
      document.querySelector('dialog[open]')?.close();
      Object.assign(estados['A pagar'], { query: f.fornecedor.toLocaleLowerCase('pt-BR'), page: 1, filters: { situacao: 'todos' } });
      irPara('pagar/titulos');
    } })));
  }
  function renderFornecedores() {
    dataTable(document.querySelector('#p-fornecedores .supplier-table'), {
      name: 'Fornecedores', state: estados.fornecedores, context: context(), onOpen: detalheFornecedor, rows: get('fornecedores_resumo'), searchKeys: ['fornecedor', 'categorias'],
      emptyText: 'Nenhum fornecedor com estes filtros.',
      filters: [{ label: 'Situação', key: 'situacao_fornecedor', default: 'aberto', options: [
        { value: 'aberto', label: 'Com saldo em aberto', test: f => f.aberto_centavos > 0 }, { value: 'vencido', label: 'Com valor vencido', test: f => f.vencido_centavos > 0 }, { value: 'todos', label: 'Todos', test: () => true }] }],
      columns: [
        { label: 'Fornecedor', key: 'fornecedor', action: true, className: 'id' },
        { label: 'Vencido', key: 'vencido_centavos', numeric: true, render: f => f.vencido_centavos ? signed(f.vencido_centavos, -1) : el('span', { class: 'dash', text: '—' }), export: f => exportCents(-f.vencido_centavos) },
        { label: 'Em aberto', key: 'aberto_centavos', numeric: true, render: f => signed(f.aberto_centavos, -1), export: f => exportCents(-f.aberto_centavos) },
        { label: 'Próximo vencimento', key: 'proximo_vencimento', className: 'hide-sm', render: f => date(f.proximo_vencimento), export: f => date(f.proximo_vencimento) },
      ],
    });
  }

  // ---- Tesouraria
  function renderContas(abrirConta) {
    const rows = get('contas_consulta');
    const total = rows.reduce((s, c) => s + c.saldo_centavos, 0);
    const list = el('ul', { class: 'accounts' }, ...rows.map(c => el('li', {},
      el('span', { class: 'account-name' }, el('b', { text: c.conta }), el('small', { text: c.tipo })),
      el('strong', { class: 'num ' + (c.saldo_centavos < 0 ? 'neg' : c.saldo_centavos > 0 ? 'pos' : ''), text: currency(c.saldo_centavos) }),
      el('button', { type: 'button', class: 'btn btn-text', text: 'Movimentações', 'aria-label': `Ver movimentações de ${c.conta}`, onclick: () => abrirConta(c.conta) }))),
      el('li', { class: 'accounts-total' }, el('span', { class: 'account-name' }, el('b', { text: 'Total' })), el('strong', { class: 'num ' + (total < 0 ? 'neg' : total > 0 ? 'pos' : ''), text: currency(total) }), el('span')));
    document.getElementById('t-contas').replaceChildren(el('div', { class: 'card-head' }, el('h2', { text: 'Saldos' }), el('span', { class: 'meta', text: 'Informados pela fonte de contas em ' + date(posicao()) })),
      rows.length ? list : el('p', { class: 'empty', text: 'Nenhuma conta nas fontes.' }));
  }
  function detalheMovimento(r) {
    dialog('Movimentação', kv([['Data', date(r.data)], ['Descrição', r.descricao], ['Valor', signed(r.assinado_centavos)], ['Conta', r.conta], ['Categoria', r.categoria], ['Cliente / fornecedor', r.contraparte], ['Forma', r.forma], ['Identificação', r.id]]));
  }
  function renderMovimentos() {
    dataTable(document.querySelector('#t-mov .mov-table'), {
      name: 'Movimentações', state: estados.movimentos, context: context(), onOpen: detalheMovimento, rows: get('movimentos_consulta'), dateKey: 'data',
      searchKeys: ['descricao', 'contraparte', 'categoria', 'conta'], order: (a, b) => b.data.localeCompare(a.data) || String(b.id).localeCompare(String(a.id)),
      emptyText: 'Nenhuma movimentação com estes filtros.',
      filters: [{ label: 'Tipo', key: 'tipo', options: [{ value: '', label: 'Entradas e saídas' }, { value: 'entrada', label: 'Entradas' }, { value: 'saida', label: 'Saídas' }] }, { label: 'Conta', key: 'conta' }],
      advanced: [{ label: 'Categoria', key: 'categoria' }, { label: 'Forma', key: 'forma' }],
      columns: [
        { label: 'Data', key: 'data', render: r => date(r.data), export: r => date(r.data) },
        { label: 'Descrição', key: 'descricao', action: true, className: 'id', render: r => r.descricao || 'Movimentação' },
        { label: 'Conta', key: 'conta', className: 'hide-sm' },
        { label: 'Valor', key: 'assinado_centavos', numeric: true, render: r => signed(r.assinado_centavos), export: r => exportCents(r.assinado_centavos) },
        { label: 'Categoria', key: 'categoria', className: 'csv-only' }, { label: 'Cliente / fornecedor', key: 'contraparte', className: 'csv-only' },
      ],
    });
  }
  const filtrarConta = (conta) => Object.assign(estados.movimentos, novoEstado({ conta }));

  // ---- Configurações e fluxo
  const renderCategorias = () => dataTable(document.querySelector('#s-categorias .category-table'), {
    name: 'Categorias', state: estados.categorias, rows: get('categorias_consulta'), context: origem(), filters: [{ label: 'Tipo', key: 'tipo' }],
    columns: [{ label: 'Categoria', key: 'categoria' }, { label: 'Tipo', key: 'tipo', render: r => badge(r.tipo) }, { label: 'Registros nas fontes', key: 'registros', numeric: true }],
  });
  function renderFlowTable(rows, grao) {
    if (estados.fluxo.filters.grao) estados.fluxo.filters.grao = grao;
    dataTable(document.querySelector('#f-details .flow-table'), { name: 'Fluxo de caixa', rows, state: estados.fluxo, dateKey: 'periodo', context: context(), filters: [{ label: 'Agrupamento', key: 'grao' }, { label: 'Natureza', key: 'natureza' }], columns: [{ label: 'Período', key: 'periodo', render: r => date(r.periodo), export: r => date(r.periodo) }, { label: 'Agrupamento', key: 'grao' }, { label: 'Natureza', key: 'natureza', render: r => badge(r.natureza === 'previsto' ? 'Previsto' : 'Realizado') }, ...['entradas', 'saidas', 'liquido'].map((key, i) => ({ label: ['Entradas', 'Saídas', 'Resultado'][i], key: key + '_centavos', numeric: true, render: r => signed(r[key + '_centavos'], key === 'saidas' ? -1 : 1), export: r => exportCents((key === 'saidas' ? -1 : 1) * r[key + '_centavos']) }))] });
  }
  const filtrarTitulos = (tipo, filters) => Object.assign(estados[tipo], novoEstado(filters));
  const filtrarClientes = (filters) => Object.assign(estados.clientes, novoEstado(filters));
  const reiniciar = () => Object.keys(estados).forEach(k => { estados[k] = novoEstado(); });
  return { renderTitulos, renderClientes, renderFornecedores, renderContas, renderMovimentos, renderCategorias, renderFlowTable, filtrarConta, filtrarTitulos, filtrarClientes, reiniciar };
};
