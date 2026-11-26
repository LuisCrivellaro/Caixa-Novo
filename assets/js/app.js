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

  // ------- FONTES MISTAS -------
  // Um indicador é marcado quando depende, direta ou indiretamente, de fontes importadas e de exemplo ao mesmo tempo.
  const fontesDe = (id, vistos = new Set()) => {
    if (FONTES.includes(id)) return [id];
    if (vistos.has(id) || !CALCS[id]) return [];
    vistos.add(id);
    return [...new Set(CALCS[id].inputs.flatMap((i) => fontesDe(i, vistos)))];
  };
  const misto = (ids) => { const f = [...new Set(ids.flatMap((id) => fontesDe(id)))]; const imp = f.filter((n) => IMPORT_META[n]).length; return imp > 0 && imp < f.length; };
  const kpiM = (label, value, sub, opts = {}) => {
    const node = kpi(label, value, sub, opts);
    if (opts.calc && misto(opts.calc)) node.append(h('span', { class: 'pill pill-warn kpi-flag', title: 'Combina fontes importadas com dados de exemplo.', text: 'Fontes mistas' }));
    return node;
  };
  const ou = (v, f) => (v == null || !isFinite(v) ? '—' : f(v));
  const TR = (tipo) => get('titulos_resumo').find((t) => t.tipo === tipo);
  const tingir = (el) => { el.style.setProperty('--chart-1', cv('--positive')); el.style.setProperty('--chart-muted', cv('--negative')); };

  // ------- VISÃO GERAL -------
  let alertasTodos = false;
  function renderGeral() {
    const res = get('resumo'), p30 = get('projecao_marcos').find((m) => m.marco === '30');
    $('#g-strip').replaceChildren(
      kpiM('Saldo disponível', brl(R(res, 'saldo_disponivel')), `${int(get('saldo_contas').length)} contas`, { cls: sinal(R(res, 'saldo_disponivel')), calc: ['resumo'] }),
      kpiM('Total a receber', brlS(R(res, 'receber_aberto')), 'Títulos em aberto', { cls: sinal(R(res, 'receber_aberto')), calc: ['resumo'] }),
      kpiM('Total a pagar', brlS(-R(res, 'pagar_aberto')), 'Títulos em aberto', { cls: sinal(-R(res, 'pagar_aberto')), calc: ['resumo'] }),
      kpiM('Saldo projetado em 30 dias', brl(p30.saldo), 'Só com títulos já lançados', { cls: sinal(p30.saldo), calc: ['projecao_marcos'] }));
    drawGeralChart();
    drawAlertas();
  }
  function drawGeralChart() {
    const el = $('#g-chart');
    tingir(el);
    safe(el, () => {
      const proj = get('projecao'), minimo = R(get('resumo'), 'saldo_minimo');
      const maxDia = proj.reduce((a, r, i) => (r.saidas > proj[a].saidas ? i : a), 1);
      $('#g-chart-meta').textContent = `Próximos 90 dias · mínimo de ${brlC(minimo)}`;
      Charts.line(el, {
        labels: proj.map((r) => dCurta(r.dia)),
        series: [{ name: 'Saldo projetado', values: proj.map((r) => r.saldo), colour: cv('--positive') }],
        format: brl, tickFormat: fmtC, height: 240, today: 0, todayLabel: 'Hoje', endLabel: true, negColour: cv('--negative'),
        reference: { value: minimo, label: 'Mínimo ' + brlC(minimo) },
        annotations: proj[maxDia].saidas > 0 ? [{ at: maxDia, label: `Maior saída: ${brlC(proj[maxDia].saidas)} em ${dCurta(proj[maxDia].dia)}`, short: dCurta(proj[maxDia].dia) }] : [],
      });
    });
  }
  // Ordem de gravidade: falta de caixa, pagamentos vencidos, recebimentos vencidos, pagamentos próximos, gaveta, limite.
  function alertas() {
    const res = get('resumo'), pg = TR('A pagar');
    const out = [];
    const abaixo = get('projecao_marcos').find((m) => m.marco === 'minimo');
    if (abaixo && abaixo.dia) out.push({ nivel: 'neg', texto: [`Saldo projetado abaixo do mínimo de ${brl(R(res, 'saldo_minimo'))} a partir de ${dBR(abaixo.dia)}.`], link: ['#fluxo', 'Ver fluxo'] });
    if (pg.vencido_qtd > 0) out.push({ nivel: 'neg', texto: [`${int(pg.vencido_qtd)} ${pg.vencido_qtd === 1 ? 'pagamento vencido' : 'pagamentos vencidos'}: `, h('strong', { class: 'neg', text: brlS(-pg.vencido_centavos / 100) }), '.'], link: ['#pagar/vencidos', 'Ver pagamentos'] });
    const vq = R(res, 'vencidos_qtd');
    if (vq > 0) out.push({ nivel: 'neg', texto: [`${int(vq)} ${vq === 1 ? 'recebimento vencido' : 'recebimentos vencidos'}: `, h('strong', { class: 'neg', text: brl(R(res, 'vencidos_valor')) }), ` (${pct(R(get('indicadores'), 'inadimplencia', 'indicador'))} da carteira).`], link: ['#receber/vencidos', 'Ver títulos'] });
    const p7 = R(res, 'pagar_7_dias');
    if (p7 > 0) out.push({ nivel: 'warn', texto: ['A pagar nos próximos 7 dias: ', h('strong', { class: 'neg', text: brlS(-p7) }), '.'], link: ['#pagar', 'Ver contas a pagar'] });
    const dif = R(res, 'ultimo_fechamento_diferenca');
    if (dif != null && Math.abs(dif) >= 0.01) out.push({ nivel: 'warn', texto: [`A gaveta de ${dBR(res.find((x) => x.metrica === 'ultimo_fechamento_diferenca').texto)} fechou com `, h('strong', { class: sinal(dif), text: brlS(dif) }), ' de diferença.'], link: ['#tesouraria/fechamento', 'Ver fechamento'] });
    const lim = R(res, 'clientes_acima_limite');
    if (lim > 0) out.push({ nivel: 'warn', texto: [`${int(lim)} ${lim === 1 ? 'cliente acima' : 'clientes acima'} do limite de crédito.`], link: ['#receber/limite', 'Ver clientes'] });
    return out;
  }
  function drawAlertas() {
    const lista = alertas();
    const show = alertasTodos ? lista : lista.slice(0, 3);
    $('#g-alerts').replaceChildren(...(show.length
      ? show.map((a) => h('li', { class: 'alert-' + a.nivel }, icon('warning-circle'), h('span', {}, ...a.texto, ' ', h('a', { href: a.link[0], text: a.link[1] }))))
      : [h('li', { class: 'ok' }, icon('check-circle'), h('span', { text: 'Nenhum alerta agora.' }))]));
    $('#g-alert-count').textContent = lista.length ? `${int(lista.length)} ${lista.length === 1 ? 'ponto de atenção' : 'pontos de atenção'}` : '';
    const more = $('#g-alerts-more');
    more.hidden = lista.length <= 3;
    more.textContent = alertasTodos ? 'Mostrar menos' : `Ver mais ${int(lista.length - 3)}`;
    more.setAttribute('aria-expanded', String(alertasTodos));
  }

  // ------- FLUXO -------
  let grao = 'semana';
  const periodos = {
    dia: { nome: 'Dia', anterior: 'dia anterior', completo: 'o dia anterior completo', por: 'dia' },
    semana: { nome: 'Semana', anterior: 'semana anterior', completo: 'a semana anterior completa', por: 'semana' },
    mes: { nome: 'Mês', anterior: 'mês anterior', completo: 'o mês anterior completo', por: 'mês' },
    ano: { nome: 'Ano', anterior: 'ano anterior', completo: 'o ano anterior completo', por: 'ano' }
  };
  const flowPeriod = window.CaixaFlowPeriod.mount($('#f-period'), { value: grao, onChange: value => {
    if (!periodos[value] || value === grao) return;
    grao = value;
    safe($('#f-chart'), renderFluxo);
  } });
  function renderFluxo() {
    flowPeriod.setValue(grao);
    const periodo = periodos[grao];
    const res = get('fluxo_resumo').find(row => row.grao === grao);
    const intervalo = res.inicio === res.ate ? dBR(res.ate) : `${dBR(res.inicio)} a ${dBR(res.ate)}`;
    $('#fluxo').dataset.periodo = grao;
    $('#f-finding').textContent = `${periodo.nome} atual: ${intervalo}${res.ate < res.fim ? ' (parcial, até a posição)' : ''}. Comparação com ${periodo.completo}.`;
    const vs = (v) => `vs. ${periodo.anterior}: ${pctS(v)}`;
    $('#f-strip').replaceChildren(
      kpiM('Entradas', brlS(res.entradas_centavos / 100), vs(res.variacao_entradas), { cls: sinal(res.entradas_centavos), calc: ['fluxo_resumo'] }),
      kpiM('Saídas', brlS(-res.saidas_centavos / 100), vs(res.variacao_saidas), { cls: sinal(-res.saidas_centavos), calc: ['fluxo_resumo'] }),
      kpiM('Resultado de caixa', brlS(res.resultado_centavos / 100), vs(res.variacao_resultado), { cls: sinal(res.resultado_centavos), calc: ['fluxo_resumo'] }));
    $('#f-cat-current').textContent = `${periodo.nome} atual`;
    $('#f-cat-previous').textContent = `${periodo.nome} anterior`;
    $('#f-cat-period').textContent = `${intervalo} comparado com ${dBR(res.anterior_inicio)} a ${dBR(res.anterior_fim)}`;
    $('#f-chart-title').textContent = `Entradas e saídas por ${periodo.por}`;
    $('#f-chart-note').textContent = `O previsto, mais claro, vem dos títulos em aberto dos próximos 60 dias.`;
    const fl = get('fluxo').filter(row => row.grao === grao && (grao !== 'dia' || (row.periodo >= addDias(HOJE, -45) && row.periodo <= addDias(HOJE, 30))));
    workspace.renderFlowTable(fl, grao);
    const el = $('#f-chart'), lg = $('#f-legend');
    tingir(el);
    lg.replaceChildren();
    safe(el, () => {
      const per = [...new Set(fl.map((r) => r.periodo))].sort();
      if (!per.length) { el.replaceChildren(h('p', { class: 'empty', text: 'Nenhuma movimentação ou previsão neste período.' })); return; }
      const sum = (p, k, nat) => fl.filter((r) => r.periodo === p && (!nat || r.natureza === nat)).reduce((s, r) => s + r[k + '_centavos'], 0) / 100;
      const mark = per.map((p, i) => (sum(p, 'entradas', 'realizado') + sum(p, 'saidas', 'realizado') === 0 ? i : -1)).filter((i) => i >= 0);
      const label = p => grao === 'ano' ? p.slice(0, 4) : grao === 'mes' ? MESES[Number(p.slice(5, 7)) - 1].slice(0, 3) + '/' + p.slice(2, 4) : grao === 'semana' ? dCurta(p) + '/' + p.slice(2, 4) : dCurta(p);
      const partial = per.findIndex(p => p === res.inicio);
      const out = Charts.diverging(el, {
        labels: per.map(label), up: per.map((p) => sum(p, 'entradas')), down: per.map((p) => sum(p, 'saidas')),
        above: 'Entradas', below: 'Saídas', mark, markLabel: 'Previsto', markSide: 'both', markTint: true, partial: partial >= 0 ? partial : null,
        format: brl, tickFormat: fmtC, height: 280,
      });
      if (out && out.legend) lg.append(out.legend);
    });
    const tb = $('#f-cat');
    safe(tb, () => {
      const categorias = get('fluxo_comparacao').filter(row => row.grao === grao);
      if (!categorias.length) { tb.replaceChildren(h('tr', {}, h('td', { colspan: 4, class: 'empty', text: 'Nenhuma movimentação nos períodos comparados.' }))); return; }
      tb.replaceChildren(...categorias.map((c) => {
        const v = c.anterior_centavos ? c.atual_centavos / c.anterior_centavos - 1 : null;
        const sentido = c.tipo === 'entrada' ? 1 : -1;
        return h('tr', {},
          h('td', { class: 'id' }, h('b', { text: c.categoria }), h('span', { class: 'sub', text: c.tipo === 'entrada' ? 'Entrada' : 'Saída' })),
          h('td', { class: 'num ' + sinal(sentido * c.atual_centavos / 100), text: brlS(sentido * c.atual_centavos / 100) }),
          h('td', { class: 'num ' + sinal(sentido * c.anterior_centavos / 100), text: brlS(sentido * c.anterior_centavos / 100) }),
          h('td', { class: 'num hide-sm ' + (v == null ? 'dash' : sinal(v)), text: pctS(v) }));
      }));
    });
  }

  // ------- CONTAS A RECEBER E A PAGAR -------
  function stripTitulos(alvo, tipo) {
    const t = TR(tipo), s = tipo === 'A receber' ? 1 : -1, calc = ['titulos_resumo'];
    $(alvo).replaceChildren(
      kpiM('Em aberto', brlS(s * t.aberto_centavos / 100), `${int(t.abertos_qtd)} ${t.abertos_qtd === 1 ? 'título' : 'títulos'}`, { cls: sinal(s * t.aberto_centavos), calc }),
      kpiM('Vencido', s > 0 ? brl(t.vencido_centavos / 100) : brlS(-t.vencido_centavos / 100), `${int(t.vencido_qtd)} ${t.vencido_qtd === 1 ? 'título' : 'títulos'}`, { cls: t.vencido_centavos ? 'neg' : '', calc }),
      kpiM('A vencer em 7 dias', brlS(s * t.proximos_7_centavos / 100), 'De hoje até 7 dias', { cls: sinal(s * t.proximos_7_centavos), calc }));
  }
  function renderReceber(sub) {
    stripTitulos('#r-strip', 'A receber');
    if (sub === 'clientes') workspace.renderClientes(); else workspace.renderTitulos('A receber');
  }
  function renderPagar(sub) {
    stripTitulos('#p-strip', 'A pagar');
    if (sub === 'fornecedores') workspace.renderFornecedores(); else workspace.renderTitulos('A pagar');
  }

  // ------- TESOURARIA -------
  function renderTesouraria(sub) {
    if (sub === 'movimentacoes') workspace.renderMovimentos();
    else if (sub === 'fechamento') renderFechamento();
    else if (sub === 'conciliacao') renderConc();
    else workspace.renderContas((conta) => { workspace.filtrarConta(conta); irPara('tesouraria/movimentacoes'); });
  }
  function renderFechamento() {
    const dd = get('fechamento_dias');
    $('#c-empty').hidden = dd.length > 0;
    if (!dd.length) { $('#c-finding').textContent = ''; $('#c-lista').replaceChildren(); return; }
    const certos = dd.filter((d) => Math.abs(d.diferenca) < 0.01).length;
    $('#c-finding').textContent = `${int(certos)} de ${int(dd.length)} bateram no centavo`;
    safe($('#c-lista'), () => $('#c-lista').replaceChildren(...dd.slice().reverse().map((d) => h('tr', {},
      h('td', { class: 'id' }, h('button', { type: 'button', class: 'entry-detail', title: 'Ver itens da gaveta', text: dBR(d.data), onclick: () => detalheFechamento(d) }), h('span', { class: 'sub', text: d.responsavel })),
      h('td', { class: 'num ' + sinal(d.esperado), text: brl(d.esperado) }),
      h('td', { class: 'num ' + sinal(d.contado), text: brl(d.contado) }),
      h('td', { class: 'num ' + (Math.abs(d.diferenca) >= 0.01 ? sinal(d.diferenca) : 'dash'), text: Math.abs(d.diferenca) >= 0.01 ? brlS(d.diferenca) : brl(0) })))));
  }
  function detalheFechamento(d) {
    const itens = get('fechamento_itens').filter((i) => i.data === d.data);
    CaixaUI.dialog(`Gaveta de ${dBR(d.data)}`, h('div', { class: 'stack' },
      h('p', { class: 'stamp', text: `Fechado por ${d.responsavel}. Pix, cartão, boleto e cheque não passam pela gaveta.` }),
      h('dl', { class: 'kv' }, ...itens.map((i) => h('div', {}, h('dt', { text: i.item }), h('dd', { class: sinal(i.valor) || null, text: i.item === 'Diferença' || i.item === 'Sangrias para o banco' ? brlS(i.valor) : brl(i.valor) }))))));
  }

  // ------- RESULTADOS -------
  function renderResultados() {
    const ind = get('indicadores'), res = get('resumo');
    const I = (k) => R(ind, k, 'indicador');
    const desp = get('despesas_categoria');
    const totDesp = desp.reduce((s, d) => s + Math.round(d.valor * 100), 0) / 100;
    $('#i-finding').textContent = `Últimos 30 dias até ${dBR(HOJE)}. Faturamento é o que foi vendido, não o que entrou no caixa.`;
    $('#i-strip').replaceChildren(
      kpiM('Faturamento em 30 dias', brl(I('faturamento_30d')), 'Vendas a prazo e à vista', { cls: sinal(I('faturamento_30d')), calc: ['indicadores'] }),
      kpiM('Margem bruta estimada', pct(I('margem_bruta_estimada')), 'Estimativa de 90 dias: usa compras, não o custo das vendas', { calc: ['indicadores'] }),
      kpiM('Despesas operacionais', brlS(-totDesp), 'Saídas em 30 dias, sem compra de frutas', { cls: sinal(-totDesp), calc: ['despesas_categoria'] }),
      kpiM('Inadimplência', pct(I('inadimplencia')), 'Vencido sobre a carteira a receber', { cls: I('inadimplencia') > 0 ? 'neg' : '', calc: ['indicadores'] }));
    const el = $('#i-chart');
    tingir(el);
    $('#i-legend').replaceChildren();
    safe(el, () => {
      const m = get('resultados_mensais');
      if (!m.length) { el.replaceChildren(h('p', { class: 'empty', text: 'Ainda não há lançamentos suficientes para comparar meses.' })); $('#i-chart-note').textContent = ''; return; }
      const nome = (x) => MESES[Number(x.mes.slice(5, 7)) - 1].slice(0, 3) + '/' + x.mes.slice(2, 4);
      const parcial = m.findIndex((x) => x.parcial);
      const out = Charts.diverging(el, { labels: m.map(nome), up: m.map((x) => x.faturamento_centavos / 100), down: m.map((x) => x.despesas_centavos / 100), above: 'Faturamento', below: 'Despesas operacionais', partial: parcial >= 0 ? parcial : null, format: brl, tickFormat: fmtC, height: 240 });
      if (out && out.legend) $('#i-legend').append(out.legend);
      $('#i-chart-note').textContent = (parcial >= 0 ? `${nome(m[parcial])} vai até ${dBR(HOJE)}. ` : '') + 'Só entram meses inteiros cobertos pelos lançamentos.';
    });
    safe($('#i-desp'), () => barList($('#i-desp'), desp.map((d) => ({ label: d.categoria, value: d.valor })), { thin: true, all: true, colour: 'var(--negative)', format: (v) => brlS(-v), tom: 'neg', empty: 'Nenhuma despesa operacional nos últimos 30 dias.' }));
    $('#i-extra').replaceChildren(...[
      ['Ticket médio por pedido', ou(I('ticket_medio_pedido'), brl)], ['Faturamento por cliente', ou(I('ticket_medio_cliente'), brl)],
      ['Prazo médio de recebimento', ou(R(res, 'prazo_medio_recebimento'), dias)], ['Prazo médio de pagamento a produtores', ou(R(res, 'prazo_medio_pagamento'), dias)],
      ['Ciclo financeiro', ou(I('ciclo_financeiro'), diasS)], ['Necessidade de capital de giro (estimada)', ou(I('capital_de_giro'), brl)],
      ['Comissões a pagar em 30 dias', ou(I('comissoes_30d'), (v) => brlS(-v))],
    ].map(([k, v]) => h('div', {}, h('dt', { text: k }), h('dd', { text: v }))));
  }

  // ------- CONFIGURAÇÕES -------
  function renderConfig(sub) {
    if (sub === 'categorias') workspace.renderCategorias();
    else if (sub === 'dados') { renderDados(); renderSobre(); }
  }
  function renderSobre() {
    $('#d-sobre').replaceChildren(...[
      ['Origem', origem()], ['Posição financeira', dBR(HOJE)],
      ['Atualização', 'Os dados não são atualizados em tempo real. Valem para a posição acima.'],
      ['Operações', 'Cadastros, baixas e estornos dependem de um sistema com gravação. O painel só consulta.'],
    ].map(([k, v]) => h('div', {}, h('dt', { text: k }), h('dd', { text: v }))));
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
    $('#d-finding').textContent = imp ? `${int(imp)} de ${int(FONTES.length)} fontes importadas` : 'Todas as fontes usam dados de exemplo';
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
    workspace.reiniciar();
    atualizarContagem();
    atualizarOrigem();
    if (!$('#g-resumo').hidden) $('#g-resumo-txt').value = textoResumo();
    route();
  }
  function atualizarContagem() {
    try { window.CaixaMenu.setReceivableCount(R(get('resumo'), 'vencidos_qtd')); } catch (e) { console.error(e); }
  }

  // ------- ROTAS -------
  const origem = () => { const n = Object.keys(IMPORT_META).length; return n === 0 ? 'Dados de exemplo · valores demonstrativos' : n < FONTES.length ? `Fontes mistas · ${n} importadas e ${FONTES.length - n} de exemplo` : 'Dados importados · guardados neste navegador'; };
  function atualizarOrigem() {
    $('#data-origin').textContent = origem() + (avisosFontes.length ? ' · Não foi possível recuperar fontes salvas: ' + avisosFontes.join(', ') + '. Confira a importação.' : '');
    $('#workspace-date').textContent = `Posição de ${dBR(HOJE)} · sem atualização em tempo real`;
  }
  const irPara = (destino) => { location.hash = '#' + destino; };
  const workspace = criarWorkspace({ get, posicao: () => HOJE, origem, irPara });
  const VIEWS = { geral: renderGeral, fluxo: renderFluxo, receber: renderReceber, pagar: renderPagar, tesouraria: renderTesouraria, resultados: renderResultados, configuracoes: renderConfig };
  const NOMES = { geral: 'Visão geral', fluxo: 'Fluxo de caixa', receber: 'Contas a receber', pagar: 'Contas a pagar', tesouraria: 'Tesouraria', resultados: 'Resultados', configuracoes: 'Configurações' };
  const SUBS = { receber: ['titulos', 'clientes'], pagar: ['titulos', 'fornecedores'], tesouraria: ['contas', 'movimentacoes', 'fechamento', 'conciliacao'], configuracoes: ['dados', 'categorias', 'aparencia'] };
  // Endereços das páginas antigas continuam funcionando.
  const ALIAS = { fechamento: 'tesouraria/fechamento', lancamentos: 'tesouraria/movimentacoes', contas: 'tesouraria/contas', conciliacao: 'tesouraria/conciliacao', indicadores: 'resultados', dados: 'configuracoes/dados', categorias: 'configuracoes/categorias', pessoas: 'receber/clientes', relatorios: 'geral' };
  let atual = null;
  function route() {
    let [v, arg] = location.hash.slice(1).split('/');
    if (ALIAS[v]) { history.replaceState(null, '', '#' + ALIAS[v]); [v, arg] = ALIAS[v].split('/'); }
    const view = VIEWS[v] ? v : 'geral';
    if (view === 'receber' && arg === 'vencidos') { workspace.filtrarTitulos('A receber', { situacao: 'Vencido' }); arg = 'titulos'; }
    if (view === 'receber' && arg === 'limite') { workspace.filtrarClientes({ situacao_cliente: 'limite' }); arg = 'clientes'; }
    if (view === 'pagar' && arg === 'vencidos') { workspace.filtrarTitulos('A pagar', { situacao: 'Vencido' }); arg = 'titulos'; }
    const subs = SUBS[view];
    const sub = subs ? (subs.includes(arg) ? arg : subs[0]) : null;
    $$('main > .view').forEach((s) => { s.hidden = s.id !== view; });
    if (subs) {
      $$(`#${view} [data-panel]`).forEach((p) => { p.hidden = p.dataset.panel !== sub; });
      $$(`#${view} .subnav a`).forEach((a) => { if (a.dataset.sub === sub) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    }
    window.CaixaMenu.setActive(view);
    $$('a.settings-link').forEach((a) => { if (view === 'configuracoes') a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    $('#where').textContent = NOMES[view];
    document.title = `${NOMES[view]} · Caixa Novo · Mundo Novo`;
    safe($('#' + view), () => VIEWS[view](sub));
    fecharMenu();
    if (atual && atual !== view) { $('#main').focus({ preventScroll: true }); window.scrollTo(0, 0); }
    atual = view;
  }
  window.addEventListener('hashchange', route);

  // ------- CONTROLES -------
  $('#g-alerts-more').addEventListener('click', () => { alertasTodos = !alertasTodos; drawAlertas(); });
  $$('[data-f-tab]').forEach((b) => b.addEventListener('click', () => {
    $$('[data-f-tab]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    $$('[data-f-panel]').forEach((p) => { p.hidden = p.dataset.fPanel !== b.dataset.fTab; });
  }));

  // Menu do celular
  const sheet = $('#sheet');
  function fecharMenu() { sheet.classList.remove('open'); sheet.setAttribute('inert', ''); $('#main').removeAttribute('inert'); $('.topbar').removeAttribute('inert'); document.body.style.overflow = ''; $('#menu-open').setAttribute('aria-expanded', 'false'); }
  $('#menu-open').addEventListener('click', () => { sheet.removeAttribute('inert'); sheet.classList.add('open'); $('#main').setAttribute('inert', ''); $('.topbar').setAttribute('inert', ''); document.body.style.overflow = 'hidden'; $('#menu-open').setAttribute('aria-expanded', 'true'); $('#menu-close').focus(); });
  $('#menu-close').addEventListener('click', () => { fecharMenu(); $('#menu-open').focus(); });
  sheet.addEventListener('click', event => {
    const link = event.target.closest('a[data-view]');
    if (link && link.hash === location.hash && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
      fecharMenu(); $('#menu-open').focus();
    }
  });
  matchMedia('(min-width: 901px)').addEventListener('change', event => { if (event.matches) fecharMenu(); });
  document.addEventListener('keydown', (e) => {
    if (!sheet.classList.contains('open')) return;
    if (e.key === 'Escape') { fecharMenu(); $('#menu-open').focus(); }
    if (e.key === 'Tab') {
      const nodes = $$('a[href],button', sheet).filter(node => node.tabIndex >= 0 && !node.closest('[inert]') && node.getClientRects().length);
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // Tema
  const aplicarTema = (t) => {
    if (t === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t);
    $$('[data-theme-set]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.themeSet === t)));
    try { localStorage.setItem('mn-tema', t); } catch (e) { /* sem armazenamento: segue o sistema */ }
    if (atual) route();
  };
  $$('[data-theme-set]').forEach((b) => b.addEventListener('click', () => aplicarTema(b.dataset.themeSet)));
  let tema = 'auto';
  try { tema = localStorage.getItem('mn-tema') || 'auto'; } catch (e) { tema = 'auto'; }
  if (tema !== 'auto') { document.documentElement.setAttribute('data-theme', tema); $$('[data-theme-set]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.themeSet === tema))); }
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (!document.documentElement.hasAttribute('data-theme') && atual) route(); });

  // Contagem de vencidos no menu (fila que pede ação)
  atualizarContagem();
  atualizarOrigem();
  $('#main').setAttribute('aria-busy', 'false');
  $('#app-loading').hidden = true;
  route();
})();
