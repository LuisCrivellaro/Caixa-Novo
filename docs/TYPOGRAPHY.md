# Tipografia e legibilidade do Caixa-Novo

Revisão de 01/11/2026, aplicada às 14 rotas, componentes compartilhados e dois temas. A identidade, os dados, os cálculos e os fluxos existentes foram preservados. Nenhuma dependência foi adicionada. As ilhas de navegação e período já existiam; nenhuma tela foi migrada.

## Auditoria e escala

Foram lidos CLAUDE.md, README e a arquitetura; os estilos principais, CSS dos componentes e textos dos gráficos foram inspecionados. O estado recebido já tinha mudanças de tarefas anteriores, por isso a comparação desta revisão usa uma cópia dos arquivos recebidos e capturas novas, sem tomar o HEAD como referência.

Problemas encontrados: categorias do menu com 10px, descrição da empresa com 10px, tabelas reduzidas para 13px por sobrescrita, cards com títulos de 15px, listas e alertas reduzidos para 12px, informações financeiras auxiliares com 11px e valores principais reduzidos para 19px no celular. O detector tipográfico inicial não apontou esses problemas; a avaliação de estilos e capturas foi necessária.

| Função | Escala final na preferência padrão do navegador |
| --- | --- |
| Página | 30/38px; 28/36px no celular |
| Seção/card | 21/28px, Red Hat Display 600 |
| Valor principal | 28/38px; destaque de saldo 32/42px |
| Valor secundário | 22/30px |
| Corpo, linhas de tabelas, listas e alertas | 15/24px |
| Labels, cabeçalhos de tabela e navegação | 14px, entrelinha de 20–22px |
| Metadados, documentos auxiliares e badges | 13/20px |
| Descritor institucional da marca | 12px |
| Gráficos | Eixos/legendas 14px; anotações 13px |

Os papéis são definidos em `--type-*` e `--leading-*`, em rem. Red Hat Text permanece na operação, Red Hat Display nos títulos e valores e Birthstone na frase institucional. Fontes e pesos carregados continuam os mesmos, com `display=swap` e fallback do sistema. Títulos usam composição equilibrada e descrições de página têm limite de 72ch. Valores mantêm alinhamento à direita, sinal e algarismos tabulares.

## Componentes

- Sidebar: categorias e links em 14px, estado ativo preservado e largura de 224px. Os ramos têm linhas de 44px no desktop e 48px no celular, acompanhando a preferência de tamanho do texto para acomodar nomes longos. Expansão, badge, rotas e armazenamento não foram alterados.
- Cabeçalhos, cards, modais e feedback: hierarquia compartilhada, entrelinhas proporcionais e mensagens em 15px; removidas reduções tipográficas conflitantes. Campos móveis usam 17px, com controles de pelo menos 44px.
- Tabelas: corpo em 15px, cabeçalhos em 14px e status em 13px. As linhas acomodam as fontes maiores, com rolagem própria, ordenação, filtros e paginação preservados.
- Indicadores: a grade passa para duas colunas até 1360px e uma até 540px, conservando valores inteiros e legíveis. Não foram criados cards ou métricas.
- Gráficos SVG: medição e desenho usam os mesmos tokens; as faixas de anotações e margem inferior acompanham os rótulos maiores. A seleção de datas considera a largura real do gráfico e impede colisões após o posicionamento. Referências como o saldo mínimo evitam também a caixa real do valor final. Pontos, séries, títulos com valores e consultas por teclado/toque permanecem disponíveis.
- RubberSegment: somente a apresentação do texto foi alinhada ao corpo de 15px; períodos, estado e animação permanecem os existentes.

## Validação

Antes das edições: `npm run check`, 13 testes financeiros e auditoria de 140 combinações de rota, tema e largura passaram. A referência foi salva em `test-results/visual-before/`.

Após as alterações:

- `npm install`: nenhuma dependência adicionada, zero vulnerabilidades reportadas.
- `npm run check`, `npm test` (13 testes), `npm run build` e `npm run test:browser` (13 grupos): aprovados.
- `node tests/visual.cjs after`: 140 combinações em 1440, 1280, 768, 390 e 320px nos temas claro/escuro, com 56 capturas de páginas e capturas adicionais de diálogos, importação e tooltip.
- Tamanhos renderizados por função verificados em todas as rotas; metadados com mínimo de 13px, sem rótulos de eixo encostados, sobreposições entre textos SVG, valores financeiros cortados ou rolagem horizontal da página. O calendário e as tabelas usam rolagem interna. A referência de dados usa a escala de 14px no corpo e 12px nos auxiliares.
- 84 verificações adicionais nas 14 rotas com Google Fonts bloqueado: notebook de 1280px com texto a 125%, celulares de 390/320px na preferência padrão e ambos os temas. Sem valores cortados, nomes do menu sobrepostos ou alargamento da página.
- Comparação automática com a referência: valores monetários e títulos SVG com os dados permaneceram idênticos nas 140 combinações.
- Detector final Impeccable: zero achados. Integridade das seis skills locais: 165 arquivos/referências válidos.

Durante a revisão foram corrigidos problemas identificados nos testes e capturas adicionais: nomes longos do menu com texto ampliado, datas encostadas no panorama de caixa móvel e proximidade entre a referência de saldo mínimo e o valor final da linha. Não restam falhas nesses cenários.

## Arquivos e skills

Implementação: `assets/css/styles.css`, `assets/js/charts.js`, `assets/components/navigation.jsx`, `assets/components/BranchedMenu/BranchedMenu.css` e `assets/components/RubberSegment/RubberSegment.css`.

Validação e documentação: `tests/visual.cjs`, este relatório, README.md e docs/FRONTEND_ARCHITECTURE.md. O HTML único e os bundles foram regenerados nos diretórios ignorados pelo Git.

Skills efetivamente utilizadas: `.claude/skills/frontend-design/SKILL.md` e `.claude/skills/impeccable/SKILL.md`, com o roteiro `reference/typeset.md`, avaliações independentes, craft-floor e detector. As demais skills instaladas não foram declaradas como executadas nesta revisão.

Os arquivos de cálculos, aplicação, importação, persistência, exportação, dados e pacotes permanecem iguais ao início desta revisão. Nenhum push, merge ou deploy foi realizado.

## Limites

O anexo desta tarefa continha somente texto, sem a imagem mencionada; a comparação visual usa capturas reais do projeto antes/depois. A execução automatizada usa Chromium. Firefox, Safari e dispositivos físicos não foram avaliados nesta entrega. Não foram identificadas pendências funcionais introduzidas pela revisão.
