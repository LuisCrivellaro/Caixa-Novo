# Continuidade: reformulação simplificada do Caixa Novo

## Objetivo

Reformular produto, navegação e interface para o dono da distribuidora decidir rápido: menos informação, sem repetição, detalhes só sob demanda. Regras financeiras, cálculos, dados de exemplo, importações e exportações continuam iguais. O pedido completo está na conversa de 26/11/2026; o resumo operacional é este arquivo.

## Branch e estado

- Branch: `reformulacao-simplificada` (criada a partir de `main` em `bde503a`). Não fazer merge na main sem autorização.
- Remoto: `https://github.com/LuisCrivellaro/Caixa-Novo.git`.
- Último checkpoint: ver `git log -1` nesta branch.

## Etapas

| # | Etapa | Estado |
| --- | --- | --- |
| 1 | Analisar arquitetura, rotas, dados e testes | concluída |
| 2 | Menu lateral plano com 6 páginas | em andamento (ver "Estado do checkpoint") |
| 3 | Visão geral e Fluxo de caixa | pendente |
| 4 | Contas a receber e Contas a pagar | pendente |
| 5 | Tesouraria (abas Contas, Movimentações, Fechamento, Conciliação) | pendente |
| 6 | Resultados e Configurações (abas Dados, Categorias, Aparência) | pendente |
| 7 | Limpeza visual e remoção de código morto | pendente |
| 8 | Atualizar testes (`tests/browser.cjs`, `tests/flow-browser.cjs`, `tests/calculos.test.cjs`), rodar `npm run check`, `npm test`, `npm run test:browser`, `npm run build` | pendente |
| 9 | Validar telas claro/escuro (capturas por `tests/visual.cjs after`, que compara com uma linha de base antiga e falha no fim de propósito) | pendente |
| 10 | Atualizar README, `docs/FRONTEND_ARCHITECTURE.md` e `CLAUDE.md` | pendente |

## Mapa do código atual (para não reanalisar)

- `index.html`: telas estáticas `#geral`, `#fluxo`, `#receber`, `#pagar`, `#fechamento`, `#lancamentos`, `#indicadores`, `#conciliacao`, `#dados`. Sidebar com `[data-branched-menu]`, rodapé com Configurações e botões `[data-theme-set]`.
- `assets/js/workspace.js`: cria em tempo de execução `#contas`, `#pessoas`, `#categorias`, `#relatorios`, `#configuracoes`; `mountTitles` injeta a tabela de títulos em receber/pagar; `renderFlowTable` injeta `#f-details` no fluxo.
- `assets/js/app.js`: carga das fontes, `get(id)` com cache, formatação, render de cada tela, importação (`FONTES_DEF`, `painelMapeamento`), conciliação, roteador (`VIEWS`, `NOMES`, `route()`), tema (`aplicarTema`), menu mobile.
- `assets/js/ui.js`: `CaixaUI.dataTable` (pesquisa, filtros select, datas, ordenação, 15 por página, CSV de todos os filtrados), `dialog`, `badge`, `downloadCSV`, `notify`.
- `assets/components/navigation.jsx`: monta BranchedMenu (seções expansíveis com ramos SVG) em `.side` e `#sheet`; ponte `window.CaixaMenu.setActive/setReceivableCount`.
- `assets/js/calculos.js`: consultas declarativas. Úteis: `resumo` (saldo_disponivel, receber_aberto, pagar_aberto, vencidos_valor/qtd, receber_7_dias, pagar_7_dias, pagar_30_dias, prazos, clientes_acima_limite, ultimo_fechamento_diferenca, saldo_minimo), `projecao`, `projecao_marcos`, `fluxo`, `fluxo_resumo`, `fluxo_comparacao`, `titulos_consulta`, `contas_consulta`, `movimentos_consulta`, `pessoas_consulta`, `categorias_consulta`, `devedores`, `pagadores`, `indicadores`, `despesas_categoria`, `fechamento_dias`, `fechamento_itens`.
- Dados de exemplo: lançamentos de 30/07 a 28/10/2026; receber emitido desde 29/05; posição 28/10/2026.

## Decisões de desenho (aplicar sem reabrir)

1. **Menu**: lista plana sem grupos, ramos ou rolagem: Visão geral (`geral`), Fluxo de caixa (`fluxo`), Contas a receber (`receber`), Contas a pagar (`pagar`), Tesouraria (`tesouraria`), Resultados (`resultados`). Configurações fica no rodapé da sidebar. Substituir BranchedMenu por um menu simples em `navigation.jsx` (mantém Hugeicons, badge de vencidos e a ponte `CaixaMenu`) e apagar `assets/components/BranchedMenu/`. O bundle mantém o nome `assets/generated/branched-menu.*` para não mexer no empacotamento.
2. **Sidebar**: remover o bloco da empresa (repete a barra superior) e os botões de tema (vão para Configurações > Aparência; os botões `[data-theme-set]` passam a viver lá).
3. **Barra de contexto**: fundir `workspace-bar` e `data-banner` em uma linha só: origem dos dados (`#data-origin`, com link para `#configuracoes/dados`) e "Posição de dd/mm/aaaa · sem atualização em tempo real".
4. **Fontes mistas**: quando houver fontes importadas e de exemplo ao mesmo tempo, indicadores cujos cálculos dependem dos dois tipos recebem a marca "Fontes mistas". As fontes de cada cálculo saem de `CALCULOS[id].inputs`, resolvidos recursivamente.
5. **Visão geral**: 4 indicadores (Saldo disponível, Total a receber, Total a pagar, Saldo projetado em 30 dias); gráfico de saldo projetado de 90 dias com linha do mínimo. Não há evolução passada: o projeto proíbe reconstruir saldos a partir do extrato. Alertas ordenados por gravidade (saldo abaixo do mínimo, pagamentos vencidos, recebimentos vencidos, pagamentos em 7 dias, diferença de gaveta, clientes acima do limite), no máximo 3 visíveis e botão "Ver mais". Sai: frase de achado, segunda faixa de indicadores, abas do gráfico, card "Vence em 7 dias" e botão Importar. Fica o botão Resumo do dia.
6. **Fluxo**: seletor de período; 3 indicadores (Entradas, Saídas, Resultado) do período atual, marcando "parcial até dd/mm" e "vs. <período> anterior completo"; gráfico principal; "Por categoria" e "Por período" (tabela com CSV) em abas dentro de um bloco recolhido.
7. **Contas a receber**: abas Títulos e Clientes. 3 indicadores: Em aberto, Vencido, A vencer em 7 dias. Tabela de títulos com Cliente, Vencimento, Valor em aberto e Situação; padrão "Em aberto", vencidos primeiro e depois por vencimento. Visíveis: pesquisa, situação e período; "Mais filtros" recolhido (forma, vendedor, rota). Clique na linha abre os detalhes do título (documento, parcela, forma, vendedor, rota, limite, nota de pagador). A aba Clientes junta devedores, pagadores e clientes. `#receber/vencidos` filtra títulos vencidos; `#receber/limite` abre Clientes acima do limite.
8. **Contas a pagar**: abas Títulos e Fornecedores. Mesmos 3 indicadores; tabela com Fornecedor, Vencimento, Valor a pagar e Situação; detalhes com documento, categoria, abatimento e motivo. Saem o calendário, os títulos em aberto duplicados e os abatimentos.
9. **Tesouraria** (`#tesouraria/<aba>`): Contas (lista compacta com saldo e "Ver movimentações"), Movimentações (dataTable de `movimentos_consulta`, filtros tipo/conta/período e mais filtros categoria/forma, CSV), Fechamento (tabela Dia/Esperado/Contado/Diferença; clique abre os itens da gaveta), Conciliação (fluxo atual). Uma aba visível por vez.
10. **Resultados**: Faturamento 30 dias, Margem bruta estimada (marcada como estimativa por usar compras, não CMV), Despesas operacionais 30 dias e Inadimplência; gráfico mensal Faturamento × Despesas operacionais (novo cálculo `resultados_mensais`, só meses cobertos pelos lançamentos, mês atual parcial) e lista de despesas por categoria; "Indicadores complementares" recolhido (ticket, faturamento por cliente, ciclo, capital de giro, comissões, prazos médios).
11. **Configurações** (`#configuracoes/<aba>`): Dados (origem, posição, importação e conferência atuais), Categorias (dataTable), Aparência (tema).
12. **Rotas antigas** redirecionam: `fechamento` → `tesouraria/fechamento`, `lancamentos` → `tesouraria/movimentacoes`, `contas` → `tesouraria/contas`, `conciliacao` → `tesouraria/conciliacao`, `indicadores` → `resultados`, `dados` → `configuracoes/dados`, `categorias` → `configuracoes/categorias`, `pessoas` → `receber/clientes`, `relatorios` → `geral`.
13. **Novos cálculos** em `calculos.js`, com teste: `titulos_resumo` (por tipo: aberto, vencido, quantidade vencida e a vencer em 7 dias, em centavos, iguais aos do `resumo`), `fornecedores_resumo` e `resultados_mensais`.
14. `CaixaUI.dataTable` ganha `advanced` (filtros recolhidos), `options` por filtro (rótulo e predicado), ordenação inicial e coluna de ação (`action: true` abre detalhes). Isso não pode quebrar o uso atual.

## Problemas conhecidos

- `tests/visual.cjs` compara com `test-results/visual-before` (não versionado) e falha depois de qualquer mudança de conteúdo; serve só para gerar capturas.
- A porta 5173 desta máquina é usada por outro projeto; `.claude/launch.json` serve na 5180.

## Estado do checkpoint (26/11/2026, interrompido em 83% da janela de 5 horas)

**O app está quebrado nesta branch até `app.js` ser adaptado.** Já feito:

- `assets/components/navigation.jsx`: menu plano com 6 links (`.nav a[data-view]`, Hugeicons, badge `.nav-count` em receber), montado em `[data-menu]`; ponte `CaixaMenu.setActive/setReceivableCount` mantida. Falta apagar `assets/components/BranchedMenu/` (não é mais importado).
- `index.html` reescrito com as telas `geral`, `fluxo`, `receber`, `pagar`, `tesouraria`, `resultados` e `configuracoes`. Abas internas são links `nav.subnav a[data-sub]` com hash `#<tela>/<aba>`; os painéis são `[data-panel="<aba>"]` (mostrar um, `hidden` nos outros). Os botões de tema `[data-theme-set]` ficam só em Configurações > Aparência. A barra `#data-banner` tem `#data-origin`, o link para `#configuracoes/dados` e `#workspace-date`.
- `assets/js/ui.js`: `dataTable` aceita `advanced` (filtros em `<details>` "Mais filtros"), `options` com `test` por filtro, `default`, `order` (ordenação inicial), `searchKeys`, `emptyText`, `onOpen` e colunas `action` (abre detalhe) e `className` (aplicada em `th` e `td`; `csv-only` precisa de CSS `display:none`).
- `assets/js/calculos.js`: novos `titulos_resumo`, `fornecedores_resumo` e `resultados_mensais`; `titulos_consulta` ganhou parcela, pedido, cliente_id, vendedor, rota e adquirente. Ainda sem testes.
- `assets/js/workspace.js` reescrito: `criarWorkspace({ get, posicao, origem, irPara })` devolve `renderTitulos(tipo)`, `renderClientes()`, `renderFornecedores()`, `renderContas(abrirConta)`, `renderMovimentos()`, `renderCategorias()`, `renderFlowTable(rows, grao)`, `filtrarConta(conta)`, `filtrarTitulos(tipo, filters)`, `filtrarClientes(filters)` e `reiniciar()`. `irPara(hash)` deve fazer `location.hash = hash`.

### Falta em `assets/js/app.js` (próximo passo)

1. `renderGeral`: `#g-strip` com 4 KPIs (`resumo.saldo_disponivel`, `receber_aberto` com +, `pagar_aberto` com −, `projecao_marcos` 30). Gráfico `Charts.line` em `#g-chart` (o mesmo código do antigo `drawGeralChart`, aba saldo) e `#g-chart-meta` com "Próximos 90 dias · mínimo R$ …". Alertas por gravidade em `#g-alerts` (3 visíveis; `#g-alerts-more` mostra o resto; `#g-alert-count` com o total). Pagamentos vencidos vêm de `titulos_resumo`. Remover `ktabs`, `#g-finding`, `#g-secondary`, `vencimentos_7d`, `#g-stamp` e `drawGeralChart` com abas.
2. `renderFluxo`: `#f-strip` com 3 KPIs de `fluxo_resumo` (sub: "vs. <período> anterior: x%"); `#f-finding` em uma frase ("Semana atual, 26/10 a 28/10, parcial até a posição; comparação com a semana anterior completa."); `#f-chart-note` curto ("Previsto, mais claro, vem dos títulos em aberto."). Seg `[data-f-tab]` alterna `[data-f-panel]`. Mantém `#f-cat`, `#f-cat-current/previous/period` e `workspace.renderFlowTable`.
3. `renderReceber`: `#r-strip` com Em aberto, Vencido (com quantidade) e A vencer em 7 dias, de `titulos_resumo`; `workspace.renderTitulos('A receber')` e `renderClientes()`. Apagar `rState`, `drawClientes`, `drawCartao`, `NOTA_PILL` e os listeners `#r-*`.
4. `renderPagar`: igual, com `renderFornecedores()`. Apagar o calendário, `drawPagarAbertos`, `pAll` e `#p-more`.
5. `renderTesouraria`: `workspace.renderContas(conta => { workspace.filtrarConta(conta); irPara('tesouraria/movimentacoes') })`, `renderMovimentos()`, fechamento (`#c-lista` com Dia, Esperado, Contado e Diferença; clique no dia abre `CaixaUI.dialog` com os itens de `fechamento_itens`; `#c-finding` "x de y bateram no centavo"; `#c-empty`) e `renderConc()`. Apagar a tela de lançamentos (`lState`, `renderLanc`, `drawLanc`, listeners `#l-*`) e `drawFechDia`/`#c-dia`.
6. `renderResultados`: `#i-strip` com Faturamento 30 dias, Margem bruta estimada (sub "Estimativa: compras, não custo das vendas"), Despesas operacionais 30 dias (soma de `despesas_categoria`, com −) e Inadimplência; `Charts.diverging` em `#i-chart` com `resultados_mensais` (up faturamento, down despesas, `partial` no mês parcial, legenda em `#i-legend`); `barList` em `#i-desp`; `#i-extra` (kv) com ticket médio, faturamento por cliente, ciclo financeiro, capital de giro, comissões em 30 dias e prazos médios de `resumo`.
7. `renderConfig`: `renderDados()` atual (renomear destino `#d-*`), `#d-sobre` (kv: origem, posição, "Os dados não são atualizados em tempo real", "Cadastros, baixas e estornos dependem de um sistema com gravação") e `workspace.renderCategorias()`.
8. Roteador: `VIEWS = { geral, fluxo, receber, pagar, tesouraria, resultados, configuracoes }`; `NOMES` com os títulos novos; `ALIAS` das rotas antigas (decisão 12); subaba padrão (receber → titulos, pagar → titulos, tesouraria → contas, configuracoes → dados); mostrar `[data-panel]` e marcar `aria-current` em `.subnav a`; `#receber/vencidos` aplica `filtrarTitulos('A receber', { situacao: 'Vencido' })`; `#receber/limite` aplica `filtrarClientes({ situacao_cliente: 'limite' })` e abre a aba clientes. Re-renderizar a tela a cada rota (as tabelas preservam estado).
9. Marca "Fontes mistas": função `fontesDe(id)` sobre `CALCULOS[id].inputs` e um `kpi(..., { calc: ['resumo'] })` que acrescenta `.pill pill-warn` "Fontes mistas" quando houver fonte importada e de exemplo entre as dependências.
10. `recarregar()`: limpar cache, `workspace.reiniciar()` e redesenhar. `aplicarTema` e o ouvinte de `prefers-color-scheme` redesenham só a tela atual.
11. Menu mobile: os seletores de foco continuam valendo (`#sheet`); remover a referência a `[data-theme-set]` do teste de foco.

### Depois disso

CSS (`.nav` sem grupos e com ícones de 18px, `.subnav`, `.accounts`, `.disclosure`, `.more-filters-wrap`, `.csv-only{display:none}`, `.kpis`, `.detail-sub`), apagar CSS morto (`.notas`, `.cal*`, `.ktab*`, `.split`, `.list`, `.dashboard-*`, `.account-*`, `.workspace-bar`, `.company`, `.caixa-menu`), regenerar o bundle (`npm run build:menu`), reescrever os testes de navegador para as novas rotas e testar os cálculos novos. Por fim, as etapas 8 a 10.

## Próxima ação exata

Abrir `assets/js/app.js` e executar a lista "Falta em app.js" acima, na ordem. Depois rodar `npm run check`, abrir o app (`npx --yes serve@14 -l 5180 .`) e seguir as etapas 7 a 10. Fazer commit e push nesta branch ao fim de cada etapa.
