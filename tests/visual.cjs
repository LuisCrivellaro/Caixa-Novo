// Auditoria visual real: 14 rotas x 5 larguras x 2 temas, sem alterar fontes.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { readFileSync, writeFileSync, mkdirSync } = require('node:fs');
const { resolve, extname, sep } = require('node:path');
const root = resolve(__dirname, '..');
const phase = process.argv[2] || 'after';
assert.ok(['before', 'after'].includes(phase));
const output = resolve(root, 'test-results', 'visual-' + phase);
mkdirSync(output, { recursive: true });
const routes = ['geral', 'fluxo', 'receber', 'pagar', 'fechamento', 'lancamentos', 'indicadores', 'contas', 'pessoas', 'categorias', 'relatorios', 'conciliacao', 'dados', 'configuracoes'];
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png' };
const server = createServer((req, res) => {
  const path = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/\/$/, '/index.html'));
  if (!path.startsWith(root + sep)) { res.writeHead(403).end(); return; }
  try { res.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream' }); res.end(readFileSync(path)); }
  catch { res.writeHead(404).end(); }
});
(async () => {
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  const url = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ headless: true });
  const report = { phase, combinations: [], stress: [], errors: [] };
  try {
    for (const theme of ['light', 'dark']) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', hasTouch: true });
      page.on('pageerror', error => report.errors.push(error.message));
      await page.addInitScript(theme => localStorage.setItem('mn-tema', theme), theme);
      await page.goto(url);
      await page.locator('#app-loading').waitFor({ state: 'hidden' });
      await page.evaluate(() => document.fonts.ready);
      for (const width of [1440, 1280, 768, 390, 320]) {
        await page.setViewportSize({ width, height: 1000 });
        for (const route of routes) {
          await page.evaluate(route => { location.hash = route; }, route);
          await page.locator('#' + route).waitFor({ state: 'visible' });
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.evaluate(() => new Promise(requestAnimationFrame));
          const metrics = await page.locator('#' + route).evaluate(view => {
            const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
            const rgba = color => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = color; ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data]; };
            const luminance = rgb => rgb.slice(0, 3).map(value => value / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4).reduce((sum, value, i) => sum + value * [.2126, .7152, .0722][i], 0);
            const visible = el => el.getClientRects().length && !el.closest('[hidden],[inert]');
            const contrast = el => {
              let bg = [255, 255, 255];
              const ancestors = []; for (let node = el; node; node = node.parentElement) ancestors.unshift(node);
              for (const node of ancestors) {
                const color = rgba(getComputedStyle(node).backgroundColor), alpha = color[3] / 255;
                bg = bg.map((channel, i) => channel * (1 - alpha) + color[i] * alpha);
              }
              const fg = rgba(getComputedStyle(el).color), alpha = fg[3] / 255;
              const ink = bg.map((channel, i) => channel * (1 - alpha) + fg[i] * alpha);
              return (Math.max(luminance(bg), luminance(ink)) + .05) / (Math.min(luminance(bg), luminance(ink)) + .05);
            };
            const metadata = [...view.querySelectorAll('.kpi-sub,.stamp,.meta,.card-note,.kpi-label,.finding,.field,.band')].filter(visible);
            const clippedMoney = [...view.querySelectorAll('.kpi-value,.account-balance')].filter(visible).filter(el => el.scrollWidth > el.clientWidth + 1).map(el => el.textContent);
            const minSize = (root, selector) => Math.min(...[...root.querySelectorAll(selector)].filter(visible).map(el => parseFloat(getComputedStyle(el).fontSize)));
            return {
              overflow: document.documentElement.scrollWidth > innerWidth,
              mobileHeaderGap: innerWidth <= 900 ? document.querySelector('main').getBoundingClientRect().top - document.querySelector('.topbar').getBoundingClientRect().bottom : 0,
              views: document.querySelectorAll('main > .view:not([hidden])').length,
              errors: view.querySelectorAll('.err').length,
              minMetadataSize: Math.min(...metadata.map(el => parseFloat(getComputedStyle(el).fontSize))),
              lowContrast: metadata.filter(el => contrast(el) < 4.45).map(el => ({ text: el.textContent.slice(0, 65), ratio: +contrast(el).toFixed(2) })),
              clippedMoney,
              crowdedAxes: [...view.querySelectorAll('.chart > svg')].flatMap(svg => {
                const labels = [...svg.querySelectorAll('[data-axis="x"]')];
                return labels.slice(1).filter((el, index) => el.getBoundingClientRect().left < labels[index].getBoundingClientRect().right + 7).map(el => el.textContent);
              }),
              overlappingChartText: [...view.querySelectorAll('.chart > svg')].flatMap(svg => {
                const labels = [...svg.querySelectorAll('text')];
                return labels.flatMap((el, index) => labels.slice(index + 1).filter(other => {
                  const a = el.getBoundingClientRect(), b = other.getBoundingClientRect();
                  return Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
                }).map(other => [el.textContent, other.textContent]));
              }),
              type: {
                page: minSize(view, 'h1'), section: minSize(view, '.card-head h2,.account-card h2'),
                table: minSize(view, 'td'), label: minSize(view, '.field'),
                nav: minSize(document, '.side .branched-menu__item,.sheet.open .branched-menu__item'),
                chart: minSize(view, '.chart svg text'),
                tiny: [...view.querySelectorAll('*')].filter(el => visible(el) && [...el.childNodes].some(node => node.nodeType === 3 && node.textContent.trim()) && parseFloat(getComputedStyle(el).fontSize) < 11).map(el => el.textContent.slice(0, 60))
              },
              numbers: [...view.querySelectorAll('.num,.kpi-value,.account-balance')].map(el => el.textContent.replace(/\s/g, ' ').trim()),
              chartValues: [...view.querySelectorAll('.chart svg title')].map(el => el.textContent).sort()
            };
          });
          assert.equal(metrics.overflow, false, `${theme}/${width}/${route}: overflow`);
          assert.equal(metrics.views, 1); assert.equal(metrics.errors, 0);
          if (phase === 'after') {
            for (const [role, floor] of Object.entries({ page: 28, section: 21, table: 15, label: 14, nav: 14, chart: 13 })) {
              assert.ok(metrics.type[role] >= floor, `${theme}/${width}/${route}: ${role} ${metrics.type[role]}px < ${floor}px`);
            }
            assert.deepEqual(metrics.type.tiny, [], `${theme}/${width}/${route}: tiny text`);
            assert.deepEqual(metrics.crowdedAxes, [], `${theme}/${width}/${route}: crowded axis labels`);
            assert.deepEqual(metrics.overlappingChartText, [], `${theme}/${width}/${route}: overlapping chart text`);
          }
          report.combinations.push({ theme, width, route, ...metrics });
          if ([1440, 390].includes(width)) await page.screenshot({ path: resolve(output, `${theme}-${width}-${route}.png`), fullPage: true });
        }
      }
      if (phase === 'after') {
        await page.setViewportSize({ width: 1440, height: 1000 });
        await page.evaluate(() => { location.hash = 'fluxo'; });
        const chart = page.locator('#f-chart > svg');
        await chart.waitFor(); await chart.focus(); await page.keyboard.press('End');
        assert.equal(await page.locator('#f-chart .chart-tip').getAttribute('data-visible'), 'true');
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#f-chart .chart-tip').getAttribute('data-visible'), null);
        await page.evaluate(() => { location.hash = 'pessoas'; });
        const sort = page.locator('#pessoas-content').getByRole('button', { name: 'Nome', exact: true });
        await sort.focus(); await page.keyboard.press('Enter');
        assert.equal(await sort.evaluate(el => el === document.activeElement), true);
        await page.setViewportSize({ width: 320, height: 900 });
        await page.evaluate(() => { location.hash = 'pagar'; });
        await page.locator('#pagar').waitFor({ state: 'visible' });
        assert.ok(await page.locator('.calendar-scroll').evaluate(el => el.scrollWidth > el.clientWidth));
        assert.ok(await page.locator('#p-cal .v').evaluateAll(values => values.every(el => el.getBoundingClientRect().right <= el.parentElement.getBoundingClientRect().right - 3)));
        await page.evaluate(() => { location.hash = 'receber'; });
        await page.locator('#r-titulos').getByRole('button', { name: 'Ver título', exact: true }).first().click();
        assert.ok(await page.getByRole('dialog').evaluate(el => {
          const rect = el.getBoundingClientRect(); return rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight;
        }));
        assert.ok(await page.getByRole('dialog').getByRole('heading', { name: 'Detalhes do título' }).evaluate(el => el.getBoundingClientRect().top >= 0));
        assert.equal(await page.getByRole('dialog').evaluate(el => el.scrollTop), 0);
        await page.screenshot({ path: resolve(output, `${theme}-320-dialog.png`) });
        await page.keyboard.press('Escape');
        await page.evaluate(() => { location.hash = 'fluxo'; });
        const touchChart = page.locator('#f-chart > svg');
        await touchChart.tap({ position: { x: 180, y: 100 } });
        assert.equal(await page.locator('#f-chart .chart-tip').getAttribute('data-visible'), 'true');
        assert.ok(await page.locator('#f-chart .chart-tip').evaluate(el => el.getBoundingClientRect().right <= innerWidth));
        await page.screenshot({ path: resolve(output, `${theme}-320-tooltip.png`) });
        await page.evaluate(() => { location.hash = 'dados'; });
        await page.locator('#d-fontes tr').first().getByRole('button', { name: 'Importar', exact: true }).click({ noWaitAfter: true });
        await page.locator('#d-file').setInputFiles({ name: 'interface.csv', mimeType: 'text/csv', buffer: Buffer.from('Conta;Tipo;Saldo;Data\nTeste de interface;Banco;1234,56;28/10/2026\n') });
        await page.locator('#d-map .map-summary').waitFor();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        assert.equal(await page.evaluate(() => localStorage.getItem('mn-fonte-contas')), null);
        await page.screenshot({ path: resolve(output, `${theme}-320-import.png`), fullPage: true });
        await page.locator('#d-map').getByRole('button', { name: 'Cancelar', exact: true }).click();
        await page.evaluate(() => { location.hash = 'configuracoes'; });
        await page.locator('#configuracoes-content').getByRole('button', { name: 'Sistema', exact: true }).click();
        assert.equal(await page.locator('html').getAttribute('data-theme'), null);
        await page.emulateMedia({ colorScheme: 'dark' });
        await page.waitForFunction(() => document.querySelector('meta[name="theme-color"]').content.toLowerCase() === '#151412');
        await page.emulateMedia({ colorScheme: 'light' });
        await page.waitForFunction(() => document.querySelector('meta[name="theme-color"]').content.toLowerCase() === '#f5f3ee');

        // Fontes externas indisponíveis e preferência de texto maior não podem esconder valores.
        const reading = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
        await reading.route(/fonts\.(googleapis|gstatic)\.com/, request => request.abort());
        await reading.addInitScript(theme => localStorage.setItem('mn-tema', theme), theme);
        await reading.goto(url);
        await reading.locator('#app-loading').waitFor({ state: 'hidden' });
        for (const [width, fontSize] of [[1280, '125%'], [390, '100%'], [320, '100%']]) {
          await reading.setViewportSize({ width, height: 900 });
          await reading.evaluate(size => { document.documentElement.style.fontSize = size; }, fontSize);
          await reading.evaluate(() => new Promise(requestAnimationFrame));
          for (const route of routes) {
            await reading.evaluate(route => { location.hash = route; }, route);
            await reading.locator('#' + route).waitFor({ state: 'visible' });
            const stress = await reading.locator('#' + route).evaluate(view => ({
              overflow: document.documentElement.scrollWidth > innerWidth,
              money: [...view.querySelectorAll('.kpi-value,.account-balance')].filter(el => el.getClientRects().length && el.scrollWidth > el.clientWidth + 1).map(el => el.textContent),
              menu: innerWidth > 900 ? [...document.querySelectorAll('.side .branched-menu__label')].filter(el => el.getClientRects().length && el.getBoundingClientRect().height > el.closest('a,button').getBoundingClientRect().height + 1).map(el => el.textContent) : []
            }));
            assert.equal(stress.overflow, false, `${theme}/${width}/${fontSize}/${route}: fallback overflow`);
            assert.deepEqual(stress.money, [], `${theme}/${width}/${fontSize}/${route}: fallback money`);
            assert.deepEqual(stress.menu, [], `${theme}/${width}/${fontSize}/${route}: enlarged menu`);
            report.stress.push({ theme, width, fontSize, route, ...stress });
          }
        }
        await reading.close();
      }
      await page.close();
    }
    assert.deepEqual(report.errors, []);
    if (phase === 'after') {
      const before = JSON.parse(readFileSync(resolve(root, 'test-results/visual-before/report.json'), 'utf8'));
      assert.equal(report.combinations.length, 140);
      for (const current of report.combinations) {
        const old = before.combinations.find(old => old.theme === current.theme && old.width === current.width && old.route === current.route);
        assert.deepEqual(current.numbers, old.numbers, `${current.route}: valores financeiros alterados`);
        assert.deepEqual(current.chartValues, old.chartValues, `${current.route}: séries do gráfico alteradas`);
        assert.deepEqual(current.clippedMoney, [], `${current.route}/${current.width}: número cortado`);
        assert.deepEqual(current.lowContrast, [], `${current.route}/${current.width}: contraste insuficiente`);
        assert.ok(Math.abs(current.mobileHeaderGap) <= 1, `${current.route}/${current.width}: espaço vazio no cabeçalho móvel`);
      }
    }
    console.log(`${phase}: ${report.combinations.length} combinações de rota/tema/largura verificadas; 56 capturas.`);
    console.log(`Metadados: mínimo ${Math.min(...report.combinations.map(row => row.minMetadataSize))}px; ${report.combinations.reduce((sum, row) => sum + row.lowContrast.length, 0)} ocorrências de baixo contraste.`);
    if (report.stress.length) console.log(`${report.stress.length} verificações adicionais sem Google Fonts, incluindo texto ampliado a 125%.`);
  } finally {
    writeFileSync(resolve(output, 'report.json'), JSON.stringify(report, null, 2));
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
