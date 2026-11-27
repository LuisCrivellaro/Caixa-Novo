// Integração real no Chromium. Inicia e encerra seu próprio servidor local.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { readFileSync, existsSync, mkdirSync } = require('node:fs');
const { resolve, extname, sep } = require('node:path');
const root = resolve(__dirname, '..');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png' };
const server = createServer((req, res) => {
  const path = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/\/$/, '/index.html'));
  if (!path.startsWith(root + sep)) { res.writeHead(403).end(); return; }
  try { const body = readFileSync(path); res.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream' }); res.end(body); }
  catch { res.writeHead(404).end(); }
});
const pages = ['geral', 'fluxo', 'receber', 'pagar', 'tesouraria', 'resultados'];
// Rota → [tela, aba visível]. Inclui as abas internas; os endereços antigos ficam em aliases.
const routes = {
  geral: ['geral'], fluxo: ['fluxo'], receber: ['receber', 'titulos'], 'receber/clientes': ['receber', 'clientes'],
  pagar: ['pagar', 'titulos'], 'pagar/fornecedores': ['pagar', 'fornecedores'],
  'tesouraria/contas': ['tesouraria', 'contas'], 'tesouraria/movimentacoes': ['tesouraria', 'movimentacoes'],
  'tesouraria/fechamento': ['tesouraria', 'fechamento'], 'tesouraria/conciliacao': ['tesouraria', 'conciliacao'],
  resultados: ['resultados'], 'configuracoes/dados': ['configuracoes', 'dados'],
  'configuracoes/categorias': ['configuracoes', 'categorias'], 'configuracoes/aparencia': ['configuracoes', 'aparencia'],
};
const aliases = { fechamento: 'tesouraria/fechamento', lancamentos: 'tesouraria/movimentacoes', contas: 'tesouraria/contas', conciliacao: 'tesouraria/conciliacao', indicadores: 'resultados', dados: 'configuracoes/dados', categorias: 'configuracoes/categorias', pessoas: 'receber/clientes', relatorios: 'geral' };
const checks = [];
const ok = message => { checks.push(message); console.log('OK ' + message); };
const checkFlow = require('./flow-browser.cjs');
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ headless: true, channel: process.env.PW_CHANNEL || undefined });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1080 }, acceptDownloads: true });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && !(m.text() + m.location().url).includes('favicon')) errors.push(m.text() + ' ' + m.location().url); });
    const go = async hash => {
      const [view, panel] = routes[hash] || [hash.split('/')[0]];
      await page.evaluate(hash => { location.hash = hash; }, hash);
      await page.locator('#' + view).waitFor({ state: 'visible' });
      if (panel) await page.locator(`#${view} [data-panel="${panel}"]`).waitFor({ state: 'visible' });
    };
    await page.goto(url); await page.locator('#app-loading').waitFor({ state: 'hidden' });
    assert.match(await page.locator('#data-origin').innerText(), /Dados de exemplo/);
    assert.match(await page.locator('#workspace-date').innerText(), /Posição de 28\/10\/2026/);
    const desktopMenu = page.locator('.side .nav');
    assert.deepEqual(await desktopMenu.locator('a[data-view]').allTextContents().then(t => t.map(x => x.replace(/[\d.]+$/, ''))), ['Visão geral', 'Fluxo de caixa', 'Contas a receber', 'Contas a pagar', 'Tesouraria', 'Resultados']);
    assert.equal(await page.locator('.side details, .side [aria-expanded]').count(), 0, 'menu sem grupos expansíveis');
    assert.equal(await page.locator('.side [data-theme-set]').count(), 0, 'tema só em Configurações');
    assert.equal(await page.locator('.side').evaluate(el => el.getBoundingClientRect().width), 224);
    for (const id of pages) {
      const link = desktopMenu.locator(`a[data-view="${id}"]`);
      await link.click();
      await page.locator('#' + id).waitFor({ state: 'visible' });
      assert.equal(await link.getAttribute('aria-current'), 'page', id);
      assert.equal(await desktopMenu.locator('a[aria-current="page"]').count(), 1, id);
    }
    await page.locator('.side .settings-link').click();
    await page.locator('#configuracoes').waitFor({ state: 'visible' });
    assert.equal(await page.locator('.side .settings-link').getAttribute('aria-current'), 'page');
    assert.equal(await desktopMenu.locator('a[aria-current="page"]').count(), 0);
    assert.ok(Number((await desktopMenu.locator('[data-view="receber"] .nav-count').innerText()).replace(/\D/g, '')) > 0);
    await desktopMenu.locator('[data-view="geral"]').click();
    await desktopMenu.locator('[data-view="fluxo"]').click();
    await page.goBack(); await page.locator('#geral').waitFor({ state: 'visible' });
    assert.equal(await desktopMenu.locator('[data-view="geral"]').getAttribute('aria-current'), 'page');
    await page.goForward(); await page.locator('#fluxo').waitFor({ state: 'visible' });
    assert.equal(await desktopMenu.locator('[data-view="fluxo"]').getAttribute('aria-current'), 'page');
    for (const [old, target] of Object.entries(aliases)) {
      await page.evaluate(hash => { location.hash = hash; }, old);
      await page.waitForFunction(target => location.hash === '#' + target, target);
      await page.locator('#' + routes[target][0]).waitFor({ state: 'visible' });
    }
    ok('menu plano: 6 páginas, Configurações no rodapé, ativo, badge, histórico e rotas antigas redirecionadas');
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      for (const [hash, [view, panel]] of Object.entries(routes)) {
        await go(hash);
        assert.equal(await page.locator('main > .view:visible').count(), 1, hash);
        if (panel) {
          assert.equal(await page.locator(`#${view} [data-panel]:visible`).count(), 1, hash);
          assert.equal(await page.locator(`#${view} .subnav a[aria-current="page"]`).getAttribute('data-sub'), panel, hash);
        }
        assert.equal(await page.locator('#' + view + ' .err').count(), 0, hash);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${hash}: ${width}px`);
      }
    }
    ok('14 rotas com abas em desktop, tablet e celular, uma aba visível por vez e sem rolagem horizontal');
    mkdirSync(resolve(root, 'test-results'), { recursive: true });
    await checkFlow(browser, url, root);
    ok('Fluxo de caixa: quatro períodos com dados conferidos, categorias, filtros, CSV, teclado, arraste, toque e responsividade');

    await page.setViewportSize({ width: 390, height: 844 });
    await go('geral'); await page.screenshot({ path: resolve(root, 'test-results/dashboard-mobile.png'), fullPage: true });
    await page.locator('#menu-open').click();
    assert.equal(await page.locator('#main').getAttribute('inert'), '');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#menu-open').getAttribute('aria-expanded'), 'false');
    assert.equal(await page.locator('#main').getAttribute('inert'), null);
    const mobileMenu = page.locator('#sheet .nav');
    for (const width of [768, 390, 320]) {
      await page.setViewportSize({ width, height: 700 });
      for (const id of pages) {
        await page.locator('#menu-open').click();
        const link = mobileMenu.locator(`a[data-view="${id}"]`);
        await link.click();
        await page.locator('#' + id).waitFor({ state: 'visible' });
        assert.equal(await link.getAttribute('aria-current'), 'page');
        assert.equal(await page.locator('#menu-open').getAttribute('aria-expanded'), 'false');
        assert.equal(await page.locator('#main').getAttribute('inert'), null);
      }
    }
    await page.locator('#menu-open').click();
    await page.locator('#sheet .settings-link').focus();
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'menu-close');
    await page.keyboard.press('Shift+Tab');
    assert.ok(await page.evaluate(() => document.activeElement.classList.contains('settings-link')));
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'menu-open');
    ok('menu mobile: abertura, Escape, navegação e foco preso no painel');

    await page.setViewportSize({ width: 1440, height: 1080 });
    await go('geral');
    assert.deepEqual(await page.locator('#g-strip .kpi-label').allTextContents(), ['Saldo disponível', 'Total a receber', 'Total a pagar', 'Saldo projetado em 30 dias']);
    assert.equal(await page.locator('#g-strip .kpi-flag').count(), 0);
    assert.ok(await page.locator('#g-chart svg').count() > 0);
    const alerts = page.locator('#g-alerts > li');
    assert.ok(await alerts.count() <= 3);
    if (await page.locator('#g-alerts-more').isVisible()) {
      const before = await alerts.count();
      await page.locator('#g-alerts-more').click();
      assert.ok(await alerts.count() > before);
      assert.equal(await page.locator('#g-alerts-more').getAttribute('aria-expanded'), 'true');
      await page.locator('#g-alerts-more').click();
    }
    await page.locator('#g-resumo-abrir').click(); assert.ok((await page.locator('#g-resumo-txt').inputValue()).length > 50);
    await page.locator('#g-resumo-fechar').click();
    await page.screenshot({ path: resolve(root, 'test-results/dashboard-desktop.png'), fullPage: true });
    ok('visão geral: 4 indicadores, gráfico projetado, alertas com ver mais e resumo do dia');

    await go('receber');
    assert.deepEqual(await page.locator('#r-strip .kpi-label').allTextContents(), ['Em aberto', 'Vencido', 'A vencer em 7 dias']);
    const titles = page.locator('#r-titulos');
    assert.equal(await titles.getByRole('combobox', { name: 'Situação', exact: true }).inputValue(), 'aberto');
    assert.deepEqual(await titles.locator('th:visible').allTextContents(), ['Cliente', 'Vencimento', 'Valor em aberto', 'Situação']);
    assert.ok(!(await titles.locator('.more-filters').isVisible()));
    await titles.getByText('Mais filtros').click();
    assert.ok(await titles.getByRole('combobox', { name: 'Vendedor', exact: true }).isVisible());
    await titles.locator('input[type=search]').fill('registro que não existe');
    assert.equal(await titles.locator('tbody tr').count(), 0);
    assert.ok(await titles.locator('.empty').isVisible());
    await titles.getByRole('button', { name: 'Limpar', exact: true }).click();
    assert.equal(await titles.locator('tbody tr').count(), 15);
    const first = await titles.locator('tbody tr').first().innerText();
    await titles.getByRole('button', { name: 'Próxima', exact: true }).click();
    assert.notEqual(await titles.locator('tbody tr').first().innerText(), first);
    await titles.getByRole('button', { name: 'Cliente', exact: true }).click();
    assert.equal(await titles.locator('th[aria-sort=ascending]').count(), 1);
    await titles.locator('tbody .entry-detail').first().click();
    assert.ok(await page.getByRole('dialog').isVisible());
    assert.match(await page.getByRole('dialog').innerText(), /Documento[\s\S]*Vendedor[\s\S]*Rota/);
    await page.keyboard.press('Escape');
    await titles.locator('input[type=date]').first().fill('2026-12-01');
    await titles.locator('input[type=date]').last().fill('2026-10-01');
    assert.ok(await titles.getByRole('button', { name: 'Exportar CSV' }).isDisabled());
    assert.match(await titles.locator('.field-error').innerText(), /data final/);
    await titles.getByRole('button', { name: 'Limpar', exact: true }).click();
    const downloadPromise = page.waitForEvent('download');
    await titles.getByRole('button', { name: 'Exportar CSV' }).click();
    const csv = readFileSync(await (await downloadPromise).path(), 'utf8');
    assert.match(csv, /Dados de exemplo/); assert.match(csv, /Documento/);
    assert.ok(csv.split('\r\n').length > 17, 'exporta todos os registros filtrados, além da página visível');
    await go('receber/vencidos');
    assert.equal(await titles.getByRole('combobox', { name: 'Situação', exact: true }).inputValue(), 'Vencido');
    assert.ok((await titles.locator('tbody tr').allInnerTexts()).every(t => /Vencido/.test(t)));
    await page.evaluate(() => { location.hash = 'receber/limite'; });
    await page.locator('#r-clientes').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#r-clientes').getByRole('combobox', { name: 'Situação', exact: true }).inputValue(), 'limite');
    ok('contas a receber: indicadores, títulos em aberto, mais filtros, pesquisa, vazio, paginação, ordenação, detalhes, datas, CSV e atalhos de vencidos e limite');

    await go('pagar');
    assert.deepEqual(await page.locator('#p-strip .kpi-label').allTextContents(), ['Em aberto', 'Vencido', 'A vencer em 7 dias']);
    await page.locator('#p-titulos tbody .entry-detail').first().click();
    assert.match(await page.getByRole('dialog').innerText(), /Categoria[\s\S]*Abatimento/); await page.keyboard.press('Escape');
    await page.locator('#pagar .subnav a[data-sub="fornecedores"]').click();
    await page.locator('#p-fornecedores').waitFor({ state: 'visible' });
    assert.ok(await page.locator('#p-fornecedores tbody tr').count() > 0);
    ok('contas a pagar: indicadores, detalhes do título e aba de fornecedores');

    await go('tesouraria/contas');
    await page.locator('#t-contas').getByRole('button', { name: 'Ver movimentações de Caixa da loja' }).click();
    await page.locator('#t-mov').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#t-mov').getByRole('combobox', { name: 'Conta', exact: true }).inputValue(), 'Caixa da loja');
    await page.locator('#t-mov tbody .entry-detail').first().click();
    assert.match(await page.getByRole('dialog').innerText(), /Movimentação/); await page.keyboard.press('Escape');
    await go('tesouraria/fechamento');
    assert.match(await page.locator('#c-finding').innerText(), /bateram no centavo/);
    await page.locator('#c-lista .entry-detail').first().click();
    assert.match(await page.getByRole('dialog').innerText(), /Gaveta de/); await page.keyboard.press('Escape');
    await go('tesouraria/conciliacao'); await page.locator('#cc-exemplo').click();
    assert.ok(await page.locator('#cc-result').isVisible());
    await page.locator('#cc-file').setInputFiles({ name: 'extrato-teste.ofx', mimeType: 'application/x-ofx', buffer: Buffer.from('<OFX><STMTTRN><DTPOSTED>20261028<TRNAMT>-12.34<NAME>Tarifa de teste</STMTTRN></OFX>') });
    await page.waitForFunction(() => document.getElementById('cc-status').textContent.includes('extrato-teste.ofx'));
    assert.match(await page.locator('#cc-body').innerText(), /12,34/);
    ok('tesouraria: contas abrem movimentações filtradas, detalhes, fechamento com itens da gaveta e conciliação preservada');

    await go('resultados');
    assert.deepEqual(await page.locator('#i-strip .kpi-label').allTextContents(), ['Faturamento em 30 dias', 'Margem bruta estimada', 'Despesas operacionais', 'Inadimplência']);
    assert.ok(await page.locator('#i-chart svg').count() > 0);
    assert.ok(!(await page.locator('#i-extra').isVisible()));
    await page.locator('#i-mais summary').click();
    assert.match(await page.locator('#i-extra').innerText(), /Ticket médio/);
    ok('resultados: indicadores, gráfico mensal, despesas e indicadores complementares recolhidos');

    await go('configuracoes/dados');
    await page.locator('#d-fontes tr').first().locator('button').first().click({ noWaitAfter: true });
    await page.locator('#d-file').setInputFiles({ name: 'contas-teste.csv', mimeType: 'text/csv', buffer: Buffer.from('Conta;Tipo;Saldo;Data\nConta de teste;Banco;1234,56;31/10/2026\n') });
    await page.locator('#d-map').getByRole('button', { name: 'Usar estes dados' }).click();
    assert.equal(await page.evaluate(() => localStorage.getItem('mn-fonte-contas')), null);
    await page.getByRole('dialog').getByRole('button', { name: 'Aplicar importação' }).click();
    assert.match(await page.locator('#data-origin').innerText(), /Fontes mistas/);
    await go('tesouraria/contas'); assert.match(await page.locator('#t-contas').innerText(), /1\.234,56/);
    await go('geral'); assert.ok(await page.locator('#g-strip .kpi-flag').count() > 0, 'marca de fontes mistas nos indicadores');
    await page.reload(); await page.locator('#app-loading').waitFor({ state: 'hidden' });
    await go('tesouraria/contas'); assert.match(await page.locator('#t-contas').innerText(), /Conta de teste/);
    await go('configuracoes/dados'); await page.getByRole('button', { name: 'Voltar ao exemplo', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Fechar', exact: true }).click();
    assert.notEqual(await page.evaluate(() => localStorage.getItem('mn-fonte-contas')), null);
    await page.getByRole('button', { name: 'Voltar ao exemplo', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Voltar ao exemplo', exact: true }).click();
    assert.equal(await page.evaluate(() => localStorage.getItem('mn-fonte-contas')), null);
    assert.match(await page.locator('#data-origin').innerText(), /Dados de exemplo/);
    ok('importação CSV: conferência, confirmação, centavos, fontes mistas, persistência, cancelar e restaurar exemplo');

    await go('configuracoes/categorias');
    assert.ok(await page.locator('#s-categorias tbody tr').count() > 0);
    await go('configuracoes/aparencia'); await page.locator('#s-aparencia').getByRole('button', { name: 'Escuro', exact: true }).click();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    await page.reload(); await page.locator('#app-loading').waitFor({ state: 'hidden' });
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    await go('geral'); await page.screenshot({ path: resolve(root, 'test-results/dashboard-dark.png'), fullPage: true });
    assert.deepEqual(errors, []);
    ok('categorias, tema escuro persistente e nenhuma exceção JavaScript emitida');

    const empty = await browser.newPage();
    const data = Object.fromEntries(['contas', 'clientes', 'receber', 'pagar', 'lancamentos', 'fechamentos'].map(n => [n, n === 'contas' ? JSON.parse(readFileSync(resolve(root, 'dados/contas.json'), 'utf8')) : []]));
    const emptyErrors = []; empty.on('pageerror', e => emptyErrors.push(e.message));
    await empty.addInitScript(data => { window.__DADOS__ = data; }, data);
    await empty.goto(url); await empty.locator('#app-loading').waitFor({ state: 'hidden' });
    for (const [hash, [view]] of Object.entries(routes)) { await empty.evaluate(hash => { location.hash = hash; }, hash); await empty.locator('#' + view).waitFor({ state: 'visible' }); assert.equal(await empty.locator('#' + view + ' .err').count(), 0, `vazio: ${hash}`); }
    assert.deepEqual(emptyErrors, []); await empty.close();
    ok('todas as telas aceitam fontes sem títulos, movimentos, clientes ou fechamentos');

    const failure = await browser.newPage();
    await failure.route('**/dados/contas.json', route => route.fulfill({ status: 503, body: 'indisponível' }));
    await failure.goto(url); await failure.locator('#app-loading').waitFor({ state: 'hidden' });
    assert.match(await failure.locator('main').innerText(), /Não foi possível carregar/);
    await failure.unroute('**/dados/contas.json'); await failure.getByRole('button', { name: 'Tentar novamente' }).click();
    await failure.locator('#g-strip .kpi-value').first().waitFor(); await failure.close();
    ok('falha de carga é exibida e tentar novamente recupera as fontes');
    const corrupted = await browser.newPage();
    await corrupted.addInitScript(() => localStorage.setItem('mn-fonte-contas', 'JSON inválido'));
    await corrupted.goto(url); await corrupted.locator('#app-loading').waitFor({ state: 'hidden' });
    assert.match(await corrupted.locator('#data-origin').innerText(), /Não foi possível recuperar fontes salvas: contas/);
    await corrupted.close(); ok('falha em fonte salva aparece no aviso de origem');

    if (existsSync(resolve(root, 'dist/caixa-novo.html'))) {
      const standalone = await browser.newPage(); const standaloneErrors = [];
      standalone.on('pageerror', e => standaloneErrors.push(e.message));
      await standalone.route('**/dados/*.json', () => { throw new Error('HTML único não deve buscar fontes externas'); });
      await standalone.goto(url + '/dist/caixa-novo.html');
      await standalone.locator('#g-strip .kpi-value').first().waitFor();
      await standalone.evaluate(() => { location.hash = 'tesouraria/contas'; });
      await standalone.locator('#t-contas .accounts li').first().waitFor();
      await standalone.evaluate(() => { location.hash = 'fluxo'; });
      await standalone.getByRole('radio', { name: 'Ano', exact: true }).click();
      assert.equal(await standalone.locator('#f-cat-current').textContent(), 'Ano atual');
      await standalone.evaluate(() => { location.hash = 'contas'; });
      await standalone.locator('#t-contas .accounts li').first().waitFor();
      assert.equal(await standalone.locator('.side .nav a[data-view="tesouraria"]').getAttribute('aria-current'), 'page');
      assert.deepEqual(standaloneErrors, []); await standalone.close();
      ok('build HTML único contém componentes, scripts e fontes embutidas');
    }
    console.log(`${checks.length} grupos de verificações passaram.`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
