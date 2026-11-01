const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const root = join(__dirname, '..');
const context = { window: {} };
vm.runInNewContext(readFileSync(join(root, 'assets/js/calculos.js'), 'utf8'), context);
const calcs = context.window.CALCULOS;
const sources = Object.fromEntries(['contas', 'clientes', 'pagar', 'receber', 'lancamentos', 'fechamentos'].map(n => [n, JSON.parse(readFileSync(join(root, 'dados', n + '.json'), 'utf8'))]));
const get = (id, data = sources) => id in data ? data[id] : calcs[id].fn(...calcs[id].inputs.map(n => get(n, data)));
const fixture = () => ({ contas: [{ conta: 'Caixa', saldo_centavos: 12345, data_saldo: '2026-10-31', tipo: 'Caixa físico' }], clientes: [{ id: 'C1', nome: 'Cliente', limite_centavos: 100000 }], pagar: [], receber: [], lancamentos: [], fechamentos: [] });

test('todas as consultas financeiras aceitam as fontes de exemplo sem NaN', () => {
  for (const key of Object.keys(calcs)) {
    const rows = get(key);
    assert.ok(Array.isArray(rows), key);
    for (const row of rows) for (const value of Object.values(row)) if (typeof value === 'number') assert.ok(Number.isFinite(value), key);
  }
});
test('saldo exibido corresponde exatamente ao saldo informado, sem somar movimentos', () => {
  const data = fixture(); data.lancamentos.push({ data: '2026-10-31', tipo: 'entrada', valor_centavos: 10000 });
  assert.equal(get('contas_consulta', data)[0].saldo_centavos, 12345);
  assert.equal(get('resumo', data).find(r => r.metrica === 'saldo_disponivel').valor, 123.45);
});
test('resultado mensal soma centavos, limita período e exclui transferências', () => {
  const data = fixture();
  data.lancamentos = [
    { data: '2026-10-01', tipo: 'entrada', valor_centavos: 10 },
    { data: '2026-10-31', tipo: 'entrada', valor_centavos: 20 },
    { data: '2026-10-31', tipo: 'saida', valor_centavos: 5 },
    { data: '2026-10-31', tipo: 'transferencia', valor_centavos: 100000 },
    { data: '2026-09-30', tipo: 'entrada', valor_centavos: 90000 },
    { data: '2026-11-01', tipo: 'entrada', valor_centavos: 90000 },
  ];
  assert.equal(get('resultado_mes', data)[0].valor_centavos, 25);
});
test('título líquido respeita abatimento e situação usa a posição da fonte', () => {
  const data = fixture();
  data.pagar = [{ id: 'P1', fornecedor: 'Fornecedor', vencimento: '2026-10-30', valor_centavos: 10005, abatimento_centavos: 6, pago_em: null }];
  const row = get('titulos_consulta', data)[0];
  assert.equal(row.liquido_centavos, 9999); assert.equal(row.situacao, 'Vencido');
  data.pagar[0].pago_em = '2026-10-31';
  assert.equal(get('titulos_consulta', data)[0].situacao, 'Pago');
});
test('recebido, vence hoje e a vencer são diferenciados sem alterar a fonte', () => {
  const data = fixture();
  data.receber = ['2026-10-30', '2026-10-31', '2026-11-01'].map((vencimento, i) => ({ id: 'R' + i, cliente_id: 'C1', vencimento, valor_centavos: 101, pago_em: i === 0 ? '2026-10-31' : null }));
  const before = JSON.stringify(data);
  assert.equal(get('titulos_consulta', data).map(r => r.situacao).join(','), 'Recebido,Vence hoje,A vencer');
  assert.equal(JSON.stringify(data), before);
});
test('consultas aceitam listas vazias e mantêm contas existentes', () => {
  const data = fixture();
  for (const key of ['titulos_consulta', 'pessoas_consulta', 'categorias_consulta', 'movimentos_consulta']) assert.ok(Array.isArray(get(key, data)));
  assert.equal(get('titulos_consulta', data).length, 0);
  assert.equal(get('resultado_mes', data)[0].valor_centavos, 0);
});
test('clientes e fornecedores não são duplicados por título', () => {
  const data = fixture(); data.pagar = [{ fornecedor: 'Fornecedor' }, { fornecedor: 'Fornecedor' }];
  const rows = get('pessoas_consulta', data);
  assert.equal(rows.length, 2);
  assert.equal(rows.find(r => r.tipo === 'Fornecedor').limite_centavos, null);
});
test('consultas monetárias novas preservam centavos inteiros', () => {
  for (const key of ['titulos_consulta', 'contas_consulta', 'movimentos_consulta', 'resultado_mes', 'fluxo', 'fluxo_resumo', 'fluxo_comparacao']) for (const row of get(key)) {
    for (const [name, value] of Object.entries(row)) if (name.endsWith('_centavos')) assert.ok(Number.isSafeInteger(value), `${key}.${name}`);
  }
});

test('dia, semana, mês e ano sincronizam totais e categorias sem misturar tipos ou movimentos futuros', () => {
  const data = fixture(); data.contas[0].data_saldo = '2026-10-28';
  const movimento = (data, tipo, valor_centavos) => ({ data, tipo, valor_centavos, categoria: 'Categoria compartilhada' });
  data.lancamentos = [
    movimento('2024-12-31', 'entrada', 8000), movimento('2025-10-28', 'entrada', 700),
    movimento('2026-09-30', 'entrada', 110), movimento('2026-09-30', 'saida', 30),
    movimento('2026-10-19', 'entrada', 210), movimento('2026-10-19', 'saida', 40),
    movimento('2026-10-25', 'entrada', 310), movimento('2026-10-26', 'entrada', 410),
    movimento('2026-10-27', 'entrada', 510), movimento('2026-10-27', 'saida', 20),
    movimento('2026-10-28', 'entrada', 610), movimento('2026-10-28', 'saida', 70),
    movimento('2026-10-28', 'transferencia', 999000), movimento('2026-10-29', 'entrada', 999000)
  ];
  const before = JSON.stringify(data);
  const expected = { dia: [610, 70, 510, 20], semana: [1530, 90, 520, 40], mes: [2050, 130, 110, 30], ano: [2160, 160, 700, 0] };
  const categories = get('fluxo_comparacao', data);
  for (const row of get('fluxo_resumo', data)) {
    const [entrada, saida, anteriorEntrada, anteriorSaida] = expected[row.grao];
    assert.equal(row.entradas_centavos, entrada, row.grao);
    assert.equal(row.saidas_centavos, saida, row.grao);
    assert.equal(row.resultado_centavos, entrada - saida, row.grao);
    assert.equal(row.entradas_anterior_centavos, anteriorEntrada, row.grao);
    assert.equal(row.saidas_anterior_centavos, anteriorSaida, row.grao);
    assert.equal(row.variacao_entradas, (entrada - anteriorEntrada) / anteriorEntrada);
    assert.equal(categories.filter(c => c.grao === row.grao).length, 2);
    assert.equal(categories.find(c => c.grao === row.grao && c.tipo === 'entrada').atual_centavos, entrada);
    assert.equal(categories.find(c => c.grao === row.grao && c.tipo === 'saida').atual_centavos, saida);
  }
  assert.equal(JSON.stringify(data), before);
});

test('agrupamento anual preserva histórico e separa previsão, com abatimentos e horizonte de 60 dias', () => {
  const data = fixture(); data.contas[0].data_saldo = '2026-12-15';
  data.lancamentos = [
    { data: '2025-12-31', tipo: 'entrada', valor_centavos: 100 },
    { data: '2026-12-15', tipo: 'entrada', valor_centavos: 200 },
    { data: '2026-12-16', tipo: 'entrada', valor_centavos: 90000 },
    { data: '2026-12-15', tipo: 'transferencia', valor_centavos: 90000 }
  ];
  data.receber = [
    { vencimento: '2026-12-16', valor_centavos: 101 },
    { vencimento: '2027-01-01', valor_centavos: 202 },
    { vencimento: '2027-02-13', valor_centavos: 303 },
    { vencimento: '2027-02-14', valor_centavos: 90000 },
    { vencimento: '2026-12-15', valor_centavos: 90000 },
    { vencimento: '2027-01-01', valor_centavos: 90000, pago_em: '2026-12-14' }
  ];
  data.pagar = [{ vencimento: '2027-01-01', valor_centavos: 10005, abatimento_centavos: 6 }];
  const rows = get('fluxo', data);
  for (const grao of ['dia', 'semana', 'mes', 'ano']) {
    const sum = (natureza, key) => rows.filter(row => row.grao === grao && row.natureza === natureza).reduce((total, row) => total + row[key], 0);
    assert.equal(sum('realizado', 'entradas_centavos'), 300, grao);
    assert.equal(sum('previsto', 'entradas_centavos'), 606, grao);
    assert.equal(sum('previsto', 'saidas_centavos'), 9999, grao);
  }
  assert.equal(rows.find(row => row.grao === 'ano' && row.periodo === '2025-01-01').entradas_centavos, 100);
  assert.equal(rows.find(row => row.grao === 'ano' && row.periodo === '2027-01-01').entradas_centavos, 505);
});

test('períodos respeitam segunda-feira, virada de ano e fevereiro bissexto', () => {
  const data = fixture(); data.contas[0].data_saldo = '2027-01-03';
  const rows = get('fluxo_resumo', data);
  const semana = rows.find(row => row.grao === 'semana');
  assert.equal(semana.inicio, '2026-12-28'); assert.equal(semana.fim, '2027-01-03');
  assert.equal(semana.anterior_inicio, '2026-12-21'); assert.equal(semana.anterior_fim, '2026-12-27');
  assert.equal(rows.find(row => row.grao === 'mes').anterior_inicio, '2026-12-01');
  assert.equal(rows.find(row => row.grao === 'ano').anterior_fim, '2026-12-31');
  data.contas[0].data_saldo = '2024-03-01';
  const mes = get('fluxo_resumo', data).find(row => row.grao === 'mes');
  assert.equal(mes.anterior_inicio, '2024-02-01'); assert.equal(mes.anterior_fim, '2024-02-29');
});

test('resumo vazio tem quatro períodos e não inventa variação sem base', () => {
  const data = fixture();
  const rows = get('fluxo_resumo', data);
  assert.equal(rows.length, 4); assert.equal(get('fluxo', data).length, 0);
  assert.equal(get('fluxo_comparacao', data).length, 0);
  for (const row of rows) {
    assert.equal(row.entradas_centavos, 0); assert.equal(row.saidas_centavos, 0);
    assert.equal(row.resultado_centavos, 0); assert.equal(row.variacao_entradas, null);
    assert.equal(row.variacao_saidas, null); assert.equal(row.variacao_resultado, null);
  }
});

test('variação do resultado preserva direção quando o período anterior é negativo', () => {
  const data = fixture();
  data.lancamentos = [
    { data: '2026-09-30', tipo: 'saida', valor_centavos: 100 },
    { data: '2026-10-31', tipo: 'entrada', valor_centavos: 100 }
  ];
  const mes = get('fluxo_resumo', data).find(row => row.grao === 'mes');
  assert.equal(mes.resultado_anterior_centavos, -100);
  assert.equal(mes.resultado_centavos, 100);
  assert.equal(mes.variacao_resultado, 2);
});
