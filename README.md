# Caixa Novo

Painel interno de caixa da **Mundo Novo**, distribuidora de frutas em Rondonópolis (MT). Feito para o dono e o financeiro responderem, em poucos segundos, quanto há em caixa hoje, o que entra e sai nos próximos dias, quem está atrasado e se a gaveta fechou certa.

> **Repositório público, dados de exemplo.** Todos os números em `dados/` são inventados, gerados por `scripts/gerar_dados.py`. Os dados reais importados pela tela Importar dados ficam só no navegador de quem importou e nunca entram no repositório. Não faça commit de planilhas, extratos ou cadastros reais.

## Telas

| Tela | O que mostra |
| --- | --- |
| Visão geral | Saldo de hoje por conta, saldo projetado em 90 dias, alertas, prazos médios e o que vence nos próximos 7 dias |
| Fluxo de caixa | Entradas e saídas por dia, semana ou mês, realizado e previsto, e o resumo por categoria |
| A receber | Carteira em aberto, idade dos títulos, formas de pagamento, nota de pagador e lista de clientes |
| A pagar | Calendário de pagamentos, categorias, títulos em aberto e abatimentos de produtores |
| Fechamento | Gaveta do dia, diferenças dos últimos 30 fechamentos e histórico |
| Lançamentos | Tudo o que entrou e saiu, com busca, filtros e ordenação |
| Indicadores | Faturamento, ticket médio, margem estimada, ciclo financeiro, capital de giro e inadimplência |
| Conciliação | Confere o extrato do banco com os lançamentos |
| Importar dados | Troca os dados de exemplo pelos reais |

Funciona no computador e no celular, com tema claro e escuro.

## Ferramentas

- **Resumo do dia:** monta um texto curto com saldo, movimento do dia, vencimentos da semana, vencidos e diferença de gaveta, para copiar ou abrir direto no WhatsApp.
- **Nota de pagador:** classifica cada cliente pelos títulos que venceram nos últimos 180 dias, sem contar cartão.
  - *Paga em dia:* 90% ou mais pagos até 2 dias depois do vencimento e nenhum atraso acima de 15 dias.
  - *Costuma atrasar:* menos de 75% em dia com atraso médio de 5 dias ou mais, ou algum atraso acima de 60 dias.
  - *Sem histórico:* menos de 3 títulos no período.
  - Os critérios ficam no cálculo `pagadores`, em `assets/js/calculos.js`.
- **Conciliação bancária:** importa o extrato de uma conta (OFX, CSV ou Excel) e confere cada linha com os lançamentos. Uma linha bate quando o valor é igual ao centavo e a data fica a até 3 dias de diferença. Separa o que bateu, o que só está no extrato e o que só está no sistema. Há um extrato de exemplo para testar.
- **Importar dados:** troca os dados de exemplo pelos reais, uma fonte por vez, a partir de Excel ou CSV. O painel sugere qual coluna vai em cada campo e mostra um exemplo do que leu. Também informa quantas linhas não deram para ler, e só aplica depois da conferência. Cada fonte pode voltar ao exemplo.

Para ler Excel, o painel carrega o [SheetJS](https://sheetjs.com) 0.18.5 do cdnjs na primeira importação de um `.xlsx`. CSV e OFX são lidos sem nada externo.

## Como rodar

O site lê os arquivos de `dados/` com `fetch`, então precisa de um servidor local. Abrir o `index.html` direto no navegador não carrega os dados.

- **VS Code com Live Server:** instale a extensão recomendada, clique com o botão direito em `index.html` e escolha *Open with Live Server*.
- **Node:** `npm run dev` e abra http://localhost:5173
- **Python:** `python -m http.server 5173` e abra http://localhost:5173

Outros comandos:

```bash
npm run dados          # gera de novo os dados de exemplo
npm run arquivo-unico  # gera dist/caixa-novo.html, o site inteiro num só arquivo
```

## Estrutura

```
index.html                        telas e textos fixos
assets/css/styles.css             cores, fontes, caixas e versão de celular
assets/js/calculos.js             todos os cálculos do caixa
assets/js/app.js                  carga dos dados, telas, filtros e ferramentas
assets/js/charts.js               gráficos em SVG (taste-skill, licença MIT)
assets/img/                       logo
dados/*.json                      dados de exemplo
scripts/gerar_dados.py            gera os dados de exemplo
scripts/montar_arquivo_unico.py   monta dist/caixa-novo.html
CLAUDE.md                         regras do projeto para o Claude Code
```

HTML, CSS e JavaScript puros, sem framework e sem etapa de build.

## Regras do projeto

- Todo valor em dinheiro é guardado e somado em **centavos inteiros** (`*_centavos`). Só vira reais na hora de mostrar.
- As telas nunca leem os arquivos de dados diretamente. Elas pedem os resultados aos cálculos de `calculos.js`, e só os cálculos leem as fontes.
- "Hoje" no painel é a data do saldo em `dados/contas.json` (`data_saldo`).
- O saldo mínimo de referência (R$ 120.000,00) é uma premissa, na constante `SALDO_MINIMO` do cálculo `resumo`.
- Número positivo em verde, negativo em vermelho, zero sem cor. A exceção é o valor vencido, que fica vermelho por ser atraso.
- Importação nunca aplica sem a conferência de colunas. Dados importados ficam no `localStorage`, na chave `mn-fonte-<fonte>`.

## Formato dos dados

| Arquivo | Uma linha é | Campos principais |
| --- | --- | --- |
| `contas.json` | uma conta | `conta`, `tipo`, `saldo_centavos`, `data_saldo` |
| `clientes.json` | um cliente | `id`, `nome`, `tipo`, `rota`, `vendedor`, `limite_centavos` |
| `receber.json` | uma parcela a receber | `id`, `pedido`, `cliente_id`, `cliente`, `forma`, `adquirente`, `emissao`, `vencimento`, `valor_centavos`, `pago_em` |
| `pagar.json` | uma parcela a pagar | `id`, `fornecedor`, `categoria`, `documento`, `emissao`, `vencimento`, `valor_centavos`, `abatimento_centavos`, `motivo_abatimento`, `pago_em` |
| `lancamentos.json` | uma entrada ou saída realizada | `id`, `data`, `tipo` (`entrada` ou `saida`), `categoria`, `conta`, `forma`, `valor_centavos` |
| `fechamentos.json` | um fechamento de gaveta | `data`, `responsavel`, valores da gaveta e das vendas por forma, `contado_centavos` |

Datas no formato `AAAA-MM-DD`. `pago_em` vazio (`null`) quer dizer em aberto. Compras de produtores devem usar a categoria `Compra de frutas` para entrar no prazo médio de pagamento e na margem.

## Visual

- **Cores da marca:** laranja do logo `#FE7D01`, usado no bloco do logo, na faixa de destaque das frases principais e nas barras da carteira a receber.
- **Cores dos números:** verde `#3D6B1F` para o que entra e vermelho `#B4342D` para o que sai, com tons próprios no tema escuro.
- **Fontes:** Red Hat Display nos títulos e números grandes e Red Hat Text no resto. A Birthstone aparece só na frase "Rondonópolis, há 35 anos".
- **Base de design:** regras de tela de trabalho da taste-skill e piso de qualidade da impeccable.

## Próximos passos

1. Importar as planilhas reais pela tela Importar dados, ou ligar uma fonte fixa (ERP ou planilha online) na carga do início de `app.js`.
2. Lançamento manual e baixa de títulos.
3. Logo oficial em PNG ou SVG (o atual foi recriado a partir de uma imagem).
