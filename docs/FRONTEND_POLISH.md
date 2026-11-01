# Evolução visual do Caixa-Novo

Entrega local de 01/11/2026. Escopo: refinar a interface existente, mantendo a identidade, a hospedagem estática e o HTML único. As duas ilhas React já existentes foram preservadas; nenhuma tela foi migrada e nenhuma dependência foi acrescentada.

## Auditoria inicial

Foram lidos `CLAUDE.md`, `README.md`, a arquitetura, o HTML, os estilos e os módulos de interface, gráficos, navegação, importação, conciliação e cálculos. Antes das edições, foram executados `check`, os 13 testes financeiros e os 13 grupos de integração em Chromium; todos passaram. Uma cópia dos arquivos de origem foi guardada fora do repositório para comparar esta entrega com o estado efetivamente recebido, que já continha alterações de tarefas anteriores.

As 14 rotas foram capturadas nos temas claro e escuro. A auditoria verificou 1440, 1280, 768, 390 e 320px: 140 combinações, sem rolagem horizontal da página nos estados iniciais. As capturas revelaram problemas que essa verificação isolada não detectava.

| Prioridade | Local inicial | Problema verificado | Resultado |
| --- | --- | --- | --- |
| P1 | `assets/css/styles.css`, layout móvel de `.app` | Linhas automáticas do grid distribuíam espaço livre acima do conteúdo em rotas curtas | Linha superior com altura natural e conteúdo na linha flexível; não há faixa vazia após o menu |
| P1 | `assets/js/ui.js`, `dataTable.draw` | Reconstruir o cabeçalho ao ordenar removia o elemento com foco | Foco devolvido ao cabeçalho correspondente; ordenação e paginação preservadas |
| P1 | `assets/js/charts.js`, gráficos de linha e barras | Valores disponíveis por ponteiro/título nativo, sem consulta equivalente por teclado | Setas, Home, End, Escape e toque consultam os mesmos valores; foco preservado no redesenho |
| P1 | `assets/css/styles.css`, `.stamp` na Visão geral clara | Texto pequeno da posição com contraste medido de 4,32:1 | Uso do tom secundário existente; nenhuma ocorrência abaixo do limite da auditoria final |
| P1 | `#d-map`, conferência de importação em 320px | Conteúdo mínimo da tabela podia ampliar o grid e alargar a página | Coluna `minmax(0, 1fr)` e filhos que podem encolher; rolagem restrita ao contêiner |
| P2 | `.cal` em celular | Sete colunas estreitas cortavam valores compactos | Calendário com largura legível e rolagem interna, acessível por teclado, com orientação visível |
| P2 | Diálogos longos | Foco no controle inferior podia ocultar o início da janela | Título recebe foco inicial, rolagem começa no topo e há fechamento no cabeçalho |
| P2 | Componentes globais | Metadados de 10px e controles de alturas distintas | Escala auxiliar de 11–12px, tabelas de 13px, controles de 38px/44px e estados consistentes |
| P3 | Cabeçalhos e contas | Rótulos decorativos repetidos e superfícies aninhadas | Títulos diretos; contas financeiras com superfície própria sobre o fundo existente |

O detector de código do Impeccable apontou uma borda lateral colorida de 3px no aviso de origem. Ela foi reduzida a 1px, preservando o aviso, o texto e o destaque da marca. O scan final de `assets/` terminou com código 0 e nenhuma ocorrência. Esse resultado é um complemento à inspeção visual, não uma certificação de qualidade.

Avaliação qualitativa pelo roteiro de auditoria do Impeccable: inicial 13/20 (acessibilidade 2, desempenho 3, temas 3, responsividade 2, integridade de implementação 3); final 17/20 (3, 3, 4, 4, 3). A pontuação não representa uma certificação WCAG nem uma medição de Core Web Vitals.

## Design system e componentes

Permanecem as cores de fundo, superfícies, marca, ações, entradas e saídas especificadas no briefing. Nenhum token de cor do tema escuro foi substituído. Red Hat Display e Red Hat Text mantêm seus papéis; Birthstone aparece somente na frase institucional do rodapé. A sidebar continua com 224px.

Os novos tokens definem altura de controle, tamanhos auxiliares, borda de campo, hover de linha, foco e sombras. Eles são derivados da paleta existente, incluindo as versões de cada tema. Botões, selects, pesquisa, erros, badges e paginação compartilham esse padrão. Os indicadores mantêm seus valores e passam a usar alinhamento à direita com algarismos tabulares.

Os ramos e a animação original do BranchedMenu foram mantidos. Os ajustes tratam espaçamento de seções, alinhamento de ícones, hover, badge e rodapé. A geometria do RubberSegment permanece original, com área vertical maior no celular por CSS. As páginas não receberam novos cards, operações financeiras ou controles sem implementação.

A troca de página recebe uma transição de 140ms a partir de conteúdo já visível, sem atrasar a navegação. Diálogos e avisos têm entrada curta; o carregamento usa a marca de forma estática, sem números de demonstração adicionais ou animações contínuas. O modo de movimento reduzido elimina essas transições.

Os gráficos continuam usando o renderer SVG original. Tooltips comuns exibem nomes, datas e valores já recebidos pelo gráfico, sem recalcular resultados. A camada de interação usa texto seguro, limita a caixa ao gráfico, agrupa movimentos do ponteiro por frame e mantém o estado de consulta ao redimensionar. Estados vazios não produzem eixos sem valores. As listas gráficas acomodam a coluna monetária pelo conteúdo e preservam o nome completo no texto/título.

As mensagens revisadas preservam os fatos: resumo pode ser copiado/compartilhado; diferença zero significa igualdade entre contado e esperado; operações de gravação não são prometidas para uma fase futura nem apresentadas como disponíveis. A exportação CSV e suas mensagens não foram alteradas.

## Cobertura das telas

| Tela | Refinamento aplicado |
| --- | --- |
| Visão geral | Cabeçalho direto, indicadores alinhados, metadados legíveis, abas e consulta do gráfico acessível |
| Fluxo de caixa | Cabeçalho e seletor alinhados, ferramenta de consulta nas barras, contraste e tabela com foco estável |
| A receber | Títulos, badges, pesquisa, notas, tabelas e diálogo de detalhes com padrão compartilhado |
| A pagar | Indicadores, calendário legível no celular, listas e tabelas consistentes |
| Fechamento | Seletor, consulta do gráfico de diferença, tabela e detalhes monetários |
| Lançamentos | Filtros, linhas, detalhes e ordenação visualmente coerentes |
| Indicadores | Escala financeira e listas gráficas com coluna monetária preservada |
| Contas financeiras | Cards de conta diretamente sobre o fundo, saldos à direita e ações consistentes |
| Clientes e fornecedores | Cabeçalho sem prefixo repetido, tabela mais legível, filtros e paginação |
| Categorias | Hierarquia de título, badges, pesquisa, tabela e estados de ordenação |
| Relatórios | Seletor, filtros, tabelas e exportação existente com aparência uniforme |
| Conciliação | Remoção da faixa vazia móvel, controles adequados ao toque e resultados em grid consistente |
| Importar dados | Fontes e conferência com rolagem interna, campos e mensagens consistentes |
| Configurações | Preferências, botões de aparência e descrições com a mesma escala e contraste |

## Integridade e arquivos

Arquivos de implementação modificados nesta etapa:

- `assets/css/styles.css`: tokens e apresentação de layout, navegação, indicadores, tabelas, controles e overlays.
- `assets/js/charts.js`: tooltips e interação acessível, foco, estados vazios e apresentação das listas.
- `assets/js/ui.js`: foco na ordenação, associação de erros aos campos, apresentação/foco de modais e cor da moldura do navegador.
- `assets/js/workspace.js`: remoção do prefixo decorativo dos cabeçalhos.
- `index.html`: dimensões do logo, cor da moldura, microcopy, cabeçalho e contêiner acessível do calendário.

Também foram acrescentados `tests/visual.cjs` e este relatório, e atualizados os links de documentação. Não houve alterações nos arquivos originais das skills.

Foi confirmada igualdade byte a byte com o início desta tarefa para `assets/js/calculos.js`, `assets/js/app.js`, as seis fontes de `dados/`, `package.json` e `package-lock.json`. Isso preserva fórmulas, centavos, datas de referência, rotas, persistência, importação e conciliação. O trecho responsável por serializar e exportar CSV também foi comparado e permanece idêntico. Os componentes React existentes e o empacotador do HTML único não foram modificados.

## Validação final

| Verificação | Inicial | Final |
| --- | --- | --- |
| Sintaxe e compilação JSX em memória | Aprovado | Aprovado |
| Testes financeiros | 13 aprovados | 13 aprovados |
| Integração Chromium | 13 grupos aprovados | 13 grupos aprovados |
| Matriz visual | 140 combinações | 140 combinações |
| Tamanho mínimo dos metadados medidos | 10px | 11px |
| Ocorrências medidas de contraste insuficiente | 5, referentes ao mesmo texto | 0 |
| Indicadores monetários cortados na matriz | 0 | 0 |
| Detector de código Impeccable | 1 ocorrência | 0 |

Foram executados `npm install`, `npm run check`, `npm test`, `npm run build` e `npm run test:browser`. A instalação não acrescentou pacotes e reportou zero vulnerabilidades. O build produziu `dist/caixa-novo.html`, validado pelo navegador com componentes, estilos, dados e scripts embutidos.

O teste visual adicional é reproduzível com:

```powershell
# Execute before antes de novas alterações para preservar a referência da vez.
node tests/visual.cjs before
# Após as alterações:
node tests/visual.cjs after
```

As capturas e métricas estão em `test-results/visual-before/` e `test-results/visual-after/`, ignorados pelo Git. Cada fase tem 56 capturas das 14 rotas em desktop/celular e dois temas; a fase final inclui ainda seis capturas de modais, tooltip por toque e conferência de importação em 320px. As 140 combinações finais comparam indicadores, células monetárias e títulos de dados dos gráficos com a referência inicial: nenhum valor ou série mudou.

Os estados adicionais verificam teclado, Escape, toque sintetizado, foco na ordenação, limites do tooltip/modal, rolagem do calendário, conferência sem aplicação dos dados, ausência de persistência antes da confirmação e tema Auto acompanhando claro/escuro. O Chromium emulou resoluções e toque; não foram usados aparelhos físicos.

## Skills efetivamente utilizadas

- `.claude/skills/frontend-design/SKILL.md`: hierarquia, tipografia, composição e revisão da direção contra a identidade explicitamente fixada.
- `.claude/skills/impeccable/SKILL.md`: comando de contexto, roteiros de auditoria/polish, orientação de modo Operate, craft floor e detector inicial/final.
- `.claude/skills/humanizer/SKILL.md`: revisão integrada de microcopy, preservando fatos e termos financeiros.
- `.claude/skills/web-design-guidelines/SKILL.md`: auditoria com as regras atuais obtidas de `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`.

As skills React Best Practices e Webapp Testing permanecem instaladas, mas não são declaradas como executadas nesta etapa. A validação usou a suíte Playwright Node existente. Nenhum agente auxiliar foi acionado.

## Limites e pendências

- A validação de navegador foi realizada no Chromium. Safari, Firefox, leitores de tela reais e dispositivos físicos não foram testados.
- Os limiares de contraste foram medidos nos textos auxiliares, rótulos e destaques cobertos pelo teste; isso não substitui uma auditoria WCAG completa.
- O leitor Excel externo foi preservado. CSV, OFX, conferência e confirmação foram testados; disponibilidade do CDN e arquivos XLS/XLSX adicionais continuam exigindo validação específica.
- Cadastro, baixa, estornos e outras operações que dependem de backend continuam fora do escopo. Não foram implementados, simulados ou prometidos.
- Não houve push, merge ou deploy.
