// Cálculos do caixa. Regra do projeto: todo valor é somado em centavos inteiros e só vira reais na saída.
// Cada cálculo declara as fontes de que depende (inputs) e devolve linhas simples. app.js resolve a ordem.
window.CALCULOS = {};
const dash = { calc: (id, o) => { window.CALCULOS[id] = o; } };

dash.calc('resumo', {
  title: 'Resumo do caixa',
  description: 'Saldo, entradas e saídas do dia e do mês, vencimentos, vencidos, prazos médios, limite de crédito, último fechamento e o saldo mínimo de referência (R$ 120.000,00).',
  inputs: ['contas', 'lancamentos', 'receber', 'pagar', 'clientes', 'fechamentos'],
  fn: (contas, lancamentos, receber, pagar, clientes, fechamentos) => {
    const SALDO_MINIMO = 12000000; // em centavos: premissa do painel, troque aqui
    const hoje = contas[0].data_saldo;
    const somar = (rs, f) => rs.reduce((s, r) => s + Number(f(r)), 0);
    const mais = (iso, n) => new Date(Date.parse(iso) + n * 864e5).toISOString().slice(0, 10);
    const dias = (a, b) => Math.round((Date.parse(a) - Date.parse(b)) / 864e5);
    const mes = hoje.slice(0, 7);
    const fimAnt = new Date(Date.parse(mes + '-01') - 864e5);
    const mesAnt = fimAnt.toISOString().slice(0, 7);
    const diaAnt = mesAnt + '-' + String(Math.min(Number(hoje.slice(8, 10)), fimAnt.getUTCDate())).padStart(2, '0');
    const mov = (tipo, de, ate) => somar(lancamentos.filter((r) => r.tipo === tipo && r.data >= de && r.data <= ate), (r) => r.valor_centavos);
    const abR = receber.filter((r) => !r.pago_em);
    const abP = pagar.filter((r) => !r.pago_em);
    const liq = (r) => Number(r.valor_centavos) - Number(r.abatimento_centavos);
    const vencidos = abR.filter((r) => r.vencimento < hoje);
    const ini90 = mais(hoje, -90);
    const prazo = (rs) => {
      const total = somar(rs, (r) => r.valor_centavos);
      return total ? somar(rs, (r) => Number(r.valor_centavos) * dias(r.vencimento, r.emissao)) / total : 0;
    };
    const pmr = Math.round(prazo(receber.filter((r) => r.emissao >= ini90)));
    const pmp = Math.round(prazo(pagar.filter((r) => r.emissao >= ini90 && r.categoria === 'Compra de frutas')));
    const exposicao = {};
    abR.forEach((r) => { exposicao[r.cliente_id] = (exposicao[r.cliente_id] || 0) + Number(r.valor_centavos); });
    const acima = clientes.filter((c) => (exposicao[c.id] || 0) > Number(c.limite_centavos)).length;
    const ultimo = fechamentos.reduce((a, f) => (!a || f.data > a.data ? f : a), null);
    const esperado = (f) => Number(f.abertura_centavos) + Number(f.suprimentos_centavos) + Number(f.dinheiro_balcao_centavos) + Number(f.acerto_motoristas_centavos) - Number(f.sangrias_centavos);
    const entMes = mov('entrada', mes + '-01', hoje);
    const saiMes = mov('saida', mes + '-01', hoje);
    const entAnt = mov('entrada', mesAnt + '-01', diaAnt);
    const saiAnt = mov('saida', mesAnt + '-01', diaAnt);
    const reais = (c) => c / 100;
    return [
      { metrica: 'saldo_disponivel', valor: reais(somar(contas, (c) => c.saldo_centavos)), texto: hoje },
      { metrica: 'saldo_minimo', valor: reais(SALDO_MINIMO), texto: null },
      { metrica: 'entradas_hoje', valor: reais(mov('entrada', hoje, hoje)), texto: null },
      { metrica: 'saidas_hoje', valor: reais(mov('saida', hoje, hoje)), texto: null },
      { metrica: 'entradas_mes', valor: reais(entMes), texto: null },
      { metrica: 'saidas_mes', valor: reais(saiMes), texto: null },
      { metrica: 'variacao_entradas', valor: entAnt ? entMes / entAnt - 1 : null, texto: null },
      { metrica: 'variacao_saidas', valor: saiAnt ? saiMes / saiAnt - 1 : null, texto: null },
      { metrica: 'receber_7_dias', valor: reais(somar(abR.filter((r) => r.vencimento >= hoje && r.vencimento <= mais(hoje, 7)), (r) => r.valor_centavos)), texto: null },
      { metrica: 'pagar_7_dias', valor: reais(somar(abP.filter((r) => r.vencimento >= hoje && r.vencimento <= mais(hoje, 7)), liq)), texto: null },
      { metrica: 'pagar_30_dias', valor: reais(somar(abP.filter((r) => r.vencimento >= hoje && r.vencimento <= mais(hoje, 30)), liq)), texto: null },
      { metrica: 'receber_aberto', valor: reais(somar(abR, (r) => r.valor_centavos)), texto: null },
      { metrica: 'pagar_aberto', valor: reais(somar(abP, liq)), texto: null },
      { metrica: 'abatimentos_90_dias', valor: reais(somar(pagar.filter((r) => r.emissao >= ini90), (r) => r.abatimento_centavos)), texto: null },
      { metrica: 'vencidos_valor', valor: reais(somar(vencidos, (r) => r.valor_centavos)), texto: null },
      { metrica: 'vencidos_qtd', valor: vencidos.length, texto: null },
      { metrica: 'prazo_medio_recebimento', valor: pmr, texto: null },
      { metrica: 'prazo_medio_pagamento', valor: pmp, texto: null },
      { metrica: 'descasamento_prazos', valor: pmr - pmp, texto: null },
      { metrica: 'clientes_acima_limite', valor: acima, texto: null },
      { metrica: 'ultimo_fechamento_diferenca', valor: ultimo ? reais(Number(ultimo.contado_centavos) - esperado(ultimo)) : null, texto: ultimo ? ultimo.data : null },
    ];
  },
});

dash.calc('saldo_contas', {
  title: 'Saldo por conta',
  description: 'Saldo de hoje de cada conta, em reais.',
  inputs: ['contas'],
  fn: (contas) => contas.map((c) => ({ conta: c.conta, tipo: c.tipo, saldo: Number(c.saldo_centavos) / 100 })),
});

dash.calc('projecao', {
  title: 'Saldo projetado dia a dia',
  description: 'Saldo de hoje somado aos títulos em aberto a receber e a pagar, na data de vencimento, por 90 dias. Vencidos e vendas futuras não entram.',
  inputs: ['contas', 'receber', 'pagar'],
  fn: (contas, receber, pagar) => {
    const hoje = contas[0].data_saldo;
    const mais = (iso, n) => new Date(Date.parse(iso) + n * 864e5).toISOString().slice(0, 10);
    const entra = {};
    const sai = {};
    receber.filter((r) => !r.pago_em && r.vencimento >= hoje).forEach((r) => { entra[r.vencimento] = (entra[r.vencimento] || 0) + Number(r.valor_centavos); });
    pagar.filter((r) => !r.pago_em && r.vencimento >= hoje).forEach((r) => { sai[r.vencimento] = (sai[r.vencimento] || 0) + Number(r.valor_centavos) - Number(r.abatimento_centavos); });
    let saldo = contas.reduce((s, c) => s + Number(c.saldo_centavos), 0);
    const linhas = [];
    for (let i = 0; i <= 90; i++) {
      const dia = mais(hoje, i);
      const e = entra[dia] || 0;
      const s = sai[dia] || 0;
      saldo += e - s;
      linhas.push({ dia, entradas: e / 100, saidas: s / 100, saldo: saldo / 100 });
    }
    return linhas;
  },
});

dash.calc('projecao_marcos', {
  title: 'Marcos da projeção',
  description: 'Saldo projetado em 7, 30, 60 e 90 dias, o primeiro dia abaixo do saldo mínimo e o menor saldo do período.',
  inputs: ['projecao', 'resumo'],
  fn: (projecao, resumo) => {
    const minimo = resumo.find((r) => r.metrica === 'saldo_minimo').valor;
    const marcos = [7, 30, 60, 90].map((n) => ({ marco: String(n), dia: projecao[n].dia, saldo: projecao[n].saldo }));
    const abaixo = projecao.find((r) => r.saldo < minimo);
    const menor = projecao.reduce((a, r) => (r.saldo < a.saldo ? r : a), projecao[0]);
    return [
      ...marcos,
      { marco: 'minimo', dia: abaixo ? abaixo.dia : null, saldo: abaixo ? abaixo.saldo : null },
      { marco: 'menor', dia: menor.dia, saldo: menor.saldo },
    ];
  },
});

dash.calc('vencimentos_7d', {
  title: 'Vencimentos em 7 dias',
  description: 'Títulos em aberto a receber e a pagar que vencem de hoje até daqui a 7 dias.',
  inputs: ['contas', 'receber', 'pagar'],
  fn: (contas, receber, pagar) => {
    const hoje = contas[0].data_saldo;
    const ate = new Date(Date.parse(hoje) + 7 * 864e5).toISOString().slice(0, 10);
    const noPrazo = (r) => !r.pago_em && r.vencimento >= hoje && r.vencimento <= ate;
    const aReceber = receber.filter(noPrazo).map((r) => ({ id: r.id, sentido: 'A receber', contraparte: r.cliente, documento: r.forma + ' ' + r.parcela + ' do ' + r.pedido, vencimento: r.vencimento, valor: Number(r.valor_centavos) / 100 }));
    const aPagar = pagar.filter(noPrazo).map((r) => ({ id: r.id, sentido: 'A pagar', contraparte: r.fornecedor, documento: r.documento, vencimento: r.vencimento, valor: (Number(r.valor_centavos) - Number(r.abatimento_centavos)) / 100 }));
    return [...aReceber, ...aPagar].sort((a, b) => a.vencimento.localeCompare(b.vencimento) || b.valor - a.valor);
  },
});

dash.calc('fluxo', {
  title: 'Fluxo de caixa por período',
  description: 'Entradas e saídas realizadas por dia, semana e mês, e previstas pelos títulos em aberto nos próximos 60 dias.',
  inputs: ['contas', 'lancamentos', 'receber', 'pagar'],
  fn: (contas, lancamentos, receber, pagar) => {
    const hoje = contas[0].data_saldo;
    const fim = new Date(Date.parse(hoje) + 60 * 864e5).toISOString().slice(0, 10);
    const semana = (iso) => { const d = new Date(Date.parse(iso)); return new Date(d - ((d.getUTCDay() + 6) % 7) * 864e5).toISOString().slice(0, 10); };
    const soma = {};
    const add = (dia, natureza, e, s) => {
      for (const [grao, periodo] of [['dia', dia], ['semana', semana(dia)], ['mes', dia.slice(0, 7) + '-01']]) {
        const k = grao + '|' + periodo + '|' + natureza;
        const a = soma[k] || (soma[k] = { grao, periodo, natureza, entradas: 0, saidas: 0 });
        a.entradas += e;
        a.saidas += s;
      }
    };
    lancamentos.forEach((r) => add(r.data, 'realizado', r.tipo === 'entrada' ? Number(r.valor_centavos) : 0, r.tipo === 'saida' ? Number(r.valor_centavos) : 0));
    receber.filter((r) => !r.pago_em && r.vencimento > hoje && r.vencimento <= fim).forEach((r) => add(r.vencimento, 'previsto', Number(r.valor_centavos), 0));
    pagar.filter((r) => !r.pago_em && r.vencimento > hoje && r.vencimento <= fim).forEach((r) => add(r.vencimento, 'previsto', 0, Number(r.valor_centavos) - Number(r.abatimento_centavos)));
    return Object.values(soma)
      .map((a) => ({ grao: a.grao, periodo: a.periodo, natureza: a.natureza, entradas: a.entradas / 100, saidas: a.saidas / 100, liquido: (a.entradas - a.saidas) / 100 }))
      .sort((a, b) => a.periodo.localeCompare(b.periodo) || b.natureza.localeCompare(a.natureza));
  },
});

dash.calc('categorias', {
  title: 'Entradas e saídas por categoria',
  description: 'Realizado por categoria no mês atual até hoje e no mês anterior inteiro.',
  inputs: ['contas', 'lancamentos'],
  fn: (contas, lancamentos) => {
    const hoje = contas[0].data_saldo;
    const mes = hoje.slice(0, 7);
    const mesAnt = new Date(Date.parse(mes + '-01') - 864e5).toISOString().slice(0, 7);
    const soma = {};
    lancamentos.forEach((r) => {
      const m = r.data.slice(0, 7);
      if (m !== mes && m !== mesAnt) return;
      const a = soma[r.categoria] || (soma[r.categoria] = { categoria: r.categoria, tipo: r.tipo, atual: 0, anterior: 0 });
      if (m === mes) a.atual += Number(r.valor_centavos); else a.anterior += Number(r.valor_centavos);
    });
    return Object.values(soma)
      .map((a) => ({ categoria: a.categoria, tipo: a.tipo, mes_atual: a.atual / 100, mes_anterior: a.anterior / 100 }))
      .sort((a, b) => a.tipo.localeCompare(b.tipo) || b.mes_atual - a.mes_atual);
  },
});

dash.calc('aging', {
  title: 'Idade da carteira',
  description: 'Títulos a receber em aberto agrupados por dias de atraso na data de hoje.',
  inputs: ['contas', 'receber'],
  fn: (contas, receber) => {
    const hoje = contas[0].data_saldo;
    const faixas = ['A vencer', '1 a 15 dias', '16 a 30 dias', '31 a 60 dias', 'Mais de 60 dias'];
    const linhas = faixas.map((faixa, ordem) => ({ ordem, faixa, qtd: 0, centavos: 0 }));
    receber.filter((r) => !r.pago_em).forEach((r) => {
      const atraso = Math.round((Date.parse(hoje) - Date.parse(r.vencimento)) / 864e5);
      const i = atraso <= 0 ? 0 : atraso <= 15 ? 1 : atraso <= 30 ? 2 : atraso <= 60 ? 3 : 4;
      linhas[i].qtd += 1;
      linhas[i].centavos += Number(r.valor_centavos);
    });
    return linhas.map((l) => ({ ordem: l.ordem, faixa: l.faixa, qtd: l.qtd, valor: l.centavos / 100 }));
  },
});

dash.calc('devedores', {
  title: 'Clientes com saldo em aberto',
  description: 'Por cliente: vencido, a vencer, maior atraso em dias e uso do limite de crédito.',
  inputs: ['contas', 'receber', 'clientes'],
  fn: (contas, receber, clientes) => {
    const hoje = contas[0].data_saldo;
    const porCliente = {};
    receber.filter((r) => !r.pago_em).forEach((r) => {
      const a = porCliente[r.cliente_id] || (porCliente[r.cliente_id] = { vencido: 0, aVencer: 0, atraso: 0 });
      const atraso = Math.round((Date.parse(hoje) - Date.parse(r.vencimento)) / 864e5);
      if (atraso > 0) { a.vencido += Number(r.valor_centavos); a.atraso = Math.max(a.atraso, atraso); } else a.aVencer += Number(r.valor_centavos);
    });
    return clientes
      .filter((c) => porCliente[c.id])
      .map((c) => {
        const a = porCliente[c.id];
        const limite = Number(c.limite_centavos);
        return { cliente_id: c.id, cliente: c.nome, vendedor: c.vendedor, rota: c.rota, vencido: a.vencido / 100, a_vencer: a.aVencer / 100, maior_atraso: a.atraso, limite: limite / 100, uso_limite: limite ? (a.vencido + a.aVencer) / limite : null };
      })
      .sort((x, y) => y.vencido - x.vencido || y.uso_limite - x.uso_limite);
  },
});

dash.calc('receber_forma', {
  title: 'Em aberto por forma',
  description: 'Títulos a receber em aberto somados por forma de pagamento.',
  inputs: ['receber'],
  fn: (receber) => {
    const soma = {};
    receber.filter((r) => !r.pago_em).forEach((r) => {
      const a = soma[r.forma] || (soma[r.forma] = { forma: r.forma, qtd: 0, centavos: 0 });
      a.qtd += 1;
      a.centavos += Number(r.valor_centavos);
    });
    return Object.values(soma).map((a) => ({ forma: a.forma, qtd: a.qtd, aberto: a.centavos / 100 })).sort((a, b) => b.aberto - a.aberto);
  },
});

dash.calc('cartao_liquidacao', {
  title: 'Cartão a receber',
  description: 'Vendas em cartão ainda não repassadas, por adquirente e data de liquidação.',
  inputs: ['receber'],
  fn: (receber) => {
    const soma = {};
    receber.filter((r) => !r.pago_em && r.forma.startsWith('Cartão')).forEach((r) => {
      const k = r.adquirente + '|' + r.vencimento;
      const a = soma[k] || (soma[k] = { adquirente: r.adquirente, liquidacao: r.vencimento, qtd: 0, centavos: 0 });
      a.qtd += 1;
      a.centavos += Number(r.valor_centavos);
    });
    return Object.values(soma).map((a) => ({ adquirente: a.adquirente, liquidacao: a.liquidacao, qtd: a.qtd, valor: a.centavos / 100 })).sort((a, b) => a.liquidacao.localeCompare(b.liquidacao) || a.adquirente.localeCompare(b.adquirente));
  },
});

dash.calc('recebido_por', {
  title: 'Recebido no mês por vendedor e rota',
  description: 'Entradas do mês atual ligadas a clientes, somadas por vendedor e por rota.',
  inputs: ['contas', 'lancamentos'],
  fn: (contas, lancamentos) => {
    const mes = contas[0].data_saldo.slice(0, 7);
    const soma = {};
    lancamentos.filter((r) => r.tipo === 'entrada' && r.data.startsWith(mes) && r.vendedor).forEach((r) => {
      for (const [dimensao, nome] of [['vendedor', r.vendedor], ['rota', r.rota]]) {
        const k = dimensao + '|' + nome;
        const a = soma[k] || (soma[k] = { dimensao, nome, centavos: 0 });
        a.centavos += Number(r.valor_centavos);
      }
    });
    return Object.values(soma).map((a) => ({ dimensao: a.dimensao, nome: a.nome, valor: a.centavos / 100 })).sort((a, b) => b.valor - a.valor);
  },
});

dash.calc('pagar_dias', {
  title: 'Pagamentos por dia',
  description: 'Valor líquido a pagar em cada dia, da segunda-feira desta semana até cinco semanas depois.',
  inputs: ['contas', 'pagar'],
  fn: (contas, pagar) => {
    const hoje = contas[0].data_saldo;
    const d0 = new Date(Date.parse(hoje));
    const inicio = new Date(d0 - ((d0.getUTCDay() + 6) % 7) * 864e5);
    const soma = {};
    pagar.filter((r) => !r.pago_em).forEach((r) => {
      const a = soma[r.vencimento] || (soma[r.vencimento] = { qtd: 0, centavos: 0 });
      a.qtd += 1;
      a.centavos += Number(r.valor_centavos) - Number(r.abatimento_centavos);
    });
    const linhas = [];
    for (let i = 0; i < 35; i++) {
      const dia = new Date(+inicio + i * 864e5).toISOString().slice(0, 10);
      const a = dia >= hoje ? soma[dia] || { qtd: 0, centavos: 0 } : { qtd: 0, centavos: 0 };
      linhas.push({ dia, passado: dia < hoje, hoje: dia === hoje, qtd: a.qtd, valor: a.centavos / 100 });
    }
    return linhas;
  },
});

dash.calc('pagar_categoria', {
  title: 'A pagar em 30 dias por categoria',
  description: 'Valor líquido em aberto com vencimento de hoje até daqui a 30 dias, por categoria.',
  inputs: ['contas', 'pagar'],
  fn: (contas, pagar) => {
    const hoje = contas[0].data_saldo;
    const ate = new Date(Date.parse(hoje) + 30 * 864e5).toISOString().slice(0, 10);
    const soma = {};
    pagar.filter((r) => !r.pago_em && r.vencimento >= hoje && r.vencimento <= ate).forEach((r) => {
      const a = soma[r.categoria] || (soma[r.categoria] = { categoria: r.categoria, qtd: 0, centavos: 0 });
      a.qtd += 1;
      a.centavos += Number(r.valor_centavos) - Number(r.abatimento_centavos);
    });
    return Object.values(soma).map((a) => ({ categoria: a.categoria, qtd: a.qtd, valor: a.centavos / 100 })).sort((a, b) => b.valor - a.valor);
  },
});

dash.calc('pagar_abertos', {
  title: 'Títulos a pagar em aberto',
  description: 'Cada título a pagar ainda não baixado, com abatimento e situação na data de hoje.',
  inputs: ['contas', 'pagar'],
  fn: (contas, pagar) => {
    const hoje = contas[0].data_saldo;
    return pagar.filter((r) => !r.pago_em).map((r) => ({
      id: r.id, fornecedor: r.fornecedor, categoria: r.categoria, documento: r.documento, vencimento: r.vencimento,
      valor: Number(r.valor_centavos) / 100, abatimento: Number(r.abatimento_centavos) / 100,
      liquido: (Number(r.valor_centavos) - Number(r.abatimento_centavos)) / 100,
      situacao: r.vencimento < hoje ? 'Vencido' : r.vencimento === hoje ? 'Vence hoje' : 'A vencer',
    })).sort((a, b) => a.vencimento.localeCompare(b.vencimento) || b.liquido - a.liquido);
  },
});

dash.calc('abatimentos', {
  title: 'Abatimentos de fornecedor',
  description: 'Títulos emitidos nos últimos 90 dias com devolução, avaria ou bonificação descontada.',
  inputs: ['contas', 'pagar'],
  fn: (contas, pagar) => {
    const ini = new Date(Date.parse(contas[0].data_saldo) - 90 * 864e5).toISOString().slice(0, 10);
    return pagar.filter((r) => Number(r.abatimento_centavos) > 0 && r.emissao >= ini).map((r) => ({
      id: r.id, fornecedor: r.fornecedor, motivo: r.motivo_abatimento, documento: r.documento, vencimento: r.vencimento,
      situacao: r.pago_em ? 'Pago' : 'Em aberto', abatimento: Number(r.abatimento_centavos) / 100,
    })).sort((a, b) => b.vencimento.localeCompare(a.vencimento));
  },
});

dash.calc('fechamento_dias', {
  title: 'Fechamentos de caixa',
  description: 'Por dia: vendas, valor esperado na gaveta, valor contado e a diferença (contado menos esperado).',
  inputs: ['fechamentos'],
  fn: (fechamentos) => fechamentos.map((f) => {
    const n = (k) => Number(f[k]);
    const esperado = n('abertura_centavos') + n('suprimentos_centavos') + n('dinheiro_balcao_centavos') + n('acerto_motoristas_centavos') - n('sangrias_centavos');
    const vendas = n('dinheiro_balcao_centavos') + n('acerto_motoristas_centavos') + n('pix_centavos') + n('debito_centavos') + n('credito_centavos') + n('boleto_centavos') + n('cheque_centavos');
    return { data: f.data, responsavel: f.responsavel, vendas_total: vendas / 100, esperado: esperado / 100, contado: n('contado_centavos') / 100, diferenca: (n('contado_centavos') - esperado) / 100 };
  }).sort((a, b) => a.data.localeCompare(b.data)),
});

dash.calc('fechamento_itens', {
  title: 'Itens do fechamento',
  description: 'Cada linha do fechamento de um dia: movimentos da gaveta, esperado, contado, diferença e vendas que não passam pela gaveta.',
  inputs: ['fechamentos'],
  fn: (fechamentos) => {
    const linhas = [];
    fechamentos.forEach((f) => {
      const n = (k) => Number(f[k]);
      const esperado = n('abertura_centavos') + n('suprimentos_centavos') + n('dinheiro_balcao_centavos') + n('acerto_motoristas_centavos') - n('sangrias_centavos');
      const itens = [
        ['Abertura (troco)', n('abertura_centavos')], ['Suprimentos', n('suprimentos_centavos')], ['Dinheiro no balcão', n('dinheiro_balcao_centavos')],
        ['Acerto de motoristas', n('acerto_motoristas_centavos')], ['Sangrias para o banco', -n('sangrias_centavos')], ['Esperado na gaveta', esperado],
        ['Contado na gaveta', n('contado_centavos')], ['Diferença', n('contado_centavos') - esperado],
        ['Vendas em Pix', n('pix_centavos')], ['Vendas no débito', n('debito_centavos')], ['Vendas no crédito', n('credito_centavos')],
        ['Vendas em boleto', n('boleto_centavos')], ['Vendas em cheque', n('cheque_centavos')],
      ];
      itens.forEach(([item, c], ordem) => linhas.push({ data: f.data, ordem, item, valor: c / 100 }));
    });
    return linhas;
  },
});

dash.calc('lanc_view', {
  title: 'Lançamentos em reais',
  description: 'Os lançamentos realizados com o valor convertido de centavos para reais.',
  inputs: ['lancamentos'],
  fn: (lancamentos) => lancamentos.map((r) => ({
    id: r.id, data: r.data, tipo: r.tipo, categoria: r.categoria, descricao: r.descricao, contraparte: r.contraparte,
    conta: r.conta, forma: r.forma, vendedor: r.vendedor, rota: r.rota, valor: Number(r.valor_centavos) / 100,
  })),
});

dash.calc('indicadores', {
  title: 'Indicadores financeiros',
  description: 'Faturamento e tickets de 30 dias, margem bruta estimada por compras em 90 dias, ciclo financeiro, capital de giro, inadimplência e comissões a pagar.',
  inputs: ['contas', 'lancamentos', 'receber', 'pagar', 'resumo'],
  fn: (contas, lancamentos, receber, pagar, resumo) => {
    const hoje = contas[0].data_saldo;
    const desde = (n) => new Date(Date.parse(hoje) - n * 864e5).toISOString().slice(0, 10);
    const r = (m) => resumo.find((x) => x.metrica === m).valor;
    const vendas = (n) => {
      const ini = desde(n - 1);
      const prazo = receber.filter((x) => x.emissao >= ini && x.emissao <= hoje);
      const vista = lancamentos.filter((x) => x.categoria === 'Venda à vista' && x.data >= ini && x.data <= hoje);
      return {
        centavos: prazo.reduce((s, x) => s + Number(x.valor_centavos), 0) + vista.reduce((s, x) => s + Number(x.valor_centavos), 0),
        pedidos: new Set([...prazo.map((x) => x.pedido), ...vista.map((x) => x.origem)]).size,
        clientes: new Set([...prazo.map((x) => x.cliente), ...vista.map((x) => x.contraparte)]).size,
      };
    };
    const v30 = vendas(30);
    const v90 = vendas(90);
    const compras90 = pagar.filter((x) => x.categoria === 'Compra de frutas' && x.emissao >= desde(89)).reduce((s, x) => s + Number(x.valor_centavos), 0);
    const abertoR = receber.filter((x) => !x.pago_em).reduce((s, x) => s + Number(x.valor_centavos), 0);
    const vencido = receber.filter((x) => !x.pago_em && x.vencimento < hoje).reduce((s, x) => s + Number(x.valor_centavos), 0);
    const abertoFornec = pagar.filter((x) => !x.pago_em && x.categoria === 'Compra de frutas').reduce((s, x) => s + Number(x.valor_centavos) - Number(x.abatimento_centavos), 0);
    const comissoes = pagar.filter((x) => !x.pago_em && x.categoria === 'Comissão de vendedores' && x.vencimento <= desde(-30)).reduce((s, x) => s + Number(x.valor_centavos), 0);
    return [
      { indicador: 'faturamento_30d', valor: v30.centavos / 100 },
      { indicador: 'ticket_medio_pedido', valor: v30.pedidos ? Math.round(v30.centavos / v30.pedidos) / 100 : null },
      { indicador: 'ticket_medio_cliente', valor: v30.clientes ? Math.round(v30.centavos / v30.clientes) / 100 : null },
      { indicador: 'margem_bruta_estimada', valor: v90.centavos ? 1 - compras90 / v90.centavos : null },
      { indicador: 'ciclo_financeiro', valor: r('prazo_medio_recebimento') - r('prazo_medio_pagamento') },
      { indicador: 'capital_de_giro', valor: (abertoR - abertoFornec) / 100 },
      { indicador: 'inadimplencia', valor: abertoR ? vencido / abertoR : null },
      { indicador: 'comissoes_30d', valor: comissoes / 100 },
    ];
  },
});

dash.calc('despesas_categoria', {
  title: 'Despesas operacionais em 30 dias',
  description: 'Saídas realizadas nos últimos 30 dias por categoria, sem a compra de mercadoria.',
  inputs: ['contas', 'lancamentos'],
  fn: (contas, lancamentos) => {
    const hoje = contas[0].data_saldo;
    const ini = new Date(Date.parse(hoje) - 29 * 864e5).toISOString().slice(0, 10);
    const soma = {};
    lancamentos.filter((x) => x.tipo === 'saida' && x.categoria !== 'Compra de frutas' && x.data >= ini && x.data <= hoje).forEach((x) => {
      soma[x.categoria] = (soma[x.categoria] || 0) + Number(x.valor_centavos);
    });
    return Object.entries(soma).map(([categoria, c]) => ({ categoria, valor: c / 100 })).sort((a, b) => b.valor - a.valor);
  },
});

dash.calc('pagadores', {
  title: 'Nota de pagador por cliente',
  description: 'Histórico de pagamento de cada cliente nos títulos que venceram nos últimos 180 dias, sem cartão: parte paga em dia (até 2 dias de folga), atraso médio ponderado pelo valor e maior atraso.',
  inputs: ['contas', 'receber', 'clientes'],
  fn: (contas, receber, clientes) => {
    const hoje = contas[0].data_saldo;
    const ini = new Date(Date.parse(hoje) - 180 * 864e5).toISOString().slice(0, 10);
    const dias = (a, b) => Math.round((Date.parse(a) - Date.parse(b)) / 864e5);
    const FOLGA = 2;
    const por = {};
    receber.filter((r) => r.vencimento >= ini && r.vencimento <= hoje && !String(r.forma || '').startsWith('Cartão')).forEach((r) => {
      const a = por[r.cliente_id] || (por[r.cliente_id] = { n: 0, emDia: 0, centavos: 0, pond: 0, maior: 0 });
      const v = Number(r.valor_centavos);
      const atraso = Math.max(0, r.pago_em ? dias(r.pago_em, r.vencimento) : dias(hoje, r.vencimento));
      a.n += 1; a.centavos += v; a.pond += v * atraso; a.maior = Math.max(a.maior, atraso);
      if (atraso <= FOLGA) a.emDia += 1;
    });
    return clientes.map((c) => {
      const a = por[c.id];
      if (!a || a.n < 3) return { cliente_id: c.id, cliente: c.nome, titulos: a ? a.n : 0, em_dia: a ? a.emDia / a.n : null, atraso_medio: a && a.centavos ? Math.round(a.pond / a.centavos) : null, maior_atraso: a ? a.maior : null, nota: 'Sem histórico', ordem: 3 };
      const emDia = a.emDia / a.n;
      const medio = Math.round(a.pond / a.centavos);
      // Paga em dia: 90% ou mais em dia e nenhum atraso acima de 15 dias.
      // Costuma atrasar: menos de 75% em dia com atraso médio de 5 dias ou mais, ou algum atraso acima de 60 dias sem chegar a 90% em dia.
      let nota = 'Atrasa às vezes', ordem = 1;
      if (emDia >= 0.9 && a.maior <= 15) { nota = 'Paga em dia'; ordem = 0; }
      else if ((emDia < 0.75 && medio >= 5) || (a.maior > 60 && emDia < 0.9)) { nota = 'Costuma atrasar'; ordem = 2; }
      return { cliente_id: c.id, cliente: c.nome, titulos: a.n, em_dia: emDia, atraso_medio: medio, maior_atraso: a.maior, nota, ordem };
    });
  },
});
