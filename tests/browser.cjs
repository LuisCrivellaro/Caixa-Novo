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
  try { res.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream' }); res.end(readFileSync(path)); }
  catch { res.writeHead(404).end(); }
});
const routes = ['geral', 'fluxo', 'receber', 'pagar', 'fechamento', 'lancamentos', 'indicadores', 'contas', 'pessoas', 'categorias', 'relatorios', 'conciliacao', 'dados', 'configuracoes'];
const checks = [];
const ok = message => { checks.push(message); console.log('OK ' + message); };
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1080 }, acceptDownloads: true });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && !m.text().includes('favicon')) errors.push(m.text()); });
    const go = async id => { await page.evaluate(id => { location.hash = id; }, id); await page.locator('#' + id).waitFor({ state: 'visible' }); };
    await page.goto(url); await page.locator('#app-loading').waitFor({ state: 'hidden' });
    assert.match(await page.locator('#data-origin').innerText(), /Dados de exemplo/);
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of routes) {
        await go(route);
        assert.equal(await page.locator('main > .view:visible').count(), 1, route);
        assert.equal(await page.locator('#' + route + ' .err').count(), 0, route);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${route}: ${width}px`);
      }
    }
    ok('14 rotas em desktop, tablet e celular, sem rolagem horizontal da página');
    mkdirSync(resolve(root, 'test-results'), { recursive: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await go('geral'); await page.screenshot({ path: resolve(root, 'test-results/dashboard-mobile.png'), fullPage: true });
    await page.locator('#menu-open').click();
    assert.equal(await page.locator('#main').getAttribute('inert'), '');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#menu-open').getAttribute('aria-expanded'), 'false');
    assert.equal(await page.locator('#main').getAttribute('inert'), null);
    await page.locator('#menu-open').click();
    await page.locator('#sheet a[data-view="pessoas"]').click();
    await page.locator('#pessoas').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#main').getAttribute('inert'), null);
    ok('menu mobile: abertura, Escape, navegação e liberação do foco');

    await page.setViewportSize({ width: 1440, height: 1080 });
    await go('geral');
    await page.locator('#kt-fluxo').click();
    assert.equal(await page.locator('#kt-fluxo').getAttribute('aria-selected'), 'true');
    await page.keyboard.press('ArrowLeft');
    assert.equal(await page.locator('#kt-saldo').getAttribute('aria-selected'), 'true');
    await page.locator('#g-resumo-abrir').click(); assert.ok((await page.locator('#g-resumo-txt').inputValue()).length > 50);
    await page.locator('#g-resumo-fechar').click();
    await page.screenshot({ path: resolve(root, 'test-results/dashboard-desktop.png'), fullPage: true });
    ok('abas do gráfico por mouse e teclado e resumo do dia');

    await go('receber');
    const titles = page.locator('#r-titulos');
    await titles.locator('input[type=search]').fill('registro que não existe');
    assert.equal(await titles.locator('tbody tr').count(), 0);
    assert.ok(await titles.locator('.empty').isVisible());
    await titles.getByRole('button', { name: 'Limpar', exact: true }).click();
    assert.equal(await titles.locator('tbody tr').count(), 15);
    const first = await titles.locator('tbody tr').first().innerText();
    await titles.getByRole('button', { name: 'Próxima', exact: true }).click();
    assert.notEqual(await titles.locator('tbody tr').first().innerText(), first);
    await titles.getByRole('button', { name: 'Cliente / fornecedor', exact: true }).click();
    assert.equal(await titles.locator('th[aria-sort=ascending]').count(), 1);
    await titles.getByRole('button', { name: 'Ver título', exact: true }).first().click();
    assert.ok(await page.getByRole('dialog').isVisible());
    assert.match(await page.getByRole('dialog').innerText(), /Emissão/);
    await page.keyboard.press('Escape');
    await titles.locator('input[type=date]').first().fill('2026-12-01');
    await titles.locator('input[type=date]').last().fill('2026-10-01');
    assert.ok(await titles.getByRole('button', { name: 'Exportar CSV' }).isDisabled());
    assert.match(await titles.locator('.field-error').innerText(), /data final/);
    await titles.getByRole('button', { name: 'Limpar', exact: true }).click();
    const downloadPromise = page.waitForEvent('download');
    await titles.getByRole('button', { name: 'Exportar CSV' }).click();
    const download = await downloadPromise;
    const csv = readFileSync(await download.path(), 'utf8');
    assert.match(csv, /Dados de exemplo/);
    assert.ok(csv.split('\r\n').length > 17, 'exporta todos os registros filtrados, além da página visível');
    ok('títulos: pesquisa, vazio, limpar, paginação, ordenação, detalhes, datas e CSV completo');

    await go('contas');
    await page.locator('#contas-content').getByRole('button', { name: 'Ver movimentações' }).first().click();
    await page.locator('#lancamentos').waitFor({ state: 'visible' });
    assert.equal(await page.locator('select[data-col=conta]').inputValue(), 'Caixa da loja');
    await page.locator('#l-body .entry-detail').first().click();
    assert.match(await page.getByRole('dialog').innerText(), /Detalhes da movimentação/); await page.keyboard.press('Escape');
    await go('pagar'); await page.locator('#p-cal button').first().click();
    assert.ok(await page.getByRole('dialog').isVisible()); await page.keyboard.press('Escape');
    await go('conciliacao'); await page.locator('#cc-exemplo').click();
    assert.ok(await page.locator('#cc-result').isVisible());
    await page.locator('#cc-file').setInputFiles({ name: 'extrato-teste.ofx', mimeType: 'application/x-ofx', buffer: Buffer.from('<OFX><STMTTRN><DTPOSTED>20261028<TRNAMT>-12.34<NAME>Tarifa de teste</STMTTRN></OFX>') });
    await page.waitForFunction(() => document.getElementById('cc-status').textContent.includes('extrato-teste.ofx'));
    assert.match(await page.locator('#cc-body').innerText(), /12,34/);
    ok('contas abrem extrato filtrado; calendário abre títulos; conciliação preservada');

    await go('dados');
    await page.locator('#d-fontes tr').first().locator('button').first().click({ noWaitAfter: true });
    await page.locator('#d-file').setInputFiles({ name: 'contas-teste.csv', mimeType: 'text/csv', buffer: Buffer.from('Conta;Tipo;Saldo;Data\nConta de teste;Banco;1234,56;31/10/2026\n') });
    await page.locator('#d-map').getByRole('button', { name: 'Usar estes dados' }).click();
    assert.equal(await page.evaluate(() => localStorage.getItem('mn-fonte-contas')), null);
    await page.getByRole('dialog').getByRole('button', { name: 'Aplicar importação' }).click();
    assert.match(await page.locator('#data-origin').innerText(), /Fontes mistas/);
    await go('contas'); assert.match(await page.locator('#contas-content').innerText(), /1\.234,56/);
    await page.reload(); await page.locator('#app-loading').waitFor({ state: 'hidden' });
    assert.match(await page.locator('#contas-content').innerText(), /Conta de teste/);
    await go('dados'); await page.getByRole('button', { name: 'Voltar ao exemplo', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Fechar', exact: true }).click();
    assert.notEqual(await page.evaluate(() => localStorage.getItem('mn-fonte-contas')), null);
    await page.getByRole('button', { name: 'Voltar ao exemplo', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Voltar ao exemplo', exact: true }).click();
    assert.equal(await page.evaluate(() => localStorage.getItem('mn-fonte-contas')), null);
    assert.match(await page.locator('#data-origin').innerText(), /Dados de exemplo/);
    ok('importação CSV: conferência, confirmação, centavos, persistência, cancelar e restaurar exemplo');

    await go('configuracoes'); await page.locator('#configuracoes-content').getByRole('button', { name: 'Escuro', exact: true }).click();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    await page.reload(); await page.locator('#app-loading').waitFor({ state: 'hidden' });
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    await go('geral'); await page.screenshot({ path: resolve(root, 'test-results/dashboard-dark.png'), fullPage: true });
    assert.deepEqual(errors, []);
    ok('tema escuro persiste e nenhuma exceção JavaScript foi emitida');

    const empty = await browser.newPage();
    const data = Object.fromEntries(['contas', 'clientes', 'receber', 'pagar', 'lancamentos', 'fechamentos'].map(n => [n, n === 'contas' ? JSON.parse(readFileSync(resolve(root, 'dados/contas.json'), 'utf8')) : []]));
    const emptyErrors = []; empty.on('pageerror', e => emptyErrors.push(e.message));
    await empty.addInitScript(data => { window.__DADOS__ = data; }, data);
    await empty.goto(url); await empty.locator('#app-loading').waitFor({ state: 'hidden' });
    for (const id of routes) { await empty.evaluate(id => { location.hash = id; }, id); await empty.locator('#' + id).waitFor({ state: 'visible' }); assert.equal(await empty.locator('#' + id + ' .err').count(), 0, `vazio: ${id}`); }
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
      await standalone.evaluate(() => { location.hash = 'contas'; });
      await standalone.locator('#contas-content .account-card').first().waitFor();
      assert.deepEqual(standaloneErrors, []); await standalone.close();
      ok('build HTML único contém componentes, scripts e fontes embutidas');
    }
    console.log(`${checks.length} grupos de verificações passaram.`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
