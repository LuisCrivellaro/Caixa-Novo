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
  for (const key of ['titulos_consulta', 'contas_consulta', 'movimentos_consulta', 'resultado_mes']) for (const row of get(key)) {
    for (const [name, value] of Object.entries(row)) if (name.endsWith('_centavos')) assert.ok(Number.isSafeInteger(value), `${key}.${name}`);
  }
});
