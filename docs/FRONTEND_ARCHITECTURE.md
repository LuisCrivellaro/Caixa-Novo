# Arquitetura do frontend — Caixa-Novo

## Diagnóstico e escopo

O repositório é uma aplicação estática em HTML, CSS e JavaScript, com React restrito à navegação BranchedMenu e ao seletor RubberSegment do Fluxo de Caixa, sem banco de dados, API ou autenticação. A versão do pacote continua `0.1.0`. A implementação mantém as seis fontes JSON e a camada financeira declarativa.

O frontend consulta dados de exemplo distribuídos com o projeto ou planilhas importadas pelo usuário. Dados importados são locais ao navegador; não existe sincronização com servidor. Um aviso permanente distingue exemplos, fontes mistas e fontes totalmente importadas. Exportações também identificam essa origem. Falhas de leitura do armazenamento local são informadas no aviso.

O anexo recebido continha apenas o texto do escopo, sem a imagem de referência. O design segue a direção visual descrita: sidebar fixa, fundo bege, cards brancos, densidade de ferramenta financeira e destaque laranja moderado.

## Estrutura

| Arquivo | Responsabilidade |
| --- | --- |
| `index.html` | Estrutura, navegação, nove telas originais, carregamento e avisos globais |
| `assets/css/styles.css` | Tokens, componentes, temas, layout, responsividade e impressão |
| `assets/js/calculos.js` | Registro declarativo de cálculos e consultas; recebe fontes e devolve linhas |
| `assets/js/charts.js` | Gráficos SVG existentes, com redimensionamento e navegação acessível |
| `assets/js/ui.js` | Componentes compartilhados, tabelas, diálogo, mensagens e CSV |
| `assets/js/workspace.js` | Cinco novas telas de consulta, detalhes de títulos e tabela do fluxo |
| `assets/js/app.js` | Carga, cache, rotas, renderização original, filtros e importação/conciliação |
| `assets/components/BranchedMenu/BranchedMenu.jsx` | Componente original React Bits adaptado para links, controle externo e badges |
| `assets/components/BranchedMenu/BranchedMenu.css` | Estilos originais e ajustes de densidade, foco e tokens do Caixa-Novo |
| `assets/components/navigation.jsx` | Cinco categorias, Hugeicons, estado compartilhado e ponte com o roteador |
| `assets/components/RubberSegment/` | JSX/CSS originais React Bits, seleção controlada e animação elástica Motion |
| `assets/components/flow-period.jsx` | Ponte do seletor com o estado único de período de `app.js` |
| `assets/components/index.jsx` | Entrada única das duas ilhas React |
| `scripts/build-menu.cjs` | Bundle local de React, Hugeicons e Motion, sem CDN; saída ignorada em `assets/generated/` |
| `scripts/check.cjs` | Verificação de sintaxe de todos os módulos JavaScript |
| `scripts/montar_arquivo_unico.py` | Empacotamento de estilos, scripts, logo e exemplos em HTML único |
| `tests/calculos.test.cjs` | Regressões da camada financeira e das consultas |
| `tests/browser.cjs` | Verificações de integração no Chromium, com servidor temporário próprio |

Também foram atualizados `README.md` e `package.json`; foram acrescentados `package-lock.json` e `.gitignore`. Os arquivos JSON de exemplos, o esquema das fontes e o gerador de dados permanecem preservados.

Ordem dos scripts: `charts.js`, `calculos.js`, `ui.js`, `workspace.js`, bundle `branched-menu.js`, `app.js`. A versão de arquivo único respeita a mesma ordem e embute o bundle e seus estilos. React e React DOM são usados nas duas ilhas; Hugeicons no menu e Motion no seletor. O nome do bundle foi preservado para manter o carregamento estático existente. Esbuild é dependência de desenvolvimento.

## RubberSegment e período do fluxo

A [implementação original JavaScript/CSS do RubberSegment](https://reactbits.dev/c/micro/rubber-segment) foi integrada à seleção local `grao` de `app.js`, com Semana inicial. O wrapper só recebe o valor e devolve a seleção; não mantém outro estado de período nem lê fontes financeiras. Mantém efeitos de esticar/comprimir, arraste, toque, teclado e movimento reduzido. Uma adaptação acrescenta ativação por Enter/Espaço e tecnologia assistiva, sem duplicar o evento de ponteiro. O estilo utiliza tokens neutros dos temas e raio de 10px; o restante do layout permanece preservado.

`fluxo` agora inclui agrupamento anual e saídas em centavos, além dos campos anteriores em reais para compatibilidade. O realizado respeita a posição das contas e exclui transferências; previsões mantêm o horizonte de 60 dias e abatimentos. `fluxo_comparacao` reúne categorias por tipo e agrupamento, no período atual até a posição e no período anterior completo. `fluxo_resumo` deriva dessas mesmas linhas os totais, resultado e variações. A comparação do resultado usa a magnitude do denominador quando o anterior é negativo; sem base, a variação é nula e aparece como `—`.

Resumo, categorias, variações, datas, legenda, gráfico e tabela usam o mesmo `grao`. O gráfico mantém as janelas históricas anteriores, inclusive -45/+30 dias no modo diário, e passa a mostrar os anos efetivamente presentes nas fontes. O resumo e as categorias identificam seus próprios intervalos para diferenciar o período atual do histórico do gráfico. A tabela usa somente o agrupamento selecionado, preservando pesquisa, natureza, datas e ordenação ao trocar o período.

As novas regressões verificam os quatro períodos, ano bissexto, semana entre anos, previsão anual, exclusão de futuras movimentações/transferências, abatimentos, categorias e ausência de base. O navegador confere os valores com as fontes de exemplo, troca por mouse, teclado, toque e arraste, preservação dos filtros/CSV e limites do cabeçalho em 1440/768/390/320px. Resultado: 13 testes financeiros e 13 grupos de integração aprovados.

## Skills locais

O projeto tem seis skills oficiais em `.claude/skills/`, com seleção contextual orientada por `CLAUDE.md`, sem hooks de edição. O diagnóstico, fontes, versões, métodos oficiais, comandos e limites de compatibilidade estão em [skills/README.md](skills/README.md). O manifesto de integridade e o lock preservam a procedência; `node scripts/check-skills.cjs` verifica a instalação. Essa etapa de instalação não modificou os arquivos do aplicativo, fontes ou testes já validados.

## Design system

A evolução visual posterior às integrações React Bits está registrada em [FRONTEND_POLISH.md](FRONTEND_POLISH.md). Ela preserva os tokens de cor e o fluxo financeiro, padroniza controles de 38px/44px e metadados de 11–12px, melhora foco e consulta dos gráficos e acrescenta a matriz de validação visual. O roteador, `calculos.js`, dados e dependências permaneceram idênticos ao início dessa etapa.

| Token | Tema claro |
| --- | --- |
| Fundo | `#F5F3EE` |
| Superfície | `#FFFFFF` |
| Sidebar | Mistura de 94% do fundo e 6% do texto |
| Texto | `#292824` |
| Texto secundário | `#68655E` |
| Texto auxiliar | `#767269` |
| Bordas | `#E8E5DE` |
| Positivo | `#35713D` |
| Negativo | `#BE473F` |
| Marca | `#FE7D01`; texto/ação em `#B85605` |

Os tons de texto são mais escuros que as referências iniciais para manter legibilidade. O tema escuro preserva o conjunto de tokens existente, inclusive cores de gráficos e indicadores. A preferência acompanha o sistema ou é salva em `mn-tema`.

- Tipografia: Red Hat Text na interface, Red Hat Display em títulos/valores; fontes locais do sistema como fallback. Fontes Google são opcionais para o funcionamento.
- Escala por função em `--type-*` e `--leading-*`, expressa em rem: títulos de página 30px/38px no desktop e 28px/36px no celular; cards 21px/28px; corpo e tabelas 15px/24px; labels e navegação 14px; auxiliares 13px. Valores principais usam 28–32px, secundários 22px. Medidas em pixels descrevem a preferência padrão de 16px do navegador. Consulte [a revisão tipográfica](TYPOGRAPHY.md).
- Espaçamento: unidades usuais de 4, 8, 12, 16, 20 e 24px; gap principal de 18px.
- Raios: cards de 10px, elementos internos de 7px e controles de 6px.
- Sombras: quase imperceptíveis em cards; destaque de elevação reservado a diálogos e mensagens.
- Ícones: Hugeicons na navegação BranchedMenu, SVG locais nas demais telas; ícones decorativos ignorados por leitores de tela.
- Valores alinhados à direita, algarismos tabulares, BRL e datas `dd/mm/aaaa`. Valores de saída levam sinal `−`; recebimentos nos títulos levam `+`. Status usam texto além de cor.
- Controles têm foco visível, estados desabilitados e transições curtas. `prefers-reduced-motion` desativa transições.

## Navegação e páginas

Rotas por hash, sem recarga completa, compatíveis com hospedagem estática e com o HTML único. As URLs anteriores continuam válidas.

A navegação usa a [fonte JavaScript/CSS oficial do BranchedMenu](https://reactbits.dev/c/micro/branched-menu), preservando o desenho SVG dos ramos, animação do caminho ativo, indicador deslizante, múltiplas seções abertas e parâmetros do componente. As adaptações acrescentam `activeValue` e `openSections` controlados, links nativos com `href`, badges, ícones nos cabeçalhos, `aria-controls`, `aria-current="page"`, foco visível e `inert` nos grupos fechados. Os tempos de desenho/dobra são configurados em 200/180ms; a preferência por movimento reduzido continua respeitada.

`navigation.jsx` monta duas instâncias isoladas, para sidebar e menu móvel, com um estado compartilhado via `useSyncExternalStore`. A ponte `window.CaixaMenu.setActive(view)` recebe a rota já resolvida por `app.js`; `setReceivableCount(n)` recebe a mesma consulta de vencidos utilizada antes. O componente não lê fontes financeiras nem renderiza páginas. Os identificadores das seções abertas são persistidos em `mn-menu-secoes`, com validação e fallback em memória. Uma nova rota abre sua seção se ela estiver recolhida; as demais mantêm o estado.

O cabeçalho e o rodapé da sidebar foram preservados, assim como a largura de 224px e o fundo calculado com os tokens existentes de cada tema. Somente a área intermediária rola. O menu móvel mantém Escape, foco modal e fechamento ao navegar; itens de grupos fechados são excluídos da sequência de Tab. A geometria dos ramos acompanha as linhas de 44px no desktop e 48px no celular. A licença React Bits está preservada em `docs/licenses/react-bits.md` e no bundle.

| Rota | Conteúdo conectado |
| --- | --- |
| `#geral` | Saldo informado, entradas/saídas/resultado do mês, carteira, vencidos, projeção, alertas, prazos, próximos vencimentos e resumo do dia |
| `#fluxo` | Gráfico diário/semanal/mensal, comparação de categorias e tabela filtrável/exportável de realizado e previsto |
| `#receber` | Títulos individuais, detalhes e movimentos vinculados, situação, carteira, envelhecimento, pagadores, crédito e repasses de cartão |
| `#pagar` | Histórico de títulos, detalhes, calendário com consulta por dia, abertos, categorias e abatimentos |
| `#fechamento` | Fechamentos por dia, gaveta, responsáveis e diferenças |
| `#lancamentos` | Movimentos realizados, detalhes, pesquisa, filtros, ordenação e carregamento adicional |
| `#indicadores` | Indicadores existentes e despesas operacionais |
| `#conciliacao` | Importação OFX/CSV/Excel, mapeamento e conferência com movimentos da conta selecionada |
| `#dados` | Importação das seis fontes, conferência, confirmação, persistência local e restauração de exemplos |
| `#contas` | Cards com saldos da fonte e acesso aos movimentos filtrados por conta |
| `#pessoas` | Clientes da fonte e fornecedores únicos dos títulos a pagar, com busca, filtro e CSV |
| `#categorias` | Categorias utilizadas em movimentos e títulos a pagar, com tipo e contagem de registros |
| `#relatorios` | Movimentações, contas a pagar/receber e fluxo; pesquisa, datas, filtros e exportação CSV |
| `#configuracoes` | Aparência, origem de dados, data da posição e acesso à importação |

`#receber/vencidos` e `#receber/limite` mantêm os filtros dos alertas. A data de referência vem de `contas[0].data_saldo`, conforme a regra anterior; a interface chama essa data de posição financeira. Não substitui essa posição pelo relógio do computador.

## Componentes e estados

`CaixaUI` expõe `el`, `currency`, `date`, `badge`, `notify`, `dialog`, `dataTable` e `downloadCSV`. Os componentes não leem arquivos nem armazenamento financeiro.

`dataTable` recebe linhas calculadas, definições de colunas e filtros. Inclui pesquisa, ordenação com `aria-sort`, 15 registros por página, contagem acessível, limpar filtros, datas, validação de intervalo, estado vazio e CSV de **todos os registros filtrados**, incluindo os que estão fora da página visível. O CSV usa separador `;`, UTF-8 com BOM e neutraliza fórmulas em textos exportados.

Diálogos usam `<dialog>` nativo, foco modal e Escape. Ações de importação e restauração têm confirmação explícita antes da alteração local. Cancelar mantém a fonte atual. O sucesso da importação significa que a fonte local foi aplicada; se a persistência falhar, a mensagem informa que os dados não sobreviverão ao fechamento da página.

O carregamento inicial tem estado anunciado; falhas de fetch mostram erro e botão para tentar novamente. As consultas vazias apresentam orientação, e as telas originais preservam seus estados vazios. Um erro de cálculo é exibido no bloco correspondente. Exportações e mudanças de aparência usam feedback com `role=status`.

## Integração e integridade financeira

As telas dependem de `get(id)`, que resolve as fontes e os cálculos registrados em `CALCULOS`, com cache invalidado após importação. As novas telas recebem essa função por injeção em `criarWorkspace`. Novas consultas foram acrescentadas ao registro; os cálculos financeiros anteriores não foram substituídos.

- Fontes: `contas`, `clientes`, `receber`, `pagar`, `lancamentos` e `fechamentos`.
- Chaves locais preservadas: `mn-fonte-<fonte>`, com `rows` e `meta`.
- Dinheiro permanece em centavos inteiros nas novas consultas. Conversão para reais ocorre na apresentação. Saídas dos cálculos legados continuam sendo consumidas no seu formato original.
- O resultado do mês é calculado na camada de cálculos, em centavos, apenas com entradas e saídas realizadas no mês até a posição. Transferências não entram nesse resultado.
- Os saldos vêm da fonte de contas. Não são reconstruídos a partir do extrato disponível.
- Abatimentos são preservados e exibidos separados do valor original; o líquido é calculado em centavos.
- A situação do título vem de `pago_em` e do vencimento na data da posição. Movimentos vinculados são apresentados somente quando `origem` corresponde ao identificador do título.
- Realizado e previsto permanecem diferenciados por natureza. A tabela de fluxo mostra o resultado de cada período, não um saldo de conta reconstruído. Agrupamentos diário/semanal/mensal são visões alternativas e não devem ser somados entre si.
- O leitor de Excel existente continua usando SheetJS 0.18.5 sob demanda; CSV e OFX não precisam desse download.

## Responsividade e acessibilidade

Desktop: sidebar de 224px, corpo fluido e limite de conteúdo de 1320px. Em até 1360px os indicadores passam para duas colunas; até 1100px os painéis se empilham. Em até 900px a navegação vira menu modal com bloqueio do fundo, controle de foco e Escape. A navegação libera o foco ao mudar de página ou redimensionar para desktop. As linhas dos ramos acompanham a preferência de tamanho do texto, mantendo 44px/48px na configuração padrão.

Em até 540px, indicadores ficam em uma coluna para preservar os valores monetários completos sem reduzir a tipografia. Tabelas extensas têm rolagem dentro do contêiner, sem alargar a página. Controles de tabela são identificados, botões de ordenação são navegáveis por teclado e as abas de gráfico aceitam setas.

## Skills e decisões técnicas

A skill **Sites** foi consultada, seguindo o caminho de edição local de checkout existente. Nenhum Site foi registrado, publicado ou sincronizado, conforme a restrição do usuário a push/merge/deploy.

As skills locais atualmente instaladas e suas versões estão registradas em [docs/skills/README.md](skills/README.md). A revisão tipográfica aplicou Frontend Design e Impeccable/typeset, com avaliações independentes e detector mecânico. O arquivo `charts.js`, já presente, mantém a atribuição MIT à taste-skill.

A integração do BranchedMenu acrescenta React somente à navegação, sem migrar telas, cálculos ou roteador. Playwright é dependência de desenvolvimento; testes financeiros usam o runner nativo do Node. A skill Sites foi utilizada no fluxo local, sem operações de hospedagem.

## Validação

```sh
npm install
npm run check
npm test
npm run build
# Instalar o navegador apenas se ele ainda não existir no ambiente:
npx playwright install chromium
npm run test:browser
```

`check` verifica sintaxe JavaScript e compila o JSX do menu em memória; não substitui lint semântico. Não há ESLint nem TypeScript no projeto, portanto lint/typecheck específicos não são apresentados como executados. `npm install` gera o menu pelo script `prepare`; `npm run dev` também o compila antes de servir. `npm run build` recompila o menu e gera o HTML único.

Testes financeiros cobrem todas as consultas com exemplos, vínculo do saldo à fonte, resultado mensal em centavos, exclusão de transferências do resultado, abatimentos, situação/data, não mutação e fontes vazias. Testes de navegador cobrem 14 rotas em 1440/768/390/320px, menus, gráficos, pesquisa, paginação, ordenação, detalhes, CSV, OFX, importação e persistência, confirmações, temas, fontes vazias, falhas de carga/armazenamento e HTML único.

O build gera `dist/caixa-novo.html`; `dist/`, capturas em `test-results/` e `node_modules/` são ignorados pelo Git. Não houve push, merge ou deploy.

Resultado após a integração BranchedMenu: 8 testes financeiros e 12 grupos de integração aprovados; 56 combinações de rota/largura verificadas sem rolagem horizontal da página, 14 destinos acessados por clique no desktop e 42 combinações de rota/largura acessadas pelo menu móvel. As cinco seções foram abertas/fechadas por mouse e teclado; estado ativo, badge, histórico, subrota, persistência, sincronização desktop/celular, foco modal e rodapé visível em viewport baixo foram verificados. O HTML único foi gerado e executado no navegador, incluindo links e expansão do BranchedMenu, sem buscar fontes JSON externas. A revisão visual incluiu capturas de desktop, celular e tema escuro.

## Pendências reais

1. A imagem de referência não foi recebida; a comparação visual com ela continua pendente.
2. Cadastro/edição de títulos, contas e pessoas; baixas; transferências; cancelamentos e estornos requerem API, persistência, autenticação e histórico. A interface não apresenta essas operações como disponíveis.
3. O esquema atual não tem competência, parcelas de liquidação ou trilha de auditoria completa. Não é possível representar pagamentos parciais com fidelidade até existir esse contrato.
4. Cadastros de categorias/contas não têm serviço de gravação. As telas consultam as categorias e contas existentes nas fontes.
5. Importações de fontes diferentes podem usar identificadores ou períodos incompatíveis. A indicação de fontes mistas é permanente; o sistema não realiza conciliação automática desses cadastros.
6. A dependência externa do leitor de Excel foi preservada. O teste de integração automatizado cobre CSV e OFX; Excel exige validação adicional com planilhas de teste e disponibilidade do CDN.

A entrega é um frontend funcional para as capacidades atuais de consulta, importação e conciliação. A operação transacional comercial depende das integrações acima.
