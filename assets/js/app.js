// Caixa Novo (Mundo Novo): telas, rotas (#geral, #fluxo, #receber, #pagar, #fechamento, #lancamentos, #indicadores) e controles.
(async () => {
  'use strict';
  // Fontes de dados: hoje são os arquivos de exemplo em dados/. Para usar dados reais, troque só esta carga.
  const FONTES = ['contas', 'clientes', 'receber', 'pagar', 'lancamentos', 'fechamentos'];
  const DATA = {};
  try {
    if (window.__DADOS__) Object.assign(DATA, window.__DADOS__); // versão de arquivo único (scripts/montar_arquivo_unico.py)
    else await Promise.all(FONTES.map(async (n) => {
      const r = await fetch(`dados/${n}.json`, { cache: 'no-store' });
      if (!r.ok) throw new Error(`dados/${n}.json respondeu ${r.status}`);
      DATA[n] = await r.json();
    }));
  } catch (e) {
    console.error(e);
    const m = document.getElementById('main');
    m.replaceChildren(Object.assign(document.createElement('p'), { className: 'err', textContent: 'Não foi possível carregar os dados. Abra o projeto por um servidor local (veja o README) em vez de abrir o arquivo direto.' }));
    m.append(Object.assign(document.createElement('button'), { className: 'btn btn-ghost', textContent: 'Tentar novamente', onclick: () => location.reload() }));
    m.setAttribute('aria-busy', 'false');
    document.getElementById('app-loading').hidden = true;
    return;
  }
  const EXEMPLO = { ...DATA };
  const IMPORT_META = {};
  const avisosFontes = [];
  for (const n of FONTES) {
    try {
      const raw = localStorage.getItem('mn-fonte-' + n);
      if (raw) {
        const o = JSON.parse(raw);
        if (!Array.isArray(o.rows) || !o.rows.length || !o.meta) throw new Error('Fonte armazenada inválida');
        DATA[n] = o.rows; IMPORT_META[n] = o.meta;
      }
    } catch (e) { avisosFontes.push(n); }
  }

  // Os mesmos cálculos do painel anterior, em centavos inteiros, rodando aqui sem servidor
  const CALCS = window.CALCULOS;
  const cache = {};
  const get = (id) => {
    if (DATA[id]) return DATA[id];
    if (!(id in cache)) cache[id] = CALCS[id].fn(...CALCS[id].inputs.map(get));
    return cache[id];
  };

  // Formatação
  const MENOS = '\u2212';
  const nfBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const nfC = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 });
  const nfPct = new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const nfInt = new Intl.NumberFormat('pt-BR');
  const clean = (s) => s.replace(/\s/g, '\u00a0').replace('-', '');
  const brl = (v) => (v < 0 ? MENOS : '') + clean(nfBRL.format(Math.abs(v)));
  const brlS = (v) => (v > 0 ? '+' : v < 0 ? MENOS : '') + clean(nfBRL.format(Math.abs(v)));
  const brlC = (v) => (v < 0 ? MENOS : '') + clean(nfC.format(Math.abs(v)));
  // Cor por sinal: positivo verde, negativo vermelho, zero sem cor
  const sinal = (v) => (v > 0.004 ? 'pos' : v < -0.004 ? 'neg' : '');
  const cv = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const pct = (v) => (v == null || !isFinite(v) ? '—' : nfPct.format(v));
  const pctS = (v) => (v == null || !isFinite(v) ? '—' : (v > 0 ? '+' : v < 0 ? MENOS : '') + nfPct.format(Math.abs(v)));
  const int = (v) => nfInt.format(v);
  const dias = (n) => int(n) + (Math.abs(n) === 1 ? ' dia' : ' dias');
  const diasS = (n) => (n > 0 ? '+' : n < 0 ? MENOS : '') + dias(Math.abs(n));
  const dBR = (iso) => (iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : '—');
  const dCurta = (iso) => iso.slice(8, 10) + '/' + iso.slice(5, 7);
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  let HOJE = DATA.contas[0]?.data_saldo;
  if (!HOJE) {
    document.getElementById('main').replaceChildren(Object.assign(document.createElement('p'), { className: 'err', textContent: 'A fonte de contas precisa de uma conta com data de saldo válida. Corrija a fonte e recarregue o painel.' }));
    document.getElementById('main').setAttribute('aria-busy', 'false');
    document.getElementById('app-loading').hidden = true;
    return;
  }
  const addDias = (iso, n) => new Date(Date.parse(iso) + n * 864e5).toISOString().slice(0, 10);
  const quando = (iso) => (iso === HOJE ? 'Hoje' : iso === addDias(HOJE, 1) ? 'Amanhã' : SEMANA[new Date(Date.parse(iso)).getUTCDay()].replace(/^./, (c) => c.toUpperCase()) + ' ' + dCurta(iso));
  const R = (rows, m, k = 'metrica') => { const r = rows.find((x) => x[k] === m); return r ? r.valor : null; };

  // DOM
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const h = (tag, attrs = {}, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v; else if (k === 'text') el.textContent = v; else if (k.startsWith('on')) el.addEventListener(k.slice(2), v); else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    return el;
  };
  const forte = (v, txt) => h('strong', { class: sinal(v) || null, text: txt });
  const kpi = (label, value, sub, opts = {}) => h('div', { class: opts.lead ? 'strip-lead' : null },
    h('span', { class: 'kpi-label', text: label }),
    h('span', { class: 'kpi-value' + (opts.cls ? ' ' + opts.cls : ''), text: value }),
    sub ? (sub.nodeType ? sub : h('span', { class: 'kpi-sub', text: sub })) : null);
  const safe = (box, fn) => {
    try { fn(); } catch (e) {
      console.error(e);
      box.replaceChildren(h('p', { class: 'err', text: 'Não foi possível calcular este bloco com os dados atuais.' }));
    }
  };
  const ICON = {"house": "<path d=\"M219.31,108.68l-80-80a16,16,0,0,0-22.62,0l-80,80A15.87,15.87,0,0,0,32,120v96a8,8,0,0,0,8,8h64a8,8,0,0,0,8-8V160h32v56a8,8,0,0,0,8,8h64a8,8,0,0,0,8-8V120A15.87,15.87,0,0,0,219.31,108.68ZM208,208H160V152a8,8,0,0,0-8-8H104a8,8,0,0,0-8,8v56H48V120l80-80,80,80Z\"/>", "chart-line": "<path d=\"M232,208a8,8,0,0,1-8,8H32a8,8,0,0,1-8-8V48a8,8,0,0,1,16,0v94.37L90.73,98a8,8,0,0,1,10.07-.38l58.81,44.11L218.73,90a8,8,0,1,1,10.54,12l-64,56a8,8,0,0,1-10.07.38L96.39,114.29,40,163.63V200H224A8,8,0,0,1,232,208Z\"/>", "hand-coins": "<path d=\"M230.33,141.06a24.43,24.43,0,0,0-21.24-4.23l-41.84,9.62A28,28,0,0,0,140,112H89.94a31.82,31.82,0,0,0-22.63,9.37L44.69,144H16A16,16,0,0,0,0,160v40a16,16,0,0,0,16,16H120a7.93,7.93,0,0,0,1.94-.24l64-16a6.94,6.94,0,0,0,1.19-.4L226,182.82l.44-.2a24.6,24.6,0,0,0,3.93-41.56ZM16,160H40v40H16Zm203.43,8.21-38,16.18L119,200H56V155.31l22.63-22.62A15.86,15.86,0,0,1,89.94,128H140a12,12,0,0,1,0,24H112a8,8,0,0,0,0,16h32a8.32,8.32,0,0,0,1.79-.2l67-15.41.31-.08a8.6,8.6,0,0,1,6.3,15.9ZM164,96a36,36,0,0,0,5.9-.48,36,36,0,1,0,28.22-47A36,36,0,1,0,164,96Zm60-12a20,20,0,1,1-20-20A20,20,0,0,1,224,84ZM164,40a20,20,0,0,1,19.25,14.61,36,36,0,0,0-15,24.93A20.42,20.42,0,0,1,164,80a20,20,0,0,1,0-40Z\"/>", "receipt": "<path d=\"M72,104a8,8,0,0,1,8-8h96a8,8,0,0,1,0,16H80A8,8,0,0,1,72,104Zm8,40h96a8,8,0,0,0,0-16H80a8,8,0,0,0,0,16ZM232,56V208a8,8,0,0,1-11.58,7.15L192,200.94l-28.42,14.21a8,8,0,0,1-7.16,0L128,200.94,99.58,215.15a8,8,0,0,1-7.16,0L64,200.94,35.58,215.15A8,8,0,0,1,24,208V56A16,16,0,0,1,40,40H216A16,16,0,0,1,232,56Zm-16,0H40V195.06l20.42-10.22a8,8,0,0,1,7.16,0L96,199.06l28.42-14.22a8,8,0,0,1,7.16,0L160,199.06l28.42-14.22a8,8,0,0,1,7.16,0L216,195.06Z\"/>", "cash-register": "<path d=\"M239.76,158.06,217.28,68.12A16,16,0,0,0,201.75,56H136V40a16,16,0,0,0-16-16H80A16,16,0,0,0,64,40V56H54.25A16,16,0,0,0,38.72,68.12L16.24,158.06A7.93,7.93,0,0,0,16,160v32a16,16,0,0,0,16,16H224a16,16,0,0,0,16-16V160A7.93,7.93,0,0,0,239.76,158.06ZM80,40h40V56H80ZM54.25,72h147.5l20,80H34.25ZM32,192V168H224v24ZM64,96a8,8,0,0,1,8-8H88a8,8,0,0,1,0,16H72A8,8,0,0,1,64,96Zm48,0a8,8,0,0,1,8-8h16a8,8,0,0,1,0,16H120A8,8,0,0,1,112,96Zm48,0a8,8,0,0,1,8-8h16a8,8,0,0,1,0,16H168A8,8,0,0,1,160,96ZM64,128a8,8,0,0,1,8-8H88a8,8,0,0,1,0,16H72A8,8,0,0,1,64,128Zm48,0a8,8,0,0,1,8-8h16a8,8,0,0,1,0,16H120A8,8,0,0,1,112,128Zm48,0a8,8,0,0,1,8-8h16a8,8,0,0,1,0,16H168A8,8,0,0,1,160,128Z\"/>", "list-bullets": "<path d=\"M80,64a8,8,0,0,1,8-8H216a8,8,0,0,1,0,16H88A8,8,0,0,1,80,64Zm136,56H88a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16Zm0,64H88a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16ZM44,52A12,12,0,1,0,56,64,12,12,0,0,0,44,52Zm0,64a12,12,0,1,0,12,12A12,12,0,0,0,44,116Zm0,64a12,12,0,1,0,12,12A12,12,0,0,0,44,180Z\"/>", "gauge": "<path d=\"M207.06,72.67A111.24,111.24,0,0,0,128,40h-.4C66.07,40.21,16,91,16,153.13V176a16,16,0,0,0,16,16H224a16,16,0,0,0,16-16V152A111.25,111.25,0,0,0,207.06,72.67ZM224,176H119.71l54.76-75.3a8,8,0,0,0-12.94-9.42L99.92,176H32V153.13c0-3.08.15-6.12.43-9.13H56a8,8,0,0,0,0-16H35.27c10.32-38.86,44-68.24,84.73-71.66V80a8,8,0,0,0,16,0V56.33A96.14,96.14,0,0,1,221,128H200a8,8,0,0,0,0,16h23.67c.21,2.65.33,5.31.33,8Z\"/>", "list": "<path d=\"M224,128a8,8,0,0,1-8,8H40a8,8,0,0,1,0-16H216A8,8,0,0,1,224,128ZM40,72H216a8,8,0,0,0,0-16H40a8,8,0,0,0,0,16ZM216,184H40a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16Z\"/>", "x": "<path d=\"M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z\"/>", "magnifying-glass": "<path d=\"M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z\"/>", "warning-circle": "<path d=\"M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm-8-80V80a8,8,0,0,1,16,0v56a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,172Z\"/>", "check-circle": "<path d=\"M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z\"/>", "arrow-right": "<path d=\"M221.66,133.66l-72,72a8,8,0,0,1-11.32-11.32L196.69,136H40a8,8,0,0,1,0-16H196.69L138.34,61.66a8,8,0,0,1,11.32-11.32l72,72A8,8,0,0,1,221.66,133.66Z\"/>"};
  Object.assign(ICON, {"bank": "<path d=\"M24,104H48v64H32a8,8,0,0,0,0,16H224a8,8,0,0,0,0-16H208V104h24a8,8,0,0,0,4.19-14.81l-104-64a8,8,0,0,0-8.38,0l-104,64A8,8,0,0,0,24,104Zm40,0H96v64H64Zm80,0v64H112V104Zm48,64H160V104h32ZM128,41.39,203.74,88H52.26ZM248,208a8,8,0,0,1-8,8H16a8,8,0,0,1,0-16H240A8,8,0,0,1,248,208Z\"/>", "upload-simple": "<path d=\"M224,144v64a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V144a8,8,0,0,1,16,0v56H208V144a8,8,0,0,1,16,0ZM93.66,77.66,120,51.31V144a8,8,0,0,0,16,0V51.31l26.34,26.35a8,8,0,0,0,11.32-11.32l-40-40a8,8,0,0,0-11.32,0l-40,40A8,8,0,0,0,93.66,77.66Z\"/>", "copy": "<path d=\"M216,32H88a8,8,0,0,0-8,8V80H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32ZM160,208H48V96H160Zm48-48H176V88a8,8,0,0,0-8-8H96V48H208Z\"/>", "whatsapp-logo": "<path d=\"M187.58,144.84l-32-16a8,8,0,0,0-8,.5l-14.69,9.8a40.55,40.55,0,0,1-16-16l9.8-14.69a8,8,0,0,0,.5-8l-16-32A8,8,0,0,0,104,64a40,40,0,0,0-40,40,88.1,88.1,0,0,0,88,88,40,40,0,0,0,40-40A8,8,0,0,0,187.58,144.84ZM152,176a72.08,72.08,0,0,1-72-72A24,24,0,0,1,99.29,80.46l11.48,23L101,118a8,8,0,0,0-.73,7.51,56.47,56.47,0,0,0,30.15,30.15A8,8,0,0,0,138,155l14.61-9.74,23,11.48A24,24,0,0,1,152,176ZM128,24A104,104,0,0,0,36.18,176.88L24.83,210.93a16,16,0,0,0,20.24,20.24l34.05-11.35A104,104,0,1,0,128,24Zm0,192a87.87,87.87,0,0,1-44.06-11.81,8,8,0,0,0-6.54-.67L40,216,52.47,178.6a8,8,0,0,0-.66-6.54A88,88,0,1,1,128,216Z\"/>", "arrows-left-right": "<path d=\"M213.66,181.66l-32,32a8,8,0,0,1-11.32-11.32L188.69,184H48a8,8,0,0,1,0-16H188.69l-18.35-18.34a8,8,0,0,1,11.32-11.32l32,32A8,8,0,0,1,213.66,181.66Zm-139.32-64a8,8,0,0,0,11.32-11.32L67.31,88H208a8,8,0,0,0,0-16H67.31L85.66,53.66A8,8,0,0,0,74.34,42.34l-32,32a8,8,0,0,0,0,11.32Z\"/>", "file-arrow-up": "<path d=\"M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM200,216H56V40h88V88a8,8,0,0,0,8,8h48V216Zm-42.34-77.66a8,8,0,0,1-11.32,11.32L136,139.31V184a8,8,0,0,1-16,0V139.31l-10.34,10.35a8,8,0,0,1-11.32-11.32l24-24a8,8,0,0,1,11.32,0Z\"/>"});
  const icon = (name) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 256 256'); s.setAttribute('aria-hidden', 'true'); s.innerHTML = ICON[name]; return s; };
  const fmtC = (v) => brlC(v);

  // Barra de lista: rótulo, valor e um traço proporcional
  const barList = (el, rows, opts = {}) => {
    if (!rows.length) { el.replaceChildren(h('p', { class: 'empty', text: opts.empty || 'Nada no período.' })); return; }
    Charts.barList(el, rows, { format: opts.format || brl, thin: !!opts.thin, all: !!opts.all, colour: opts.colour });
    if (opts.tom) $$('li > span:nth-child(2)', el).forEach((v) => v.classList.add(opts.tom));
    if (opts.subs) $$('li', el).forEach((li, i) => { const s = opts.subs[i]; if (s) li.firstChild.title = s; });
  };

  // ------- VISÃO GERAL -------
  let chartTab = 'saldo';
  function renderGeral() {
    const res = get('resumo'), marcos = get('projecao_marcos'), proj = get('projecao');
    const minimo = R(res, 'saldo_minimo');
    const abaixo = marcos.find((m) => m.marco === 'minimo');
    const menor = marcos.find((m) => m.marco === 'menor');
    const f = $('#g-finding');
    f.replaceChildren(
      'Títulos vencidos somam ', h('span', { class: 'band', text: `${brl(R(res, 'vencidos_valor'))} em ${int(R(res, 'vencidos_qtd'))} títulos` }), '. ',
      abaixo && abaixo.dia
        ? h('span', {}, 'Com o que já está lançado, o saldo fica abaixo do mínimo de ', forte(minimo, brl(minimo)), ' a partir de ', h('strong', { text: dBR(abaixo.dia) }), '.')
        : h('span', {}, 'Com o que já está lançado, o saldo não cai abaixo do mínimo de ', forte(minimo, brl(minimo)), ' nos próximos 90 dias; o ponto mais baixo é ', forte(menor.saldo, brl(menor.saldo)), ' em ', h('strong', { text: dBR(menor.dia) }), '.'));
    $('#g-stamp').textContent = `Posição de ${dBR(HOJE)}`;

    const contas = get('saldo_contas');
    $('#g-strip').replaceChildren(
      kpi('Saldo disponível', brl(R(res, 'saldo_disponivel')), `${contas.length} contas · posição de ${dCurta(HOJE)}`, { cls: sinal(R(res, 'saldo_disponivel')) }),
      kpi('Entradas no mês', brlS(R(res, 'entradas_mes')), 'Realizadas · ' + pctS(R(res, 'variacao_entradas')) + ' vs. período anterior', { cls: sinal(R(res, 'entradas_mes')) }),
      kpi('Saídas no mês', brlS(-R(res, 'saidas_mes')), 'Realizadas · ' + pctS(R(res, 'variacao_saidas')) + ' vs. período anterior', { cls: sinal(-R(res, 'saidas_mes')) }),
      kpi('Resultado do mês', CaixaUI.currency(get('resultado_mes')[0].valor_centavos), 'Entradas menos saídas realizadas', { cls: sinal(get('resultado_mes')[0].valor_centavos) }));
    $('#g-secondary').replaceChildren(
      kpi('A receber', brlS(R(res, 'receber_aberto')), 'Carteira em aberto', { cls: sinal(R(res, 'receber_aberto')) }),
      kpi('A pagar', brlS(-R(res, 'pagar_aberto')), 'Valor líquido em aberto', { cls: sinal(-R(res, 'pagar_aberto')) }),
      kpi('Recebimentos vencidos', brl(R(res, 'vencidos_valor')), int(R(res, 'vencidos_qtd')) + ' títulos em atraso', { cls: R(res, 'vencidos_valor') > 0 ? 'neg' : '' }),
      kpi('Previsão em 30 dias', brl(marcos.find(m => m.marco === '30').saldo), 'Somente títulos já lançados', { cls: sinal(marcos.find(m => m.marco === '30').saldo) }));

    const p30 = marcos.find((m) => m.marco === '30');
    $('#kt-saldo-v').textContent = brl(p30.saldo);
    $('#kt-saldo-v').className = 'kpi-value ' + sinal(p30.saldo);
    const resMes = get('resultado_mes')[0].valor_centavos / 100;
    $('#kt-fluxo-v').textContent = brlS(resMes);
    $('#kt-fluxo-v').className = 'kpi-value ' + sinal(resMes);
    drawGeralChart();

    const venc = get('vencimentos_7d');
    const lado = (sentido, listId, totalId, sinal) => {
      const rows = venc.filter((v) => v.sentido === sentido);
      const total = rows.reduce((t, v) => t + Math.round(v.valor * 100), 0) / 100;
      $(totalId).textContent = brlS(sinal * total);
      $(totalId).className = sinal > 0 ? 'pos' : 'neg';
      const top = rows.slice().sort((x, y) => y.valor - x.valor).slice(0, 5).sort((x, y) => x.vencimento.localeCompare(y.vencimento) || y.valor - x.valor);
      $(listId).replaceChildren(...(top.length ? top.map((v) => h('li', {},
        h('span', { class: 'when', text: quando(v.vencimento) }),
        h('span', { class: 'who' }, v.contraparte, h('small', { text: v.documento })),
        h('span', { class: 'amt num ' + (sinal > 0 ? 'pos' : 'neg'), text: brlS(sinal * v.valor) }))) : [h('li', { class: 'empty', text: 'Nada vence nos próximos 7 dias.' })]));
    };
    lado('A receber', '#g-rec-list', '#g-rec-total', 1);
    lado('A pagar', '#g-pag-list', '#g-pag-total', -1);

    const alerts = [];
    if (R(res, 'vencidos_qtd') > 0) alerts.push(h('li', {}, icon('warning-circle'), h('span', {}, `Títulos vencidos a receber: ${int(R(res, 'vencidos_qtd'))}, somando `, h('span', { class: 'neg', text: brl(R(res, 'vencidos_valor')) }), '. ', h('a', { href: '#receber/vencidos', text: 'Ver clientes' }))));
    if (R(res, 'clientes_acima_limite') > 0) alerts.push(h('li', {}, icon('warning-circle'), h('span', {}, `Clientes acima do limite de crédito: ${int(R(res, 'clientes_acima_limite'))}. `, h('a', { href: '#receber/limite', text: 'Ver quais' }))));
    const dif = R(res, 'ultimo_fechamento_diferenca');
    if (dif != null && Math.abs(dif) >= 0.01) { const d = res.find((x) => x.metrica === 'ultimo_fechamento_diferenca').texto; alerts.push(h('li', {}, icon('warning-circle'), h('span', {}, `A gaveta de ${dBR(d)} fechou com `, h('span', { class: sinal(dif), text: brlS(dif) }), ' de diferença. ', h('a', { href: '#fechamento', text: 'Ver fechamento' })))); }
    if (abaixo && abaixo.dia) alerts.push(h('li', {}, icon('warning-circle'), h('span', { text: `Saldo projetado abaixo do mínimo a partir de ${dBR(abaixo.dia)}.` })));
    if (!alerts.length) alerts.push(h('li', { class: 'ok' }, icon('check-circle'), h('span', { text: 'Nenhum alerta agora.' })));
    $('#g-alerts').replaceChildren(...alerts);

    const kv = (dt, dd, cls) => h('div', {}, h('dt', { text: dt }), h('dd', { class: cls || null, text: dd }));
    const desc = R(res, 'descasamento_prazos');
    $('#g-prazos-kv').replaceChildren(
      kv('Prazo concedido aos clientes', dias(R(res, 'prazo_medio_recebimento'))),
      kv('Prazo obtido dos produtores', dias(R(res, 'prazo_medio_pagamento'))),
      kv('Diferença', diasS(desc)));
  }

  const tingir = (el) => { el.style.setProperty('--chart-1', cv('--positive')); el.style.setProperty('--chart-muted', cv('--negative')); };
  function drawGeralChart() {
    const el = $('#g-chart'), note = $('#g-chart-note'), legend = $('#g-chart-legend');
    legend.replaceChildren();
    tingir(el);
    $$('.ktab').forEach((t) => { const selected = t.id === 'kt-' + chartTab; t.setAttribute('aria-selected', String(selected)); t.tabIndex = selected ? 0 : -1; });
    el.setAttribute('aria-labelledby', 'kt-' + chartTab);
    safe(el, () => {
      if (chartTab === 'saldo') {
        const proj = get('projecao'), minimo = R(get('resumo'), 'saldo_minimo');
        const maxDia = proj.reduce((a, r, i) => (r.saidas > proj[a].saidas ? i : a), 1);
        note.textContent = 'Saldo de hoje mais os títulos em aberto, na data de vencimento. Títulos já vencidos e vendas futuras não entram.';
        Charts.line(el, {
          labels: proj.map((r) => dCurta(r.dia)),
          series: [{ name: 'Saldo projetado', values: proj.map((r) => r.saldo), colour: cv('--positive') }],
          format: brl, tickFormat: fmtC, height: 230, today: 0, todayLabel: 'Hoje', endLabel: true, negColour: cv('--negative'),
          reference: { value: minimo, label: 'Mínimo ' + brlC(minimo) },
          annotations: proj[maxDia].saidas > 0 ? [{ at: maxDia, label: `Maior saída: ${brlC(proj[maxDia].saidas)} em ${dCurta(proj[maxDia].dia)}`, short: dCurta(proj[maxDia].dia) }] : [],
        });
      } else {
        const fl = get('fluxo').filter((r) => r.grao === 'semana');
        const per = [...new Set(fl.map((r) => r.periodo))].sort().slice(-21);
        const sum = (p, k, nat) => fl.filter((r) => r.periodo === p && (!nat || r.natureza === nat)).reduce((s, r) => s + r[k], 0);
        const mark = per.map((p, i) => (sum(p, 'entradas', 'realizado') + sum(p, 'saidas', 'realizado') === 0 ? i : -1)).filter((i) => i >= 0);
        const partial = per.findIndex((p) => p <= HOJE && addDias(p, 6) >= HOJE);
        note.textContent = 'Por semana: entradas acima da linha, saídas abaixo. Semanas futuras vêm dos títulos em aberto.';
        const out = Charts.diverging(el, {
          labels: per.map(dCurta), up: per.map((p) => sum(p, 'entradas')), down: per.map((p) => sum(p, 'saidas')),
          above: 'Entradas', below: 'Saídas', mark, markLabel: 'Previsto, mais claro', markSide: 'both', markTint: true, partial: partial >= 0 ? partial : null,
          format: brl, tickFormat: fmtC, height: 230,
        });
        if (out && out.legend) legend.append(out.legend);
      }
    });
  }

  // ------- FLUXO -------
  let grao = 'semana';
  function renderFluxo() {
    workspace.renderFlowTable();
    const res = get('resumo');
    const mes = MESES[Number(HOJE.slice(5, 7)) - 1];
    $('#f-finding').replaceChildren(`Em ${mes}, até hoje, entraram `, forte(1, brl(R(res, 'entradas_mes'))), ' e saíram ', forte(-1, brl(R(res, 'saidas_mes'))), '. O resultado de caixa do mês é ', h('span', { class: 'band', text: brlS(R(res, 'entradas_mes') - R(res, 'saidas_mes')) }), '.');
    $$('#fluxo .seg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.grao === grao)));
    const el = $('#f-chart'), lg = $('#f-legend');
    tingir(el);
    lg.replaceChildren();
    safe(el, () => {
      const fl = get('fluxo').filter((r) => r.grao === grao);
      let per = [...new Set(fl.map((r) => r.periodo))].sort();
      if (grao === 'dia') per = per.filter((p) => p >= addDias(HOJE, -45) && p <= addDias(HOJE, 30));
      const sum = (p, k, nat) => fl.filter((r) => r.periodo === p && (!nat || r.natureza === nat)).reduce((s, r) => s + r[k], 0);
      const mark = per.map((p, i) => (sum(p, 'entradas', 'realizado') + sum(p, 'saidas', 'realizado') === 0 ? i : -1)).filter((i) => i >= 0);
      const label = (p) => (grao === 'mes' ? MESES[Number(p.slice(5, 7)) - 1].slice(0, 3) + '/' + p.slice(2, 4) : dCurta(p));
      const partial = per.findIndex((p) => (grao === 'dia' ? p === HOJE : grao === 'semana' ? p <= HOJE && addDias(p, 6) >= HOJE : p.slice(0, 7) === HOJE.slice(0, 7)));
      const out = Charts.diverging(el, {
        labels: per.map(label), up: per.map((p) => sum(p, 'entradas')), down: per.map((p) => sum(p, 'saidas')),
        above: 'Entradas', below: 'Saídas', mark, markLabel: 'Previsto, mais claro', markSide: 'both', markTint: true, partial: partial >= 0 ? partial : null,
        format: brl, tickFormat: fmtC, height: 280,
      });
      if (out && out.legend) lg.append(out.legend);
    });
    const tb = $('#f-cat');
    safe(tb, () => {
      tb.replaceChildren(...get('categorias').map((c) => {
        const v = c.mes_anterior ? c.mes_atual / c.mes_anterior - 1 : null;
        const sinal = c.tipo === 'entrada' ? 1 : -1;
        return h('tr', {},
          h('td', { class: 'id' }, h('b', { text: c.categoria }), h('span', { class: 'sub', text: c.tipo === 'entrada' ? 'Entrada' : 'Saída' })),
          h('td', { class: 'num ' + (sinal > 0 ? 'pos' : 'neg'), text: brlS(sinal * c.mes_atual) }),
          h('td', { class: 'num ' + (sinal > 0 ? 'pos' : 'neg'), text: brlS(sinal * c.mes_anterior) }),
          h('td', { class: 'num hide-sm ' + (c.mes_anterior ? (Math.abs(v) < 0.0005 ? '' : v > 0 ? 'pos' : 'neg') : 'dash'), text: c.mes_anterior ? pctS(v) : '—' }));
      }));
    });
  }

  // ------- A RECEBER -------
  const rState = { q: '', only: false, limite: false, nota: '', sort: 'vencido', dir: -1, all: false, cartaoAll: false };
  const NOTA_PILL = { 'Paga em dia': 'pill-pos', 'Atrasa às vezes': 'pill-warn', 'Costuma atrasar': 'pill-neg', 'Sem histórico': 'pill-neutral' };
  function renderReceber() {
    workspace.renderTitles('A receber', 'r-titulos');
    const res = get('resumo'), ind = get('indicadores'), aging = get('aging');
    const inad = R(ind, 'inadimplencia', 'indicador');
    const velho = aging.filter((a) => a.ordem >= 3).reduce((s, a) => s + Math.round(a.valor * 100), 0) / 100;
    $('#r-finding').replaceChildren('A carteira em aberto soma ', forte(R(res, 'receber_aberto'), brl(R(res, 'receber_aberto'))), '. Estão vencidos ', h('span', { class: 'band', text: brl(R(res, 'vencidos_valor')) }), `, ${pct(inad)} da carteira, e ${brl(velho)} disso tem mais de 30 dias de atraso.`);
    $('#r-strip').replaceChildren(
      kpi('Carteira em aberto', brl(R(res, 'receber_aberto')), 'Vencido e a vencer', { cls: sinal(R(res, 'receber_aberto')) }),
      kpi('Vencido', brl(R(res, 'vencidos_valor')), `${int(R(res, 'vencidos_qtd'))} títulos`, { cls: 'neg' }),
      kpi('Inadimplência', pct(inad), 'Vencido sobre a carteira'),
      kpi('Acima do limite de crédito', int(R(res, 'clientes_acima_limite')), 'Clientes', { cls: R(res, 'clientes_acima_limite') ? '' : 'zero' }));
    safe($('#r-aging'), () => barList($('#r-aging'), aging.map((a) => ({ label: `${a.faixa} (${int(a.qtd)})`, value: a.valor })), { colour: 'color-mix(in srgb, var(--brand) 32%, transparent)', tom: 'pos' }));
    safe($('#r-forma'), () => barList($('#r-forma'), get('receber_forma').map((f) => ({ label: `${f.forma} (${int(f.qtd)})`, value: f.aberto })), { colour: 'color-mix(in srgb, var(--brand) 32%, transparent)', tom: 'pos' }));
    const rec = get('recebido_por');
    safe($('#r-vend'), () => barList($('#r-vend'), rec.filter((r) => r.dimensao === 'vendedor').map((r) => ({ label: r.nome, value: r.valor })), { thin: true, all: true, colour: 'var(--positive)', tom: 'pos' }));
    safe($('#r-rota'), () => barList($('#r-rota'), rec.filter((r) => r.dimensao === 'rota').map((r) => ({ label: r.nome, value: r.valor })), { thin: true, all: true, colour: 'var(--positive)', tom: 'pos' }));
    safe($('#r-notas-grid'), () => {
      const pag = get('pagadores'), dev = get('devedores');
      const aberto = {}; dev.forEach((d) => { aberto[d.cliente_id] = Math.round(d.vencido * 100) + Math.round(d.a_vencer * 100); });
      $('#r-notas-grid').replaceChildren(...Object.keys(NOTA_PILL).map((nota) => {
        const cl = pag.filter((p) => p.nota === nota);
        const valor = cl.reduce((t, p) => t + (aberto[p.cliente_id] || 0), 0) / 100;
        return h('button', { type: 'button', class: 'nota', 'aria-pressed': String(rState.nota === nota), onclick: () => { rState.nota = rState.nota === nota ? '' : nota; $('#r-nota').value = rState.nota; renderNotasSel(); drawClientes(); } },
          h('span', { class: 'pill ' + NOTA_PILL[nota], text: nota }),
          h('span', { class: 'kpi-value', text: `${int(cl.length)} ${cl.length === 1 ? 'cliente' : 'clientes'}` }),
          h('span', { class: 'kpi-sub' }, h('span', { class: sinal(valor) || null, text: brl(valor) }), ' em aberto'));
      }));
    });
    $('#r-nota').value = rState.nota;
    $('#r-only').checked = rState.only;
    drawClientes();
    drawCartao();
  }
  const renderNotasSel = () => $$('#r-notas-grid .nota').forEach((b) => b.setAttribute('aria-pressed', String($('.pill', b).textContent === rState.nota)));
  function drawClientes() {
    const tb = $('#r-cli');
    safe(tb, () => {
      const q = rState.q.trim().toLocaleLowerCase('pt-BR');
      const notas = Object.fromEntries(get('pagadores').map((p) => [p.cliente_id, p]));
      let rows = get('devedores').map((c) => { const p = notas[c.cliente_id]; return { ...c, nota: p ? p.nota : 'Sem histórico', nota_ordem: p ? p.ordem : 3, em_dia: p ? p.em_dia : null }; }).filter((c) => (!rState.only || c.vencido > 0) && (!rState.limite || c.uso_limite > 1) && (!rState.nota || c.nota === rState.nota) && (!q || (c.cliente + ' ' + c.vendedor + ' ' + c.rota).toLocaleLowerCase('pt-BR').includes(q)));
      rows = rows.slice().sort((a, b) => ((a[rState.sort] ?? -1) - (b[rState.sort] ?? -1)) * rState.dir || b.vencido - a.vencido);
      $$('#r-clientes th').forEach((th) => { const b = $('.sort', th); if (b && b.dataset.sort === rState.sort) th.setAttribute('aria-sort', rState.dir < 0 ? 'descending' : 'ascending'); else th.removeAttribute('aria-sort'); });
      const total = get('devedores').length;
      $('#r-cli-meta').textContent = rows.length === total ? `${int(total)} clientes` : `${int(rows.length)} de ${int(total)} clientes`;
      const show = rState.all ? rows : rows.slice(0, 12);
      tb.replaceChildren(...show.map((c) => h('tr', {},
        h('td', { class: 'id' }, h('b', { text: c.cliente }), h('span', { class: 'sub', text: `${c.vendedor}, ${c.rota}` })),
        h('td', { class: 'hide-sm' }, h('span', { class: 'pill ' + NOTA_PILL[c.nota], text: c.nota }), c.em_dia != null ? h('span', { class: 'sub', text: `${pct(c.em_dia)} em dia` }) : null),
        h('td', { class: 'num' + (c.vencido > 0 ? ' neg' : ' dash'), text: c.vencido > 0 ? brl(c.vencido) : '—' }),
        h('td', { class: 'num hide-sm' + (c.maior_atraso ? '' : ' dash'), text: c.maior_atraso ? dias(c.maior_atraso) : '—' }),
        h('td', { class: 'num ' + sinal(c.a_vencer), text: brl(c.a_vencer) }),
        h('td', { class: 'num' }, c.uso_limite > 1 ? h('span', { class: 'pill pill-neg', text: pct(c.uso_limite) }) : h('span', { text: pct(c.uso_limite) }), h('span', { class: 'sub', text: 'de ' + brl(c.limite) })))));
      $('#r-cli-empty').hidden = rows.length > 0;
      const more = $('#r-cli-more');
      more.hidden = rState.all || rows.length <= 12;
      more.textContent = `Mostrar todos os ${int(rows.length)}`;
    });
  }
  function drawCartao() {
    const tb = $('#r-cartao');
    safe(tb, () => {
      const rows = get('cartao_liquidacao');
      const show = rState.cartaoAll ? rows : rows.slice(0, 8);
      tb.replaceChildren(...show.map((c) => h('tr', {}, h('td', { text: quando(c.liquidacao) }), h('td', { text: c.adquirente }), h('td', { class: 'num', text: int(c.qtd) }), h('td', { class: 'num ' + sinal(c.valor), text: brlS(c.valor) }))));
      $('#r-cartao-empty').hidden = rows.length > 0;
      const more = $('#r-cartao-more');
      more.hidden = rState.cartaoAll || rows.length <= 8;
      more.textContent = `Mostrar todos os ${int(rows.length)} repasses`;
    });
  }

  // ------- A PAGAR -------
  let pAll = false;
  function renderPagar() {
    workspace.renderTitles('A pagar', 'p-titulos');
    const res = get('resumo'), dias35 = get('pagar_dias');
    const pico = dias35.reduce((a, r) => (r.valor > a.valor ? r : a), dias35[0]);
    $('#p-finding').replaceChildren('Vencem ', forte(-1, brl(R(res, 'pagar_7_dias'))), ' nos próximos 7 dias e ', forte(-1, brl(R(res, 'pagar_30_dias'))), ' em 30 dias. O dia mais pesado é ', h('span', { class: 'band', text: `${quando(pico.dia).toLowerCase()}, com ${brl(pico.valor)}` }), '.');
    $('#p-strip').replaceChildren(
      kpi('Em aberto', brlS(-R(res, 'pagar_aberto')), 'Produtores, folha, impostos e despesas', { cls: sinal(-R(res, 'pagar_aberto')) }),
      kpi('Vence em 7 dias', brlS(-R(res, 'pagar_7_dias')), 'De hoje até a próxima semana', { cls: sinal(-R(res, 'pagar_7_dias')) }),
      kpi('Vence em 30 dias', brlS(-R(res, 'pagar_30_dias')), 'De hoje até daqui a 30 dias', { cls: sinal(-R(res, 'pagar_30_dias')) }),
      kpi('Abatimentos em 90 dias', brlS(R(res, 'abatimentos_90_dias')), 'Descontados de produtores', { cls: sinal(R(res, 'abatimentos_90_dias')) }));
    const cal = $('#p-cal');
    safe(cal, () => {
      const max = Math.max(1, ...dias35.map((r) => r.valor));
      cal.replaceChildren(...dias35.map((r) => {
        const k = r.valor / max;
        const b = h('button', { type: 'button', onclick: () => {
          const rows = get('pagar_abertos').filter(p => p.vencimento === r.dia);
          CaixaUI.dialog('Pagamentos de ' + dBR(r.dia), h('div', { class: 'stack' }, ...(rows.length ? rows.map(p => h('p', {}, p.fornecedor + ' · ' + p.documento + ' · ', h('strong', { class: 'neg', text: brlS(-p.liquido) }))) : [h('p', { class: 'empty', text: 'Nenhum título em aberto nesta data.' })])));
        }, class: (r.passado ? 'past' : '') + (r.hoje ? ' today' : '') + (k > 0.55 ? ' strong' : ''), 'aria-label': `${dBR(r.dia)}: ${r.valor ? brl(r.valor) + ', ' + int(r.qtd) + (r.qtd === 1 ? ' título' : ' títulos') : 'nada a pagar'}`, title: r.valor ? `${dBR(r.dia)}: ${brl(r.valor)} em ${int(r.qtd)} ${r.qtd === 1 ? 'título' : 'títulos'}` : dBR(r.dia) },
          h('span', { class: 'fill', style: `opacity:${r.valor ? (0.1 + 0.85 * k).toFixed(2) : 0}` }),
          h('span', { class: 'd', text: dCurta(r.dia) }),
          h('span', { class: 'v', text: r.valor ? MENOS + brlC(r.valor) : '' }));
        return b;
      }));
    });
    safe($('#p-cat'), () => barList($('#p-cat'), get('pagar_categoria').map((c) => ({ label: c.categoria, value: c.valor })), { thin: true, all: true, colour: 'var(--negative)', format: (v) => brlS(-v), tom: 'neg' }));
    drawPagarAbertos();
    const ab = get('abatimentos');
    safe($('#p-abat'), () => {
      $('#p-abat').replaceChildren(...ab.map((a) => h('tr', {}, h('td', { text: dBR(a.vencimento) }), h('td', { class: 'id' }, h('b', { text: a.fornecedor }), h('span', { class: 'sub', text: a.documento })), h('td', { text: a.motivo }), h('td', { class: 'hide-sm' }, h('span', { class: 'pill ' + (a.situacao === 'Pago' ? 'pill-neutral' : 'pill-warn'), text: a.situacao })), h('td', { class: 'num ' + sinal(a.abatimento), text: brlS(a.abatimento) }))));
      $('#p-abat-empty').hidden = ab.length > 0;
    });
  }
  function drawPagarAbertos() {
    const tb = $('#p-abertos');
    safe(tb, () => {
      const rows = get('pagar_abertos');
      $('#p-abertos-meta').textContent = `${int(rows.length)} títulos, por vencimento`;
      const show = pAll ? rows : rows.slice(0, 15);
      tb.replaceChildren(...show.map((r) => h('tr', {},
        h('td', {}, quando(r.vencimento), r.situacao !== 'A vencer' ? h('span', { class: 'sub' }, h('span', { class: 'pill ' + (r.situacao === 'Vencido' ? 'pill-neg' : 'pill-warn'), text: r.situacao })) : null),
        h('td', { class: 'id' }, h('b', { text: r.fornecedor }), h('span', { class: 'sub', text: r.documento })),
        h('td', { class: 'hide-sm', text: r.categoria }),
        h('td', { class: 'num' }, h('span', { class: sinal(-r.liquido), text: brlS(-r.liquido) }), r.abatimento ? h('span', { class: 'sub', text: `${brl(r.valor)} menos ${brl(r.abatimento)}` }) : null))));
      const more = $('#p-more');
      more.hidden = pAll || rows.length <= 15;
      more.textContent = `Mostrar todos os ${int(rows.length)}`;
    });
  }

  // ------- FECHAMENTO -------
  let cDia = null;
  function renderFechamento() {
    const dd = get('fechamento_dias');
    if (!dd.length) { $('#c-finding').textContent = 'Ainda não há fechamentos nos dados.'; $('#c-dia').replaceChildren(); $('#c-itens').replaceChildren(); $('#c-lista').replaceChildren(); $('#c-chart').replaceChildren(); return; }
    if (!cDia || !dd.some((d) => d.data === cDia)) cDia = dd[dd.length - 1].data;
    const ult = dd[dd.length - 1];
    const certos = dd.filter((d) => Math.abs(d.diferenca) < 0.01).length;
    $('#c-finding').replaceChildren(
      Math.abs(ult.diferenca) >= 0.01
        ? h('span', {}, 'A gaveta de ', h('span', { class: 'band', text: `${dBR(ult.data)} fechou com ${brlS(ult.diferenca)}` }), ` de diferença. Dos últimos ${int(dd.length)} fechamentos, ${int(certos)} bateram no centavo.`)
        : h('span', { text: `A gaveta de ${dBR(ult.data)} fechou certa. Dos últimos ${int(dd.length)} fechamentos, ${int(certos)} bateram no centavo.` }));
    const sel = $('#c-dia');
    sel.replaceChildren(...dd.slice().reverse().map((d) => h('option', { value: d.data, text: dBR(d.data) + (Math.abs(d.diferenca) >= 0.01 ? ', com diferença' : '') })));
    sel.value = cDia;
    drawFechDia();
    tingir($('#c-chart'));
    safe($('#c-chart'), () => {
      const out = Charts.diverging($('#c-chart'), { labels: dd.map((d) => dCurta(d.data)), values: dd.map((d) => d.diferenca), above: 'Sobra', below: 'Falta', format: brl, height: 220 });
      $('#c-legend').replaceChildren(); if (out && out.legend) $('#c-legend').append(out.legend);
    });
    safe($('#c-lista'), () => {
      $('#c-lista').replaceChildren(...dd.slice().reverse().map((d) => h('tr', { style: d.data === cDia ? 'background:var(--raised)' : null },
        h('td', {}, h('button', { type: 'button', class: 'btn btn-text', style: 'padding:0;height:auto', text: dBR(d.data), onclick: () => { cDia = d.data; renderFechamento(); } })),
        h('td', { class: 'hide-sm', text: d.responsavel }),
        h('td', { class: 'num ' + sinal(d.esperado), text: brl(d.esperado) }),
        h('td', { class: 'num ' + sinal(d.contado), text: brl(d.contado) }),
        h('td', { class: 'num ' + (Math.abs(d.diferenca) >= 0.01 ? sinal(d.diferenca) : 'dash'), text: Math.abs(d.diferenca) >= 0.01 ? brlS(d.diferenca) : brl(0) }))));
    });
  }
  function drawFechDia() {
    const itens = get('fechamento_itens').filter((i) => i.data === cDia);
    const d = get('fechamento_dias').find((x) => x.data === cDia);
    $('#c-dia-title').textContent = `Gaveta de ${dBR(cDia)}`;
    $('#c-resp').textContent = d ? `Fechado por ${d.responsavel}` : '';
    safe($('#c-itens'), () => {
      $('#c-itens').replaceChildren(...itens.map((i) => {
        const forte = ['Esperado na gaveta', 'Contado na gaveta', 'Diferença'].includes(i.item);

        return h('tr', { style: i.item === 'Vendas em Pix' ? 'border-top:8px solid transparent' : null },
          h('td', { style: forte ? 'font-weight:600' : null, text: i.item }),
          h('td', { class: 'num ' + sinal(i.valor), style: forte ? 'font-weight:600' : null, text: i.item === 'Diferença' || i.item === 'Sangrias para o banco' ? brlS(i.valor) : brl(i.valor) }));
      }));
    });
  }

  // ------- LANÇAMENTOS -------
  const lState = { q: '', tipo: '', de: '', ate: '', sel: {}, sort: 'data', dir: -1, n: 50 };
  function renderLanc() {
    const rows = get('lanc_view');
    $$('#lancamentos select[data-col]').forEach((s) => {
      if (s.options.length) return;
      const vals = [...new Set(rows.map((r) => r[s.dataset.col]).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
      s.replaceChildren(h('option', { value: '', text: s.dataset.all }), ...vals.map((v) => h('option', { value: v, text: v })));
      s.setAttribute('aria-label', s.dataset.all);
    });
    $('#l-meta').textContent = `${int(rows.length)} nos últimos 90 dias`;
    $('#l-de').min = rows[0]?.data || ''; $('#l-de').max = HOJE; $('#l-ate').min = rows[0]?.data || ''; $('#l-ate').max = HOJE;
    drawLanc();
  }
  function drawLanc() {
    const tb = $('#l-body');
    safe(tb, () => {
      const q = lState.q.trim().toLocaleLowerCase('pt-BR');
      const invalid = lState.de && lState.ate && lState.de > lState.ate;
      $('#l-ate').setCustomValidity(invalid ? 'A data final deve ser igual ou posterior à inicial.' : '');
      let rows = get('lanc_view').filter((r) => !invalid && (!lState.tipo || r.tipo === lState.tipo) && (!lState.de || r.data >= lState.de) && (!lState.ate || r.data <= lState.ate) &&
        Object.entries(lState.sel).every(([k, v]) => !v || r[k] === v) && (!q || (r.descricao + ' ' + r.contraparte).toLocaleLowerCase('pt-BR').includes(q)));
      const val = (r) => (lState.sort === 'valor' ? (r.tipo === 'saida' ? -r.valor : r.valor) : r[lState.sort]);
      rows = rows.slice().sort((a, b) => { const x = val(a), y = val(b); return (typeof x === 'number' ? x - y : String(x).localeCompare(String(y), 'pt-BR')) * lState.dir || b.id.localeCompare(a.id); });
      $$('#lancamentos th').forEach((th) => { const b = $('.sort', th); if (b && b.dataset.sort === lState.sort) th.setAttribute('aria-sort', lState.dir < 0 ? 'descending' : 'ascending'); else th.removeAttribute('aria-sort'); });
      const ent = rows.filter((r) => r.tipo === 'entrada').reduce((s, r) => s + Math.round(r.valor * 100), 0) / 100;
      const sai = rows.filter((r) => r.tipo === 'saida').reduce((s, r) => s + Math.round(r.valor * 100), 0) / 100;
      const show = rows.slice(0, lState.n);
      $('#l-count').replaceChildren(...(rows.length ? [`Mostrando ${int(show.length)} de ${int(rows.length)} lançamentos. Entradas `, h('span', { class: sinal(ent), text: brlS(ent) }), ', saídas ', h('span', { class: sinal(-sai), text: brlS(-sai) }), '.'] : []));
      tb.replaceChildren(...show.map((r) => h('tr', {},
        h('td', { text: dBR(r.data) }),
        h('td', { class: 'id' }, h('button', { type: 'button', class: 'entry-detail', text: r.descricao || 'Ver movimentação', onclick: () => {
          const detail = h('dl', { class: 'kv' });
          for (const [label, value] of [['Identificação', r.id], ['Data', dBR(r.data)], ['Descrição', r.descricao], ['Cliente / fornecedor', r.contraparte], ['Categoria', r.categoria], ['Conta', r.conta], ['Forma', r.forma], ['Tipo', r.tipo === 'saida' ? 'Saída' : 'Entrada'], ['Valor', brlS(r.tipo === 'saida' ? -r.valor : r.valor)]]) detail.append(h('div', {}, h('dt', { text: label }), h('dd', { text: value || '—' })));
          CaixaUI.dialog('Detalhes da movimentação', detail);
        } }), h('span', { class: 'sub', text: [r.contraparte, r.forma].filter(Boolean).join(', ') })),
        h('td', { class: 'hide-sm', text: r.categoria }),
        h('td', { class: 'hide-sm', text: r.conta }),
        h('td', { class: 'num ' + sinal(r.tipo === 'saida' ? -r.valor : r.valor), text: r.tipo === 'saida' ? brlS(-r.valor) : brlS(r.valor) }))));
      $('#l-empty').hidden = rows.length > 0;
      const more = $('#l-more'); more.hidden = rows.length <= lState.n;
    });
  }

  // ------- INDICADORES -------
  function renderInd() {
    const ind = get('indicadores'), res = get('resumo');
    const I = (k) => R(ind, k, 'indicador');
    $('#i-finding').replaceChildren('Nos últimos 30 dias a Mundo Novo faturou ', forte(I('faturamento_30d'), brl(I('faturamento_30d'))), ', com ticket médio de ', h('span', { class: 'band', text: brl(I('ticket_medio_pedido')) }), ' por pedido.');
    $('#i-strip-1').replaceChildren(
      kpi('Faturamento em 30 dias', brl(I('faturamento_30d')), 'Pedidos à vista e a prazo emitidos no período', { cls: sinal(I('faturamento_30d')) }),
      kpi('Ticket médio por pedido', brl(I('ticket_medio_pedido')), 'Faturamento dividido pelos pedidos', { cls: sinal(I('ticket_medio_pedido')) }),
      kpi('Faturamento por cliente', brl(I('ticket_medio_cliente')), 'Faturamento dividido pelos clientes que compraram', { cls: sinal(I('ticket_medio_cliente')) }),
      kpi('Margem bruta estimada', pct(I('margem_bruta_estimada')), 'Um menos compras de frutas sobre faturamento, 90 dias'));
    $('#i-strip-2').replaceChildren(
      kpi('Ciclo financeiro', diasS(I('ciclo_financeiro')), 'Prazo de recebimento menos prazo de pagamento'),
      kpi('Necessidade de capital de giro', brl(I('capital_de_giro')), 'Carteira a receber menos o que se deve a produtores'),
      kpi('Inadimplência', pct(I('inadimplencia')), 'Vencido sobre a carteira em aberto'),
      kpi('Comissões a pagar em 30 dias', brlS(-I('comissoes_30d')), 'Comissões de vendedores já lançadas', { cls: sinal(-I('comissoes_30d')) }));
    safe($('#i-desp'), () => barList($('#i-desp'), get('despesas_categoria').map((d) => ({ label: d.categoria, value: d.valor })), { thin: true, all: true, colour: 'var(--negative)', format: (v) => brlS(-v), tom: 'neg' }));
  }

  // ------- RESUMO DO DIA -------
  const DIAS_SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  function textoResumo() {
    const res = get('resumo'), marcos = get('projecao_marcos');
    const v = (m) => R(res, m);
    const dif = v('ultimo_fechamento_diferenca');
    const diaFech = (res.find((x) => x.metrica === 'ultimo_fechamento_diferenca') || {}).texto;
    const p30 = marcos.find((m) => m.marco === '30');
    const qtd = v('vencidos_qtd');
    const linhas = [
      `Caixa Novo, Mundo Novo: ${DIAS_SEMANA[new Date(Date.parse(HOJE)).getUTCDay()]} ${dBR(HOJE)}`,
      '',
      `Saldo disponível: ${brl(v('saldo_disponivel'))}`,
      `Entrou hoje: ${brlS(v('entradas_hoje'))}`,
      `Saiu hoje: ${brlS(-v('saidas_hoje'))}`,
      `Próximos 7 dias: ${brlS(v('receber_7_dias'))} a receber e ${brlS(-v('pagar_7_dias'))} a pagar`,
      `Vencidos a receber: ${brl(v('vencidos_valor'))} em ${int(qtd)} ${qtd === 1 ? 'título' : 'títulos'}`,
      `Clientes acima do limite de crédito: ${int(v('clientes_acima_limite'))}`,
    ];
    if (diaFech) linhas.push(Math.abs(dif) >= 0.01 ? `Gaveta de ${dBR(diaFech)}: diferença de ${brlS(dif)}` : `Gaveta de ${dBR(diaFech)}: fechou certa`);
    if (p30) linhas.push(`Saldo projetado em 30 dias: ${brl(p30.saldo)}`);
    return linhas.join('\n').replace(/\u00a0/g, ' ');
  }
  function abrirResumo() {
    const t = textoResumo();
    $('#g-resumo-txt').value = t;
    $('#g-resumo-whats').href = 'https://wa.me/?text=' + encodeURIComponent(t);
    $('#g-resumo').hidden = false;
    $('#g-resumo-abrir').setAttribute('aria-expanded', 'true');
    $('#g-resumo-status').textContent = '';
    $('#g-resumo-txt').focus();
  }
  function fecharResumo() { $('#g-resumo').hidden = true; $('#g-resumo-abrir').setAttribute('aria-expanded', 'false'); $('#g-resumo-abrir').focus(); }
  $('#g-resumo-abrir').addEventListener('click', () => { if ($('#g-resumo').hidden) abrirResumo(); else fecharResumo(); });
  $('#g-resumo-fechar').addEventListener('click', fecharResumo);
  $('#g-resumo-copiar').addEventListener('click', async () => {
    const ta = $('#g-resumo-txt'), st = $('#g-resumo-status');
    try { await navigator.clipboard.writeText(ta.value); st.textContent = 'Copiado.'; }
    catch (e) {
      ta.focus(); ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (e2) { ok = false; }
      st.textContent = ok ? 'Copiado.' : 'Texto selecionado. Use Ctrl+C para copiar.';
    }
  });

  // ------- LEITURA DE ARQUIVOS (planilhas, CSV e extrato OFX) -------
  const semAcento = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const norm = (s) => semAcento(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const isoDe = (y, m, d) => { const dt = new Date(Date.UTC(y, m - 1, d)); return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d ? dt.toISOString().slice(0, 10) : null; };
  const hojeReal = () => new Date().toLocaleDateString('sv', { timeZone: 'America/Sao_Paulo' });
  function lerData(v) {
    if (v == null || v === '') return null;
    if (typeof v === 'number') {
      if (v > 20000 && v < 80000) return new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 864e5).toISOString().slice(0, 10); // data do Excel
      if (v > 19000000 && v < 21000000) { const s = String(v); return isoDe(+s.slice(0, 4), +s.slice(4, 6), +s.slice(6, 8)); }
      return null;
    }
    const s = String(v).trim();
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if (m) return isoDe(+m[1], +m[2], +m[3]);
    m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})(?!\d)/); if (m) { let y = +m[3]; if (y < 100) y += 2000; return isoDe(y, +m[2], +m[1]); }
    m = s.match(/^(\d{4})(\d{2})(\d{2})/); if (m) return isoDe(+m[1], +m[2], +m[3]);
    return null;
  }
  // Devolve o número em reais (com sinal) ou null; aceita "R$ 1.234,56", "-1234.56", "(1.234,56)" e "1.234,56 D"
  function lerValor(v) {
    if (v == null || v === '') return null;
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    let s = String(v).trim(); if (!s) return null;
    let neg = false;
    if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
    if (/\s*D$/i.test(s)) { neg = !neg; s = s.replace(/\s*D$/i, ''); } else s = s.replace(/\s*C$/i, '');
    s = s.replace(/R\$|\s|\u00a0/g, '');
    if (/^[-\u2212]/.test(s)) { neg = !neg; s = s.slice(1); }
    if (/-$/.test(s)) { neg = !neg; s = s.slice(0, -1); }
    const temVirgula = s.includes(','), temPonto = s.includes('.');
    if (temVirgula && temPonto) s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
    else if (temVirgula) s = s.replace(/\./g, '').replace(',', '.');
    else if (temPonto && /^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    if (!/^\d+(\.\d+)?$/.test(s)) return null;
    const n = parseFloat(s);
    return neg ? -n : n;
  }
  function lerCSV(texto) {
    const primeira = texto.split(/\r?\n/).find((l) => l.trim()) || '';
    const conta = (c) => primeira.split(c).length - 1;
    const sep = [';', '\t', ','].sort((a, b) => conta(b) - conta(a))[0];
    const linhas = []; let campo = '', linha = [], aspas = false;
    for (let i = 0; i < texto.length; i++) {
      const ch = texto[i];
      if (aspas) { if (ch === '"') { if (texto[i + 1] === '"') { campo += '"'; i++; } else aspas = false; } else campo += ch; }
      else if (ch === '"') aspas = true;
      else if (ch === sep) { linha.push(campo); campo = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && texto[i + 1] === '\n') i++; linha.push(campo); linhas.push(linha); linha = []; campo = ''; }
      else campo += ch;
    }
    if (campo !== '' || linha.length) { linha.push(campo); linhas.push(linha); }
    return linhas.filter((l) => l.some((c) => String(c).trim() !== ''));
  }
  const decodificar = (buf) => { try { return new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch (e) { return new TextDecoder('windows-1252').decode(buf); } };
  const carregarXLSX = () => (window.XLSX ? Promise.resolve(window.XLSX) : new Promise((ok, erro) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s.onload = () => ok(window.XLSX);
    s.onerror = () => erro(new Error('O leitor de Excel não carregou. Salve a planilha como CSV e tente de novo.'));
    document.head.append(s);
  }));
  async function lerPlanilha(file) {
    const buf = await file.arrayBuffer();
    if (/\.(xlsx|xls)$/i.test(file.name)) {
      const X = await carregarXLSX();
      const wb = X.read(buf, { type: 'array' });
      return wb.SheetNames.map((nome) => ({ nome, linhas: X.utils.sheet_to_json(wb.Sheets[nome], { header: 1, raw: true, defval: '' }).filter((l) => l.some((c) => String(c).trim() !== '')) }));
    }
    return [{ nome: file.name, linhas: lerCSV(decodificar(buf).replace(/^\uFEFF/, '')) }];
  }
  function lerOFX(texto) {
    const out = [];
    texto.split(/<STMTTRN>/i).slice(1).forEach((b, i) => {
      const tag = (t) => { const m = b.match(new RegExp('<' + t + '>([^<\\r\\n]*)', 'i')); return m ? m[1].trim() : ''; };
      const data = lerData(tag('DTPOSTED'));
      const v = parseFloat(tag('TRNAMT').replace(',', '.'));
      if (data && Number.isFinite(v)) out.push({ id: 'X' + (i + 1), data, descricao: [tag('NAME'), tag('MEMO')].filter(Boolean).join(' ').trim(), centavos: Math.round(v * 100) });
    });
    return out;
  }
  // Escolhe a linha de cabeçalho (bancos costumam pôr linhas de título antes) e monta os registros
  function montarTabela(linhas) {
    const cheio = (l) => l.filter((c) => String(c).trim() !== '').length;
    const amostra = linhas.slice(0, 15);
    const max = Math.max(0, ...amostra.map(cheio));
    let hi = amostra.findIndex((l) => {
      const n = cheio(l);
      const texto = l.filter((c) => typeof c === 'string' && c.trim() !== '' && lerValor(c) === null && !lerData(c)).length;
      return n >= Math.max(2, max - 1) && texto >= n / 2;
    });
    if (hi < 0) hi = 0;
    const vistos = {};
    const colunas = (linhas[hi] || []).map((c, i) => {
      let nome = String(c).trim() || `Coluna ${i + 1}`;
      if (vistos[nome]) nome = `${nome} (${++vistos[nome]})`; else vistos[nome] = 1;
      return nome;
    });
    const registros = linhas.slice(hi + 1).map((l) => Object.fromEntries(colunas.map((c, i) => [c, l[i] ?? ''])));
    return { colunas, registros };
  }

  // ------- DEFINIÇÃO DAS FONTES PARA IMPORTAR -------
  const T = (k, l, t, s, req) => ({ k, l, t, s, req: !!req });
  const FONTES_DEF = {
    contas: { nome: 'Contas', linha: 'Uma conta (caixa, banco ou aplicação) com o saldo de hoje', campos: [
      T('conta', 'Conta', 'texto', ['conta', 'banco', 'nome', 'descricao'], 1), T('tipo', 'Tipo', 'texto', ['tipo']),
      T('saldo_centavos', 'Saldo', 'dinheiro', ['saldo', 'saldo atual', 'valor'], 1), T('data_saldo', 'Data do saldo', 'data', ['data', 'data do saldo', 'data saldo', 'posicao'], 1)],
      completar: (o) => ({ conta: o.conta, tipo: o.tipo || (/caixa/i.test(o.conta) ? 'Caixa físico' : 'Banco'), saldo_centavos: o.saldo_centavos, data_saldo: o.data_saldo }) },
    clientes: { nome: 'Clientes', linha: 'Um cliente com rota, vendedor e limite de crédito', campos: [
      T('id', 'Código do cliente', 'texto', ['codigo', 'cod', 'id', 'codigo cliente']), T('nome', 'Nome', 'texto', ['nome', 'cliente', 'razao social', 'nome fantasia'], 1),
      T('tipo', 'Tipo', 'texto', ['tipo', 'segmento', 'ramo']), T('rota', 'Rota', 'texto', ['rota', 'regiao']), T('vendedor', 'Vendedor', 'texto', ['vendedor', 'representante']),
      T('limite_centavos', 'Limite de crédito', 'dinheiro', ['limite', 'limite de credito', 'credito'])],
      completar: (o) => ({ id: o.id || o.nome, nome: o.nome, tipo: o.tipo || '', rota: o.rota || '', vendedor: o.vendedor || '', limite_centavos: Math.abs(o.limite_centavos || 0) }) },
    receber: { nome: 'Contas a receber', linha: 'Uma parcela a receber de um cliente', campos: [
      T('id', 'Número do título', 'texto', ['titulo', 'numero', 'documento', 'nosso numero', 'id']), T('pedido', 'Pedido', 'texto', ['pedido', 'nota', 'nf']),
      T('cliente_id', 'Código do cliente', 'texto', ['codigo cliente', 'cod cliente', 'codigo']), T('cliente', 'Cliente', 'texto', ['cliente', 'nome', 'razao social', 'sacado'], 1),
      T('forma', 'Forma', 'texto', ['forma', 'forma de pagamento', 'tipo']), T('adquirente', 'Adquirente do cartão', 'texto', ['adquirente', 'bandeira', 'maquininha']),
      T('parcela', 'Parcela', 'texto', ['parcela']), T('emissao', 'Emissão', 'data', ['emissao', 'data emissao', 'data da venda']),
      T('vencimento', 'Vencimento', 'data', ['vencimento', 'data vencimento', 'venc'], 1), T('valor_centavos', 'Valor', 'dinheiro', ['valor', 'valor do titulo', 'valor parcela'], 1),
      T('pago_em', 'Pago em', 'data', ['pago em', 'data pagamento', 'pagamento', 'baixa', 'data baixa']), T('vendedor', 'Vendedor', 'texto', ['vendedor']), T('rota', 'Rota', 'texto', ['rota'])],
      completar: (o, i) => ({ id: o.id || `R${i + 1}`, pedido: o.pedido || o.id || `R${i + 1}`, cliente_id: o.cliente_id || o.cliente, cliente: o.cliente, forma: o.forma || 'Boleto', adquirente: o.adquirente || '', parcela: o.parcela || '1/1', emissao: o.emissao || o.vencimento, vencimento: o.vencimento, valor_centavos: Math.abs(o.valor_centavos), pago_em: o.pago_em || null, vendedor: o.vendedor || '', rota: o.rota || '' }) },
    pagar: { nome: 'Contas a pagar', linha: 'Uma parcela a pagar a produtor ou fornecedor', campos: [
      T('id', 'Número do título', 'texto', ['titulo', 'numero', 'id']), T('fornecedor', 'Fornecedor', 'texto', ['fornecedor', 'produtor', 'favorecido', 'credor'], 1),
      T('categoria', 'Categoria', 'texto', ['categoria', 'plano de contas', 'tipo']), T('documento', 'Documento', 'texto', ['documento', 'nota', 'nf']),
      T('emissao', 'Emissão', 'data', ['emissao', 'data emissao']), T('vencimento', 'Vencimento', 'data', ['vencimento', 'data vencimento', 'venc'], 1),
      T('valor_centavos', 'Valor', 'dinheiro', ['valor', 'valor do titulo'], 1), T('abatimento_centavos', 'Abatimento', 'dinheiro', ['abatimento', 'desconto']),
      T('motivo_abatimento', 'Motivo do abatimento', 'texto', ['motivo', 'motivo do abatimento']), T('pago_em', 'Pago em', 'data', ['pago em', 'data pagamento', 'pagamento', 'baixa'])],
      completar: (o, i) => ({ id: o.id || `P${i + 1}`, fornecedor: o.fornecedor, categoria: o.categoria || 'Outros', documento: o.documento || '', emissao: o.emissao || o.vencimento, vencimento: o.vencimento, valor_centavos: Math.abs(o.valor_centavos), abatimento_centavos: Math.abs(o.abatimento_centavos || 0), motivo_abatimento: o.motivo_abatimento || '', pago_em: o.pago_em || null }) },
    lancamentos: { nome: 'Lançamentos', linha: 'Uma entrada ou saída de dinheiro já realizada', campos: [
      T('id', 'Código', 'texto', ['id', 'codigo']), T('data', 'Data', 'data', ['data', 'data lancamento', 'data movimento'], 1),
      T('tipo', 'Entrada ou saída', 'mov', ['tipo', 'entrada saida', 'natureza', 'e s']), T('categoria', 'Categoria', 'texto', ['categoria', 'plano de contas']),
      T('descricao', 'Descrição', 'texto', ['descricao', 'historico']), T('contraparte', 'Cliente ou fornecedor', 'texto', ['cliente', 'fornecedor', 'favorecido', 'contraparte']),
      T('conta', 'Conta', 'texto', ['conta', 'banco']), T('forma', 'Forma', 'texto', ['forma', 'forma de pagamento']),
      T('valor_centavos', 'Valor (saída negativa, se não houver a coluna de tipo)', 'dinheiro', ['valor'], 1), T('vendedor', 'Vendedor', 'texto', ['vendedor']), T('rota', 'Rota', 'texto', ['rota'])],
      completar: (o, i) => ({ id: o.id || `L${i + 1}`, data: o.data, tipo: o.tipo || (o.valor_centavos < 0 ? 'saida' : 'entrada'), categoria: o.categoria || 'Sem categoria', descricao: o.descricao || '', contraparte: o.contraparte || '', conta: o.conta || 'Sem conta', forma: o.forma || '', valor_centavos: Math.abs(o.valor_centavos), vendedor: o.vendedor || '', rota: o.rota || '', origem: '' }) },
    fechamentos: { nome: 'Fechamentos de caixa', linha: 'Um fechamento de gaveta por dia', campos: [
      T('data', 'Data', 'data', ['data', 'dia'], 1), T('responsavel', 'Responsável', 'texto', ['responsavel', 'operador', 'caixa']),
      T('abertura_centavos', 'Abertura (troco)', 'dinheiro', ['abertura', 'troco']), T('suprimentos_centavos', 'Suprimentos', 'dinheiro', ['suprimento', 'suprimentos']),
      T('sangrias_centavos', 'Sangrias', 'dinheiro', ['sangria', 'sangrias']), T('dinheiro_balcao_centavos', 'Dinheiro no balcão', 'dinheiro', ['dinheiro', 'dinheiro balcao']),
      T('acerto_motoristas_centavos', 'Acerto de motoristas', 'dinheiro', ['acerto', 'motoristas', 'acerto motoristas']), T('pix_centavos', 'Pix', 'dinheiro', ['pix']),
      T('debito_centavos', 'Débito', 'dinheiro', ['debito', 'cartao debito']), T('credito_centavos', 'Crédito', 'dinheiro', ['credito', 'cartao credito']),
      T('boleto_centavos', 'Boleto', 'dinheiro', ['boleto']), T('cheque_centavos', 'Cheque', 'dinheiro', ['cheque']),
      T('contado_centavos', 'Contado na gaveta', 'dinheiro', ['contado', 'valor contado', 'conferido'], 1)],
      completar: (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, k.endsWith('_centavos') ? Math.abs(v || 0) : k === 'responsavel' ? v || '' : v])) },
  };
  const EXTRATO_DEF = { nome: 'Extrato', campos: [
    T('data', 'Data', 'data', ['data', 'data lancamento', 'data movimento', 'dt'], 1), T('descricao', 'Descrição', 'texto', ['descricao', 'historico', 'lancamento', 'memo', 'detalhe']),
    T('valor', 'Valor (com sinal)', 'dinheiro', ['valor', 'valor r', 'montante']), T('credito', 'Crédito (entrada)', 'dinheiro', ['credito', 'entrada', 'entradas']), T('debito', 'Débito (saída)', 'dinheiro', ['debito', 'saida', 'saidas'])],
    validar: (mapa) => (mapa.valor || mapa.credito || mapa.debito ? [] : ['Valor, ou Crédito e Débito']),
    completar: (o, i) => ({ id: 'X' + (i + 1), data: o.data, descricao: o.descricao || '', centavos: o.valor != null ? o.valor : Math.abs(o.credito || 0) - Math.abs(o.debito || 0) }) };

  function autoMapa(def, colunas) {
    const mapa = {}, usadas = new Set();
    const nc = colunas.map((c) => [c, norm(c)]);
    for (const campo of def.campos) {
      const sins = campo.s.map(norm);
      let achou = nc.find(([c, n]) => !usadas.has(c) && sins.includes(n));
      if (!achou) achou = nc.find(([c, n]) => !usadas.has(c) && sins.some((s) => s.length > 2 && n.includes(s)));
      if (achou) { mapa[campo.k] = achou[0]; usadas.add(achou[0]); }
    }
    return mapa;
  }
  function converter(def, registros, mapa, emCentavos) {
    const probs = {}, linhas = [], lidos = []; let fora = 0;
    def.campos.forEach((c) => { probs[c.k] = 0; });
    registros.forEach((reg) => {
      const o = {}; let ok = true;
      for (const c of def.campos) {
        const col = mapa[c.k];
        const bruto = col ? reg[col] : '';
        const vazio = bruto == null || String(bruto).trim() === '';
        let v;
        if (c.t === 'texto') v = vazio ? '' : String(bruto).trim();
        else if (c.t === 'data') { v = vazio ? null : lerData(bruto); if (!vazio && v == null) probs[c.k] += 1; }
        else if (c.t === 'dinheiro') { const n = vazio ? null : lerValor(bruto); if (!vazio && n == null) probs[c.k] += 1; v = n == null ? null : Math.round(emCentavos ? n : n * 100); }
        else if (c.t === 'mov') { const t = semAcento(bruto).toLowerCase().trim(); v = /^(s|d)$|said|debito|despesa/.test(t) ? 'saida' : /^(e|c)$|entrada|credito|receita|recebimento/.test(t) ? 'entrada' : ''; if (!vazio && !v) probs[c.k] += 1; }
        if (c.req && (v == null || v === '')) ok = false;
        o[c.k] = v;
      }
      if (!ok) { fora += 1; return; }
      lidos.push(o);
      linhas.push(def.completar(o, linhas.length));
    });
    return { linhas, lidos, probs, fora };
  }
  const exemploDe = (c, v) => (v == null || v === '' ? '—' : c.t === 'dinheiro' ? brl(v / 100) : c.t === 'data' ? dBR(v) : c.t === 'mov' ? (v === 'saida' ? 'Saída' : 'Entrada') : String(v));

  // Caixa de conferência: cada campo do painel ao lado da coluna do arquivo, com exemplo e problemas
  function painelMapeamento(alvo, { def, arquivo, abas, aoAplicar, aoCancelar }) {
    let aba = Math.max(0, abas.findIndex((a) => a.linhas.length > 1));
    let tabela = montarTabela(abas[aba].linhas);
    let mapa = autoMapa(def, tabela.colunas);
    let emCentavos = false;
    const temDinheiro = def.campos.some((c) => c.t === 'dinheiro');
    const pid = 'map-' + Math.random().toString(36).slice(2, 7);
    const montar = (focar) => {
      const resumo = h('div', { class: 'map-summary', tabindex: '-1', id: pid + '-resumo' });
      const usar = h('button', { type: 'button', class: 'btn btn-primary' }, 'Usar estes dados');
      const cancelar = h('button', { type: 'button', class: 'btn btn-ghost', onclick: () => aoCancelar() }, 'Cancelar');
      const exs = {}, prs = {};
      const linhasTabela = def.campos.map((c) => {
        const sel = h('select', { class: 'select', id: `${pid}-${c.k}`, 'aria-label': `Coluna do arquivo para ${c.l}` },
          h('option', { value: '', text: 'Não usar' }), ...tabela.colunas.map((col) => h('option', { value: col, text: col })));
        sel.value = mapa[c.k] || '';
        sel.addEventListener('change', () => { if (sel.value) mapa[c.k] = sel.value; else delete mapa[c.k]; atualizar(); });
        exs[c.k] = h('td', { class: 'ex hide-sm' });
        prs[c.k] = h('td', { class: 'prob' });
        return h('tr', {}, h('td', {}, h('label', { for: `${pid}-${c.k}`, text: c.l }), c.req ? h('span', { class: 'req', text: ' obrigatório' }) : null), h('td', {}, sel), exs[c.k], prs[c.k]);
      });
      let conv = null;
      const atualizar = () => {
        conv = converter(def, tabela.registros, mapa, emCentavos);
        const faltam = def.campos.filter((c) => c.req && !mapa[c.k]).map((c) => c.l).concat(def.validar ? def.validar(mapa) : []);
        for (const c of def.campos) {
          const amostra = conv.lidos.find((l) => l[c.k] != null && l[c.k] !== '');
          exs[c.k].textContent = mapa[c.k] ? exemploDe(c, amostra ? amostra[c.k] : null) : '';
          prs[c.k].textContent = conv.probs[c.k] ? `${int(conv.probs[c.k])} ${conv.probs[c.k] === 1 ? 'linha não foi lida' : 'linhas não foram lidas'}` : '';
        }
        resumo.className = 'map-summary ' + (faltam.length || !conv.linhas.length ? 'erro' : 'ok');
        resumo.setAttribute('role', faltam.length ? 'alert' : 'status');
        if (faltam.length) resumo.replaceChildren(h('strong', { text: 'Falta escolher a coluna de:' }), h('span', {}, ...faltam.flatMap((f, i) => [i ? ', ' : '', f])));
        else if (!conv.linhas.length) resumo.replaceChildren(h('strong', { text: 'Nenhuma linha tem todos os campos obrigatórios preenchidos.' }), h('span', { text: 'Confira se as colunas escolhidas são as certas.' }));
        else resumo.replaceChildren(...[h('strong', { text: `Pronto para importar ${int(conv.linhas.length)} ${conv.linhas.length === 1 ? 'linha' : 'linhas'}.` }), conv.fora ? h('span', { text: `${int(conv.fora)} ${conv.fora === 1 ? 'linha fica' : 'linhas ficam'} de fora por não ter algum campo obrigatório.` }) : null].filter(Boolean));
        usar.disabled = !!faltam.length || !conv.linhas.length;
      };
      usar.addEventListener('click', () => { if (!usar.disabled) aoAplicar(conv.linhas); });
      const opcoes = h('div', { class: 'filters' },
        abas.length > 1 ? h('label', { class: 'field' }, h('span', { text: 'Aba da planilha' }), (() => { const s = h('select', { class: 'select', id: pid + '-aba' }, ...abas.map((a, i) => h('option', { value: String(i), text: a.nome }))); s.value = String(aba); s.addEventListener('change', () => { aba = +s.value; tabela = montarTabela(abas[aba].linhas); mapa = autoMapa(def, tabela.colunas); montar(pid + '-aba'); }); return s; })()) : null,
        temDinheiro ? h('label', { class: 'field' }, h('span', { text: 'Valores do arquivo em' }), (() => { const s = h('select', { class: 'select', id: pid + '-unid' }, h('option', { value: 'reais', text: 'Reais (1.234,56)' }), h('option', { value: 'centavos', text: 'Centavos (123456)' })); s.value = emCentavos ? 'centavos' : 'reais'; s.addEventListener('change', () => { emCentavos = s.value === 'centavos'; atualizar(); }); return s; })()) : null);
      const card = h('article', { class: 'card' },
        h('div', { class: 'card-head' }, h('h2', { text: `Conferir colunas: ${def.nome}` }), h('span', { class: 'meta', text: `${arquivo}, ${int(tabela.registros.length)} linhas lidas` })),
        resumo, opcoes,
        h('div', { class: 'tbl-wrap short' }, h('table', { 'aria-label': 'Colunas do arquivo' }, h('thead', {}, h('tr', {}, h('th', { text: 'Campo do painel' }), h('th', { text: 'Coluna do arquivo' }), h('th', { class: 'hide-sm', text: 'Exemplo lido' }), h('th', { text: 'Problemas' }))), h('tbody', {}, ...linhasTabela))),
        h('div', { class: 'actions' }, usar, cancelar));
      alvo.replaceChildren(card);
      atualizar();
      if (focar) document.getElementById(focar)?.focus(); else resumo.focus();
    };
    montar();
  }

  // ------- IMPORTAR DADOS -------
  let fonteImport = null;
  const descreverCampos = (def) => {
    const req = def.campos.filter((c) => c.req).map((c) => c.l.toLowerCase());
    const opt = def.campos.filter((c) => !c.req).map((c) => c.l.toLowerCase());
    return `Obrigatórias: ${req.join(', ')}.` + (opt.length ? ` Opcionais: ${opt.join(', ')}.` : '');
  };
  function renderDados() {
    const imp = Object.keys(IMPORT_META).length;
    $('#d-finding').textContent = imp
      ? `${int(imp)} de ${int(FONTES.length)} fontes usam dados importados. As outras continuam com os dados de exemplo.`
      : 'Hoje o painel inteiro usa dados de exemplo. Importe as planilhas reais uma fonte por vez; o que não for importado continua como exemplo.';
    $('#d-fontes').replaceChildren(...FONTES.map((n) => {
      const def = FONTES_DEF[n], m = IMPORT_META[n];
      return h('tr', {},
        h('td', { class: 'id' }, h('b', { text: def.nome })),
        h('td', { class: 'hide-sm', style: 'white-space:normal;min-width:260px' }, def.linha, h('span', { class: 'sub', text: descreverCampos(def) })),
        h('td', {}, h('span', { class: 'pill ' + (m ? 'pill-pos' : 'pill-neutral'), text: m ? 'Importado' : 'Exemplo' }), m ? h('span', { class: 'sub', text: `${m.arquivo}, em ${dBR(m.em)}` }) : null),
        h('td', { class: 'num', text: int(DATA[n].length) }),
        h('td', { class: 'num' },
          h('button', { type: 'button', class: 'btn btn-ghost', onclick: () => { fonteImport = n; $('#d-file').value = ''; $('#d-file').click(); } }, 'Importar'),
          m ? h('button', { type: 'button', class: 'btn btn-text', onclick: () => voltarExemplo(n) }, 'Voltar ao exemplo') : null));
    }));
  }
  function guardar(n) {
    try { localStorage.setItem('mn-fonte-' + n, JSON.stringify({ meta: IMPORT_META[n], rows: DATA[n] })); return true; } catch (e) { return false; }
  }
  function aplicarImportacao(n, linhas, arquivo) {
    CaixaUI.dialog('Aplicar a fonte conferida?', h('p', { text: `${FONTES_DEF[n].nome}: ${int(linhas.length)} registros de ${arquivo} substituirão a fonte atual neste navegador. Confira se o arquivo contém a fonte completa, pois a importação não acrescenta registros à base anterior.` }), { label: 'Aplicar importação', confirm: () => confirmarImportacao(n, linhas, arquivo) });
  }
  function confirmarImportacao(n, linhas, arquivo) {
    DATA[n] = linhas;
    IMPORT_META[n] = { arquivo, em: hojeReal(), linhas: linhas.length };
    const salvo = guardar(n);
    if (salvo && avisosFontes.includes(n)) avisosFontes.splice(avisosFontes.indexOf(n), 1);
    recarregar();
    $('#d-map').replaceChildren(h('p', { class: 'map-summary ok', role: 'status' },
      h('strong', { text: `${FONTES_DEF[n].nome}: ${int(linhas.length)} linhas importadas de ${arquivo}.` }),
      h('span', { text: salvo ? 'O painel já está usando estes dados e eles ficam guardados neste navegador.' : 'O painel já está usando estes dados, mas o navegador não tem espaço para guardá-los: ao fechar a página, volta o exemplo.' })));
  }
  function voltarExemplo(n) {
    CaixaUI.dialog('Substituir os dados importados?', h('p', { text: `A fonte ${FONTES_DEF[n].nome} voltará aos exemplos. Os registros importados serão removidos deste navegador. Guarde seu arquivo original para importar novamente.` }), { label: 'Voltar ao exemplo', confirm: () => confirmarVoltarExemplo(n) });
  }
  function confirmarVoltarExemplo(n) {
    DATA[n] = EXEMPLO[n];
    delete IMPORT_META[n];
    let removido = true;
    try { localStorage.removeItem('mn-fonte-' + n); if (avisosFontes.includes(n)) avisosFontes.splice(avisosFontes.indexOf(n), 1); } catch (e) { removido = false; }
    recarregar();
    $('#d-map').replaceChildren(h('p', { class: 'map-summary', role: 'status', text: `${FONTES_DEF[n].nome} voltou a usar os dados de exemplo.` + (removido ? '' : ' Não foi possível remover a fonte salva: ela poderá ser recuperada ao recarregar a página. Confira as permissões de armazenamento do navegador.') }));
  }
  $('#d-file').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f || !fonteImport) return;
    const n = fonteImport, alvo = $('#d-map');
    alvo.replaceChildren(h('p', { class: 'stamp', role: 'status', text: `Lendo ${f.name}` }));
    try {
      const abas = await lerPlanilha(f);
      if (!abas.some((a) => a.linhas.length > 1)) throw new Error('O arquivo não tem linhas de dados abaixo do cabeçalho.');
      painelMapeamento(alvo, { def: FONTES_DEF[n], arquivo: f.name, abas, aoAplicar: (linhas) => aplicarImportacao(n, linhas, f.name), aoCancelar: () => alvo.replaceChildren() });
    } catch (err) {
      console.error(err);
      alvo.replaceChildren(h('p', { class: 'map-summary erro', role: 'alert', text: `Não consegui ler ${f.name}. ${err.message || ''}` }));
    }
  });

  // ------- CONCILIAÇÃO BANCÁRIA -------
  const ccState = { extrato: null, origem: '', filtro: 'extrato' };
  const difDias = (a, b) => Math.round((Date.parse(a) - Date.parse(b)) / 864e5);
  function contasBanco() { return DATA.contas.filter((c) => !/caixa/i.test(c.tipo || '')).map((c) => c.conta); }
  function renderConc() {
    const sel = $('#cc-conta');
    const atualConta = sel.value;
    const nomes = contasBanco();
    sel.replaceChildren(...nomes.map((n) => h('option', { value: n, text: n })));
    sel.value = nomes.includes(atualConta) ? atualConta : nomes.includes('Sicredi') ? 'Sicredi' : nomes[0] || '';
    desenharConc();
  }
  function conciliar(extrato, conta) {
    const datas = extrato.map((x) => x.data).sort();
    const ini = datas[0], fim = datas[datas.length - 1];
    const sist = get('lancamentos').filter((l) => l.conta === conta && l.data >= addDias(ini, -3) && l.data <= addDias(fim, 3))
      .map((l) => ({ id: l.id, data: l.data, descricao: l.descricao, contraparte: l.contraparte, centavos: Number(l.valor_centavos) * (l.tipo === 'saida' ? -1 : 1) }));
    const pool = new Map();
    sist.forEach((l) => { if (!pool.has(l.centavos)) pool.set(l.centavos, []); pool.get(l.centavos).push(l); });
    const usados = new Set(), linhas = [];
    extrato.slice().sort((a, b) => a.data.localeCompare(b.data)).forEach((x) => {
      const m = (pool.get(x.centavos) || []).filter((l) => !usados.has(l.id) && Math.abs(difDias(l.data, x.data)) <= 3)
        .sort((a, b) => Math.abs(difDias(a.data, x.data)) - Math.abs(difDias(b.data, x.data)))[0];
      if (m) { usados.add(m.id); linhas.push({ sit: 'batido', data: x.data, extrato: x.descricao, sistema: `${m.descricao}${m.contraparte ? ', ' + m.contraparte : ''} (${dCurta(m.data)})`, centavos: x.centavos }); }
      else linhas.push({ sit: 'extrato', data: x.data, extrato: x.descricao, sistema: '', centavos: x.centavos });
    });
    sist.filter((l) => !usados.has(l.id) && l.data >= ini && l.data <= fim).forEach((l) => linhas.push({ sit: 'sistema', data: l.data, extrato: '', sistema: `${l.descricao}${l.contraparte ? ', ' + l.contraparte : ''}`, centavos: l.centavos }));
    return { linhas: linhas.sort((a, b) => b.data.localeCompare(a.data)), ini, fim, conta, total: extrato.length };
  }
  function extratoExemplo(conta) {
    let semente = 7;
    const rnd = () => (semente = (semente * 16807) % 2147483647) / 2147483647;
    const ini = addDias(HOJE, -30);
    const out = [];
    get('lancamentos').filter((l) => l.conta === conta && l.data >= ini && l.data <= HOJE).forEach((l, i) => {
      const r = rnd();
      if (r < 0.03) return; // lançado no sistema, mas não passou no banco
      const pula = (l.forma === 'Cheque' || l.forma === 'Boleto') && rnd() < 0.5 ? 1 : 0;
      let c = Number(l.valor_centavos) * (l.tipo === 'saida' ? -1 : 1);
      if (r > 0.993) c += c > 0 ? -150 : 150; // valor diferente no banco
      const pref = l.tipo === 'saida' ? (l.forma === 'Boleto' ? 'PAGTO BOLETO' : l.forma === 'Pix' ? 'PIX ENVIADO' : 'DEBITO') : l.forma === 'Pix' ? 'PIX RECEBIDO' : l.forma === 'Boleto' ? 'LIQ COBRANCA' : l.forma === 'Cheque' ? 'DEP CHEQUE' : 'CREDITO';
      const d = addDias(l.data, pula) > HOJE ? l.data : addDias(l.data, pula);
      out.push({ id: 'X' + i, data: d, descricao: (pref + ' ' + semAcento(l.contraparte || l.descricao)).toUpperCase().slice(0, 42), centavos: c });
    });
    [[-25, 'TARIFA PACOTE DE SERVICOS', -8990], [-12, 'PIX RECEBIDO MERCADO NOVA ERA', 48730], [-6, 'IOF', -312], [-2, 'DEBITO CESTA RELACIONAMENTO', -3450]]
      .forEach(([d, t, c], i) => out.push({ id: 'Y' + i, data: addDias(HOJE, d), descricao: t, centavos: c }));
    return out;
  }
  function usarExtrato(extrato, origem) {
    const linhas = extrato.filter((x) => x.data && x.centavos !== 0);
    if (!linhas.length) { $('#cc-status').textContent = 'O extrato não tem lançamentos com data e valor.'; return; }
    ccState.extrato = linhas; ccState.origem = origem;
    $('#cc-map').replaceChildren();
    const r = conciliar(linhas, $('#cc-conta').value);
    ccState.filtro = r.linhas.some((l) => l.sit === 'extrato') ? 'extrato' : 'todas';
    desenharConc();
    $('#cc-status').textContent = `Extrato: ${origem}`;
  }
  function desenharConc() {
    const box = $('#cc-result');
    if (!ccState.extrato) { box.hidden = true; return; }
    const r = conciliar(ccState.extrato, $('#cc-conta').value);
    const soma = (sit) => r.linhas.filter((l) => l.sit === sit).reduce((s, l) => s + l.centavos, 0) / 100;
    const n = (sit) => r.linhas.filter((l) => l.sit === sit).length;
    box.hidden = false;
    $('#cc-finding').replaceChildren(`No extrato de ${r.conta}, de ${dBR(r.ini)} a ${dBR(r.fim)}, `, h('span', { class: 'band', text: `${int(n('batido'))} de ${int(r.total)} linhas bateram` }),
      `. Ficaram ${int(n('extrato'))} só no extrato e ${int(n('sistema'))} só no sistema.`);
    const cel = (label, valor, sub, cls) => kpi(label, valor, sub, { cls });
    $('#cc-strip').replaceChildren(
      cel('Linhas no extrato', int(r.total), `De ${dBR(r.ini)} a ${dBR(r.fim)}`),
      cel('Batidas', int(n('batido')), r.total ? `${pct(n('batido') / r.total)} do extrato` : '—'),
      cel('Só no extrato', brlS(soma('extrato')), `${int(n('extrato'))} linhas que o sistema não tem`, sinal(soma('extrato'))),
      cel('Só no sistema', brlS(soma('sistema')), `${int(n('sistema'))} lançamentos que o banco não mostra`, sinal(soma('sistema'))));
    $$('#cc-result .seg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cc === ccState.filtro)));
    const nomesSit = { batido: ['Batido', 'pill-pos'], extrato: ['Só no extrato', 'pill-warn'], sistema: ['Só no sistema', 'pill-warn'] };
    const rows = r.linhas.filter((l) => ccState.filtro === 'todas' || l.sit === ccState.filtro);
    $('#cc-body').replaceChildren(...rows.map((l) => h('tr', {},
      h('td', { text: dBR(l.data) }),
      h('td', { class: 'id' + (l.extrato ? '' : ' dash'), text: l.extrato || '—' }),
      h('td', { class: 'id hide-sm' + (l.sistema ? '' : ' dash'), text: l.sistema || '—' }),
      h('td', {}, h('span', { class: 'pill ' + nomesSit[l.sit][1], text: nomesSit[l.sit][0] })),
      h('td', { class: 'num ' + sinal(l.centavos), text: brlS(l.centavos / 100) }))));
    $('#cc-empty').hidden = rows.length > 0;
  }
  $('#cc-conta').addEventListener('change', () => { if (ccState.origem === 'exemplo') usarExtrato(extratoExemplo($('#cc-conta').value), 'exemplo'); else desenharConc(); });
  $('#cc-exemplo').addEventListener('click', () => usarExtrato(extratoExemplo($('#cc-conta').value), 'exemplo'));
  $('#cc-importar').addEventListener('click', () => { $('#cc-file').value = ''; $('#cc-file').click(); });
  $$('#cc-result .seg button').forEach((b) => b.addEventListener('click', () => { ccState.filtro = b.dataset.cc; desenharConc(); }));
  $('#cc-file').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const alvo = $('#cc-map');
    $('#cc-status').textContent = `Lendo ${f.name}`;
    try {
      if (/\.ofx$/i.test(f.name)) { usarExtrato(lerOFX(decodificar(await f.arrayBuffer())), f.name); return; }
      const abas = await lerPlanilha(f);
      if (!abas.some((a) => a.linhas.length > 1)) throw new Error('O arquivo não tem linhas de dados abaixo do cabeçalho.');
      $('#cc-status').textContent = '';
      painelMapeamento(alvo, { def: EXTRATO_DEF, arquivo: f.name, abas, aoAplicar: (linhas) => usarExtrato(linhas, f.name), aoCancelar: () => alvo.replaceChildren() });
    } catch (err) {
      console.error(err);
      $('#cc-status').textContent = '';
      alvo.replaceChildren(h('p', { class: 'map-summary erro', role: 'alert', text: `Não consegui ler ${f.name}. ${err.message || ''}` }));
    }
  });

  // Recalcula tudo depois de importar ou voltar ao exemplo
  function recarregar() {
    for (const k of Object.keys(cache)) delete cache[k];
    HOJE = DATA.contas[0] ? DATA.contas[0].data_saldo : hojeReal();
    done.clear();
    cDia = null; rState.all = false; rState.cartaoAll = false; pAll = false; lState.n = 50; lState.sel = {};
    $$('#lancamentos select[data-col]').forEach((s) => s.replaceChildren());
    atualizarContagem();
    atualizarOrigem();
    if (!$('#g-resumo').hidden) $('#g-resumo-txt').value = textoResumo();
    atual = null;
    route();
  }
  function atualizarContagem() {
    $$('.nav-count').forEach((e) => e.remove());
    try {
      const n = R(get('resumo'), 'vencidos_qtd');
      if (n > 0) $$('.nav a[data-view="receber"]').forEach((a) => a.append(h('span', { class: 'nav-count', 'aria-label': `${n} títulos vencidos`, text: int(n) })));
    } catch (e) { console.error(e); }
  }

  // ------- ROTAS -------
  const origem = () => { const n = Object.keys(IMPORT_META).length; return n === 0 ? 'Dados de exemplo · valores demonstrativos' : n < FONTES.length ? `Fontes mistas · ${n} importadas e ${FONTES.length - n} de exemplo` : 'Dados importados · armazenamento neste navegador'; };
  function atualizarOrigem() {
    $('#data-origin').textContent = origem() + (avisosFontes.length ? ' · Não foi possível recuperar fontes salvas: ' + avisosFontes.join(', ') + '. Confira a importação.' : '');
    $('#workspace-date').textContent = 'Posição financeira · ' + dBR(HOJE);
  }
  const workspace = criarWorkspace({ get, posicao: () => HOJE, origem, abrirMovimentos: conta => {
    Object.assign(lState, { q: '', tipo: '', de: '', ate: '', sel: { conta }, n: 50 });
    $('#l-q').value = ''; $('#l-tipo').value = ''; $('#l-de').value = ''; $('#l-ate').value = '';
    $$('#lancamentos select[data-col]').forEach(s => { s.value = ''; });
    if (!done.has('lancamentos')) { renderLanc(); done.add('lancamentos'); }
    $('#lancamentos select[data-col="conta"]').value = conta;
    drawLanc(); location.hash = '#lancamentos';
  } });
  const VIEWS = { geral: renderGeral, fluxo: renderFluxo, receber: renderReceber, pagar: renderPagar, fechamento: renderFechamento, lancamentos: renderLanc, indicadores: renderInd, conciliacao: renderConc, dados: renderDados, ...workspace.views };
  const NOMES = { geral: 'Visão geral', fluxo: 'Fluxo de caixa', receber: 'A receber', pagar: 'A pagar', fechamento: 'Fechamento', lancamentos: 'Lançamentos', indicadores: 'Indicadores', conciliacao: 'Conciliação', dados: 'Importar dados', contas: 'Contas financeiras', pessoas: 'Clientes e fornecedores', categorias: 'Categorias', relatorios: 'Relatórios', configuracoes: 'Configurações' };
  const done = new Set();
  let atual = null;
  function route() {
    const [v, arg] = location.hash.slice(1).split('/');
    const view = VIEWS[v] ? v : 'geral';
    if (view === 'receber' && arg) { rState.only = arg === 'vencidos'; rState.limite = arg === 'limite'; rState.sort = arg === 'limite' ? 'uso_limite' : 'vencido'; rState.dir = -1; if (done.has('receber')) { $('#r-only').checked = rState.only; drawClientes(); } }
    $$('main > .view').forEach((s) => { s.hidden = s.id !== view; });
    $$('a[data-view]').forEach((a) => { if (a.dataset.view === view) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    $('#where').textContent = NOMES[view];
    document.title = `${NOMES[view]} · Caixa Novo · Mundo Novo`;
    if (!done.has(view)) { safe($('#' + view), VIEWS[view]); done.add(view); }
    fecharMenu();
    if (atual && atual !== view) { $('#main').focus({ preventScroll: true }); window.scrollTo(0, 0); }
    if (view === 'receber' && arg) requestAnimationFrame(() => $('#r-clientes').scrollIntoView({ block: 'start' }));
    atual = view;
  }
  window.addEventListener('hashchange', route);

  // ------- CONTROLES -------
  $$('.ktab').forEach((t) => t.addEventListener('click', () => { chartTab = t.id.slice(3); drawGeralChart(); }));
  $('.ktabs').addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { chartTab = chartTab === 'saldo' ? 'fluxo' : 'saldo'; drawGeralChart(); $('#kt-' + chartTab).focus(); } });
  $$('#fluxo .seg button').forEach((b) => b.addEventListener('click', () => { grao = b.dataset.grao; renderFluxo(); }));
  let tq;
  $('#r-q').addEventListener('input', (e) => { clearTimeout(tq); tq = setTimeout(() => { rState.q = e.target.value; drawClientes(); }, 150); });
  $('#r-nota').addEventListener('change', (e) => { rState.nota = e.target.value; renderNotasSel(); drawClientes(); });
  $('#r-only').addEventListener('change', (e) => { rState.only = e.target.checked; rState.limite = false; drawClientes(); });
  $$('#r-clientes .sort').forEach((b) => b.addEventListener('click', () => { const k = b.dataset.sort; rState.dir = rState.sort === k ? -rState.dir : -1; rState.sort = k; drawClientes(); }));
  $('#r-cli-more').addEventListener('click', () => { rState.all = true; drawClientes(); });
  $('#r-cartao-more').addEventListener('click', () => { rState.cartaoAll = true; drawCartao(); });
  $('#p-more').addEventListener('click', () => { pAll = true; drawPagarAbertos(); });
  $('#c-dia').addEventListener('change', (e) => { cDia = e.target.value; renderFechamento(); });
  let tl;
  $('#l-q').addEventListener('input', (e) => { clearTimeout(tl); tl = setTimeout(() => { lState.q = e.target.value; lState.n = 50; drawLanc(); }, 150); });
  $('#l-tipo').addEventListener('change', (e) => { lState.tipo = e.target.value; lState.n = 50; drawLanc(); });
  $$('#lancamentos select[data-col]').forEach((s) => s.addEventListener('change', () => { lState.sel[s.dataset.col] = s.value; lState.n = 50; drawLanc(); }));
  for (const [id, k] of [['#l-de', 'de'], ['#l-ate', 'ate']]) $(id).addEventListener('change', (e) => { e.target.setCustomValidity(''); const v = e.target.value; if (!v || e.target.validity.valid) { lState[k] = v; lState.n = 50; drawLanc(); } });
  $('#l-clear').addEventListener('click', () => {
    Object.assign(lState, { q: '', tipo: '', de: '', ate: '', sel: {}, n: 50 });
    $('#l-q').value = ''; $('#l-tipo').value = ''; $('#l-de').value = ''; $('#l-ate').value = '';
    $$('#lancamentos select[data-col]').forEach((s) => { s.value = ''; });
    drawLanc();
  });
  $('#l-more').addEventListener('click', () => { lState.n += 50; drawLanc(); });
  $$('#lancamentos .sort').forEach((b) => b.addEventListener('click', () => { const k = b.dataset.sort; lState.dir = lState.sort === k ? -lState.dir : -1; lState.sort = k; drawLanc(); }));

  // Menu do celular
  const sheet = $('#sheet');
  function fecharMenu() { sheet.classList.remove('open'); sheet.setAttribute('inert', ''); $('#main').removeAttribute('inert'); $('.topbar').removeAttribute('inert'); document.body.style.overflow = ''; $('#menu-open').setAttribute('aria-expanded', 'false'); }
  $('#menu-open').addEventListener('click', () => { sheet.removeAttribute('inert'); sheet.classList.add('open'); $('#main').setAttribute('inert', ''); $('.topbar').setAttribute('inert', ''); document.body.style.overflow = 'hidden'; $('#menu-open').setAttribute('aria-expanded', 'true'); $('#menu-close').focus(); });
  $('#menu-close').addEventListener('click', () => { fecharMenu(); $('#menu-open').focus(); });
  matchMedia('(min-width: 901px)').addEventListener('change', event => { if (event.matches) fecharMenu(); });
  document.addEventListener('keydown', (e) => {
    if (!sheet.classList.contains('open')) return;
    if (e.key === 'Escape') { fecharMenu(); $('#menu-open').focus(); }
    if (e.key === 'Tab') {
      const nodes = $$('a[href],button', sheet), first = nodes[0], last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // Tema
  const aplicarTema = (t) => {
    if (t === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t);
    $$('[data-theme-set]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.themeSet === t)));
    try { localStorage.setItem('mn-tema', t); } catch (e) { /* sem armazenamento: segue o sistema */ }
    for (const v of done) safe($('#' + v), VIEWS[v]);
  };
  $$('[data-theme-set]').forEach((b) => b.addEventListener('click', () => aplicarTema(b.dataset.themeSet)));
  let tema = 'auto';
  try { tema = localStorage.getItem('mn-tema') || 'auto'; } catch (e) { tema = 'auto'; }
  if (tema !== 'auto') { document.documentElement.setAttribute('data-theme', tema); $$('[data-theme-set]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.themeSet === tema))); }
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (!document.documentElement.hasAttribute('data-theme')) for (const v of done) safe($('#' + v), VIEWS[v]); });

  // Contagem de vencidos no menu (fila que pede ação)
  atualizarContagem();
  atualizarOrigem();
  $('#main').setAttribute('aria-busy', 'false');
  $('#app-loading').hidden = true;
  route();
})();
