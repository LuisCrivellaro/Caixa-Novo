# Caixa Novo

Painel interno de caixa da Mundo Novo, distribuidora de frutas em Rondonópolis. Uso do dono e do financeiro.

> Este repositório é público e traz só dados de exemplo, inventados. Os dados reais importados pela tela Importar dados ficam no navegador de quem importou e nunca entram no repositório. Não faça commit de planilhas ou extratos reais.

Telas: visão geral, fluxo de caixa, a receber, a pagar, lançamentos, contas financeiras, fechamento de caixa, clientes e fornecedores, indicadores, relatórios, conciliação bancária e importar dados. Funciona no computador, no tablet e no celular, com tema claro e escuro. A arquitetura das telas está em `docs/FRONTEND_ARCHITECTURE.md`.

Os dados em `dados/` são **de exemplo**, gerados por `scripts/gerar_dados.py`. Nenhum número é real ainda.

## Ferramentas

- **Resumo do dia** (Visão geral): monta um texto curto com saldo, movimento do dia, vencimentos da semana, vencidos e diferença de gaveta. Dá para copiar ou abrir direto no WhatsApp.
- **Nota de pagador** (A receber): classifica cada cliente pelos títulos que venceram nos últimos 180 dias, sem cartão. Paga em dia: 90% ou mais pagos até 2 dias depois do vencimento e nenhum atraso acima de 15 dias. Costuma atrasar: menos de 75% em dia com atraso médio de 5 dias ou mais, ou algum atraso acima de 60 dias. Sem histórico: menos de 3 títulos. Os critérios ficam no cálculo `pagadores`, em `calculos.js`.
- **Conciliação bancária**: importa o extrato (OFX, CSV ou Excel) de uma conta e confere cada linha com os lançamentos. Bate quando o valor é igual ao centavo e a data fica a até 3 dias de diferença. Mostra o que bateu, o que só está no extrato e o que só está no sistema. Há um extrato de exemplo para testar.
- **Contas financeiras**: saldo de cada conta e o extrato dela, com busca, filtros e download em CSV.
- **Clientes e fornecedores**: lista com filtros e uma ficha com os títulos em aberto e os últimos recebimentos ou pagamentos.
- **Relatórios**: nove relatórios em CSV (lançamentos, extrato, títulos a receber e a pagar, fluxo por dia, fechamentos, categorias, clientes e fornecedores) para um período escolhido. Separador ponto e vírgula e vírgula decimal, como o Excel em português espera.
- **Importar dados**: troca os dados de exemplo pelos reais, uma fonte por vez, a partir de Excel ou CSV. O painel sugere qual coluna do arquivo vai em cada campo, mostra um exemplo lido e quantas linhas não deram para ler, e só aplica depois da conferência. Os dados importados ficam guardados no navegador (localStorage) e cada fonte pode voltar ao exemplo.

Para ler Excel, o painel carrega o SheetJS 0.18.5 do cdnjs na primeira vez que alguém importa um .xlsx. CSV e OFX são lidos sem nada externo.

## Rodar no VS Code

O site lê os arquivos de `dados/` com `fetch`, então precisa de um servidor local. Abrir o `index.html` direto no navegador não carrega os dados.

Escolha um dos caminhos:

- **Live Server:** instale a extensão recomendada (o VS Code oferece ao abrir a pasta), clique com o botão direito em `index.html` e escolha "Open with Live Server".
- **Terminal, com Node instalado:** `npm run dev` e abra http://localhost:5173.
- **Terminal, só com Python:** `python -m http.server 5173` e abra http://localhost:5173.

## Estrutura

```
index.html                 telas e textos fixos
assets/css/styles.css      cores, fontes, caixas e versão de celular
assets/js/calculos.js      todos os cálculos do caixa
assets/js/app.js           carga dos dados, rotas, telas e filtros
assets/js/charts.js        gráficos em SVG (da taste-skill, licença MIT)
assets/img/                logo
dados/*.json               dados de exemplo
scripts/gerar_dados.py     gera os dados de exemplo
scripts/montar_arquivo_unico.py   gera dist/caixa-novo.html, tudo num arquivo
```

## Regras do projeto

- Todo valor em dinheiro é guardado e somado em **centavos inteiros** (`valor_centavos`). Só vira reais na hora de mostrar.
- As telas nunca leem os arquivos de dados diretamente. Elas pedem os resultados aos cálculos de `calculos.js`, e os cálculos leem as fontes. Para trocar os dados de exemplo pelos reais (planilha, ERP), mude só a carga no início de `app.js` e mantenha as mesmas colunas.
- "Hoje" no painel é a data do saldo em `dados/contas.json` (`data_saldo`).
- O saldo mínimo de referência (R$ 120.000,00) é uma premissa. Fica em `calculos.js`, no cálculo `resumo`, na constante `SALDO_MINIMO`.

## Formato dos dados

| Arquivo | Uma linha é | Campos principais |
| --- | --- | --- |
| `contas.json` | uma conta | `conta`, `tipo`, `saldo_centavos`, `data_saldo` |
| `clientes.json` | um cliente | `id`, `nome`, `tipo`, `rota`, `vendedor`, `limite_centavos` |
| `receber.json` | uma parcela a receber | `id`, `pedido`, `cliente_id`, `forma`, `adquirente`, `emissao`, `vencimento`, `valor_centavos`, `pago_em` |
| `pagar.json` | uma parcela a pagar | `id`, `fornecedor`, `categoria`, `documento`, `emissao`, `vencimento`, `valor_centavos`, `abatimento_centavos`, `motivo_abatimento`, `pago_em` |
| `lancamentos.json` | uma entrada ou saída realizada | `id`, `data`, `tipo` (`entrada` ou `saida`), `categoria`, `conta`, `forma`, `valor_centavos` |
| `fechamentos.json` | um fechamento de gaveta | `data`, `responsavel`, valores da gaveta e das vendas por forma, `contado_centavos` |

Datas no formato `AAAA-MM-DD`. `pago_em` vazio (`null`) quer dizer em aberto.

## Visual

- Cores da marca: laranja do logo `#FE7D01`, laranja para gráficos e textos `#B85605` (claro) e `#FF9A3D` (escuro), verde para o que entra.
- Fontes: Red Hat Display nos títulos e números grandes, Red Hat Text no resto, Birthstone só na frase "Rondonópolis, há 35 anos".
- Fundo bege claro `#F5F3EE`, caixas brancas com borda fina e sombra quase imperceptível, sidebar em `#F0EEE8`. Verde para o que entra, vermelho para o que sai, laranja só na faixa de destaque e no item ativo do menu.
- Cor nos dados e não no menu, números alinhados à direita com algarismos de largura fixa, sem gradientes.

## Próximos passos

1. Importar as planilhas reais pela tela Importar dados, ou trocar a carga no início de `app.js` por uma fonte fixa (ERP, planilha online).
2. Lançamento manual, baixa de pagamento e recebimento, e transferência entre contas. Precisam de um sistema que grave os dados; o painel hoje só lê.
3. Logo oficial em PNG ou SVG (o atual foi recriado a partir de uma imagem).
