const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

module.exports = async function checkFlow(browser, url, root) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, hasTouch: true, acceptDownloads: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const data = Object.fromEntries(['contas', 'clientes', 'receber', 'pagar', 'lancamentos', 'fechamentos'].map(name => [name, JSON.parse(readFileSync(resolve(root, 'dados', name + '.json'), 'utf8'))]));
  const cents = text => (text.includes('−') ? -1 : 1) * Number(text.replace(/[^0-9]/g, ''));
  const selected = () => page.getByRole('radio', { checked: true });
  const choose = async label => { await page.getByRole('radio', { name: label, exact: true }).click(); };
  try {
    await page.goto(url + '/#fluxo');
    await page.locator('#app-loading').waitFor({ state: 'hidden' });
    assert.equal(await selected().innerText(), 'Semana');
    const ranges = {
      Dia: ['dia', '2026-10-28', '2026-10-27', '2026-10-27'],
      Semana: ['semana', '2026-10-26', '2026-10-19', '2026-10-25'],
      Mês: ['mes', '2026-10-01', '2026-09-01', '2026-09-30'],
      Ano: ['ano', '2026-01-01', '2025-01-01', '2025-12-31']
    };
    assert.equal(data.contas[0].data_saldo, '2026-10-28', 'atualizar intervalos esperados se a posição dos exemplos mudar');
    const chartStates = new Set();
    const summaryStates = new Set();
    for (const [label, [grao, inicio, anteriorInicio, anteriorFim]] of Object.entries(ranges)) {
      await choose(label);
      assert.equal(await selected().innerText(), label);
      assert.equal(await page.locator('#fluxo').getAttribute('data-periodo'), grao);
      const inRange = (from, to) => data.lancamentos.filter(row => row.data >= from && row.data <= to && ['entrada', 'saida'].includes(row.tipo));
      const current = inRange(inicio, '2026-10-28');
      const previous = inRange(anteriorInicio, anteriorFim);
      const sum = (rows, tipo) => rows.filter(row => row.tipo === tipo).reduce((total, row) => total + row.valor_centavos, 0);
      const entry = sum(current, 'entrada'), exit = sum(current, 'saida');
      assert.deepEqual(await page.locator('#f-finding strong').allTextContents().then(values => values.map(cents)), [entry, -exit]);
      assert.equal(cents(await page.locator('#f-finding .band').innerText()), entry - exit);
      assert.equal(await page.locator('#f-cat-current').innerText(), label + ' atual');
      assert.equal(await page.locator('#f-cat-previous').innerText(), label + ' anterior');
      const expectedCategories = new Map();
      for (const [rows, key] of [[current, 'current'], [previous, 'previous']]) for (const row of rows) {
        const id = JSON.stringify([row.categoria || 'Sem categoria', row.tipo]);
        if (!expectedCategories.has(id)) expectedCategories.set(id, { current: 0, previous: 0 });
        expectedCategories.get(id)[key] += row.valor_centavos;
      }
      const rows = page.locator('#f-cat tr');
      assert.equal(await rows.count(), expectedCategories.size);
      for (let i = 0; i < await rows.count(); i++) {
        const row = rows.nth(i), tipo = await row.locator('.sub').innerText();
        const expected = expectedCategories.get(JSON.stringify([await row.locator('b').innerText(), tipo === 'Entrada' ? 'entrada' : 'saida']));
        const direction = tipo === 'Entrada' ? 1 : -1;
        assert.equal(cents(await row.locator('td').nth(1).innerText()), direction * expected.current || 0);
        assert.equal(cents(await row.locator('td').nth(2).innerText()), direction * expected.previous || 0);
      }
      const chart = await page.locator('#f-chart title').allTextContents();
      assert.ok(chart.length > 0);
      chartStates.add(JSON.stringify(chart)); summaryStates.add(await page.locator('#f-finding').innerText());
      assert.ok((await page.locator('#f-details tbody tr td:nth-child(2)').allTextContents()).every(text => text === grao));
      assert.match(await page.locator('#f-chart-note').innerText(), new RegExp('por ' + grao.replace('mes', 'mês')));
    }
    assert.equal(chartStates.size, 4); assert.equal(summaryStates.size, 4);
    await choose('Semana');
    const table = page.locator('#f-details');
    await table.getByRole('searchbox').fill('realizado');
    await table.getByRole('combobox', { name: 'Natureza', exact: true }).selectOption('realizado');
    await table.getByRole('combobox', { name: 'Agrupamento', exact: true }).selectOption('semana');
    await table.locator('input[type=date]').first().fill('2026-01-01');
    await table.getByRole('button', { name: 'Entradas', exact: true }).click();
    await choose('Ano');
    assert.equal(await table.getByRole('searchbox').inputValue(), 'realizado');
    assert.equal(await table.getByRole('combobox', { name: 'Natureza', exact: true }).inputValue(), 'realizado');
    assert.equal(await table.getByRole('combobox', { name: 'Agrupamento', exact: true }).inputValue(), 'ano');
    assert.equal(await table.locator('input[type=date]').first().inputValue(), '2026-01-01');
    assert.equal(await table.locator('th[aria-sort=ascending]').count(), 1);
    const downloadPromise = page.waitForEvent('download');
    await table.getByRole('button', { name: 'Exportar CSV' }).click();
    const csv = readFileSync(await (await downloadPromise).path(), 'utf8');
    assert.match(csv, /ano/); assert.doesNotMatch(csv, /semana|previsto/);
    await table.getByRole('button', { name: 'Limpar', exact: true }).click();
    await selected().focus(); await page.keyboard.press('Home');
    assert.equal(await selected().innerText(), 'Dia');
    await page.keyboard.press('ArrowRight'); assert.equal(await selected().innerText(), 'Semana');
    await page.keyboard.press('End'); assert.equal(await selected().innerText(), 'Ano');
    await page.getByRole('radio', { name: 'Mês', exact: true }).focus(); await page.keyboard.press('Space');
    assert.equal(await selected().innerText(), 'Mês');
    await choose('Semana');
    await page.waitForFunction(() => {
      const track = document.querySelector('.rubber-segment');
      const radio = track.querySelector('[aria-checked=true]').getBoundingClientRect();
      const rect = track.getBoundingClientRect();
      const edges = getComputedStyle(track.querySelector('.rubber-segment__thumb')).clipPath.split('round')[0].match(/[\d.]+/g)?.map(Number);
      return edges && Math.abs(edges[3] - (radio.left - rect.left - 3)) < .6 && Math.abs(edges[1] - (rect.right - radio.right - 3)) < .6;
    });
    const from = await selected().boundingBox(), to = await page.getByRole('radio', { name: 'Ano', exact: true }).boundingBox();
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2); await page.mouse.down();
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 }); await page.mouse.up();
    assert.equal(await selected().innerText(), 'Ano');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      for (const label of Object.keys(ranges)) {
        await page.getByRole('radio', { name: label, exact: true }).tap();
        assert.equal(await selected().innerText(), label);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        assert.ok(await page.locator('#f-period').evaluate(el => {
          const rect = el.getBoundingClientRect(), header = el.parentElement.getBoundingClientRect();
          return rect.left >= header.left && rect.right <= header.right + 1 && Math.abs(rect.right - header.right) <= 1;
        }));
      }
    }
    await page.locator('.topbar').getByRole('button', { name: 'Abrir menu' }).click();
    await page.locator('#sheet [data-theme-set=dark]').click(); await page.keyboard.press('Escape');
    await choose('Semana');
    await page.screenshot({ path: resolve(root, 'test-results/flow-mobile.png'), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({ path: resolve(root, 'test-results/flow-desktop.png'), fullPage: true });
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
};
