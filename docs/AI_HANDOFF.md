# Continuidade: reformulação simplificada do Caixa Novo

## Objetivo

Reformular produto, navegação e interface para o dono da distribuidora decidir rápido: menos informação, sem repetição, detalhes só sob demanda. Regras financeiras, cálculos, dados de exemplo, importações e exportações continuam iguais. O pedido completo está na conversa de 26/11/2026; o resumo operacional é este arquivo.

## Branch e estado

- Branch: `reformulacao-simplificada` (criada a partir de `main` em `bde503a`). Não fazer merge na main sem autorização.
- Remoto: `https://github.com/LuisCrivellaro/Caixa-Novo.git`.
- Último checkpoint: ver `git log -1` nesta branch.

## Etapas

Todas as etapas planejadas estão concluídas (sessão de 26/11/2026, checkpoints `c91f4f0`, `ac33808` e o commit de documentação seguinte).

| # | Etapa | Estado |
| --- | --- | --- |
| 1 | Analisar arquitetura, rotas, dados e testes | concluída |
| 2 | Menu lateral plano com 6 páginas | concluída |
| 3 | Visão geral e Fluxo de caixa | concluída |
| 4 | Contas a receber e Contas a pagar | concluída |
| 5 | Tesouraria (abas Contas, Movimentações, Fechamento, Conciliação) | concluída |
| 6 | Resultados e Configurações (abas Dados, Categorias, Aparência) | concluída |
| 7 | Limpeza visual e remoção de código morto | concluída |
| 8 | Testes: `npm run check`, `npm test` (17), `npm run test:browser` (15 grupos, com HTML único), `npm run build` | concluída |
| 9 | Validar telas claro/escuro (capturas de `test:browser` em `test-results/`) | concluída |
| 10 | Atualizar README, `docs/FRONTEND_ARCHITECTURE.md` e `CLAUDE.md` | concluída |

## Mapa do código atual (para não reanalisar)

- `index.html`: telas `#geral`, `#fluxo`, `#receber`, `#pagar`, `#tesouraria`, `#resultados`, `#configuracoes`. Abas são `nav.subnav a[data-sub]` e painéis `[data-panel]`. Menu montado em `[data-menu]` (sidebar e `#sheet`); tema `[data-theme-set]` só em `#s-aparencia`; barra `#data-banner` com `#data-origin` e `#workspace-date`.
- `assets/js/workspace.js`: `criarWorkspace({ get, posicao, origem, irPara })` com `renderTitulos(tipo)`, `renderClientes`, `renderFornecedores`, `renderContas`, `renderMovimentos`, `renderCategorias`, `renderFlowTable`, `filtrarConta`, `filtrarTitulos`, `filtrarClientes`, `reiniciar`.
- `assets/js/app.js`: carga, `get(id)` com cache, `kpi`/`kpiM` (marca "Fontes mistas" via `fontesDe`), `renderGeral`, `renderFluxo`, `renderReceber`, `renderPagar`, `renderTesouraria`, `renderResultados`, `renderConfig`, importação, conciliação, roteador (`VIEWS`, `NOMES`, `SUBS`, `ALIAS`, `route()`), tema e menu móvel.
- `assets/js/ui.js`: `CaixaUI.dataTable` com `advanced`, `options`, `default`, `order`, `searchKeys`, `emptyText`, `onOpen`, colunas `action` e `className` (`csv-only`).
- `assets/js/calculos.js`: além dos anteriores, `titulos_resumo`, `fornecedores_resumo` e `resultados_mensais` (com testes).
- `tests/browser.cjs`: aceita `PW_CHANNEL` (ex.: `msedge`) quando o Chromium do Playwright não está instalado; nesta máquina só há o Edge.
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

- `tests/visual.cjs` compara com `test-results/visual-before` (não versionado, anterior à reformulação) e falha depois de qualquer mudança de conteúdo; serve só para gerar capturas.
- A porta 5173 desta máquina é usada por outro projeto; `.claude/launch.json` serve na 5180.
- O Playwright não tem o Chromium baixado nesta máquina; rode `PW_CHANNEL=msedge npm run test:browser` ou instale com `npx playwright install chromium`.
- `#receber/vencidos` e `#receber/limite` reaplicam o filtro sempre que a rota é redesenhada com esse endereço aberto (por exemplo quando o tema do sistema muda); pode desfazer um filtro que a pessoa trocou depois de seguir o atalho.

## Próxima ação exata

Nenhuma etapa pendente. A branch está pronta para revisão do dono. Não fazer merge na main sem autorização. Se houver pedido de ajuste, aplicar nesta branch, rodar `npm run check`, `npm test`, `PW_CHANNEL=msedge npm run test:browser` e `npm run build`, e fazer commit e push aqui.
