# Arquitetura do frontend — Caixa-Novo

## Diagnóstico e escopo

O repositório é uma aplicação estática em HTML, CSS e JavaScript, sem framework, banco de dados, API ou autenticação. A versão do pacote continua `0.1.0`. A implementação mantém os cálculos existentes e as seis fontes JSON. O Git estava limpo no início do trabalho.

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
| `scripts/check.cjs` | Verificação de sintaxe de todos os módulos JavaScript |
| `scripts/montar_arquivo_unico.py` | Empacotamento de estilos, scripts, logo e exemplos em HTML único |
| `tests/calculos.test.cjs` | Regressões da camada financeira e das consultas |
| `tests/browser.cjs` | Verificações de integração no Chromium, com servidor temporário próprio |

Também foram atualizados `README.md` e `package.json`; foram acrescentados `package-lock.json` e `.gitignore`. Os arquivos JSON de exemplos, o esquema das fontes e o gerador de dados permanecem preservados.

Ordem dos scripts: `charts.js`, `calculos.js`, `ui.js`, `workspace.js`, `app.js`. A versão de arquivo único respeita a mesma ordem. Nenhuma dependência de runtime foi acrescentada.

## Design system

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
- Títulos: 27px/34px no desktop e 24px no celular; cabeçalhos de cards em 15px; texto base em 14px e auxiliares em 10–12px.
- Espaçamento: unidades usuais de 4, 8, 12, 16, 20 e 24px; gap principal de 18px.
- Raios: cards de 10px, elementos internos de 7px e controles de 6px.
- Sombras: quase imperceptíveis em cards; destaque de elevação reservado a diálogos e mensagens.
- Ícones: SVG locais, sem biblioteca externa; ícones decorativos ignorados por leitores de tela.
- Valores alinhados à direita, algarismos tabulares, BRL e datas `dd/mm/aaaa`. Valores de saída levam sinal `−`; recebimentos nos títulos levam `+`. Status usam texto além de cor.
- Controles têm foco visível, estados desabilitados e transições curtas. `prefers-reduced-motion` desativa transições.

## Navegação e páginas

Rotas por hash, sem recarga completa, compatíveis com hospedagem estática e com o HTML único. As URLs anteriores continuam válidas.

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

Desktop: sidebar de 224px, corpo fluido e limite de conteúdo de 1320px. Em até 1200px os indicadores passam para duas colunas; até 1100px os painéis se empilham. Em até 900px a navegação vira menu modal com bloqueio do fundo, controle de foco e Escape. A navegação libera o foco ao mudar de página ou redimensionar para desktop.

Em telas muito estreitas (até 360px), indicadores ficam em uma coluna para preservar os valores monetários completos. Tabelas extensas têm rolagem dentro do contêiner, sem alargar a página. Controles de tabela são identificados, botões de ordenação são navegáveis por teclado e as abas de gráfico aceitam setas.

## Skills e decisões técnicas

A skill **Sites** foi consultada, seguindo o caminho de edição local de checkout existente. Nenhum Site foi registrado, publicado ou sincronizado, conforme a restrição do usuário a push/merge/deploy.

Impeccable, Humanizer, UI UX Pro Max, Vercel Agent Skills, Web Design Guidelines, React Frontend Skills e Taste Skill não estavam disponíveis com esses nomes no catálogo ativo. Não foram instaladas nem declaradas como executadas. O arquivo `charts.js`, já presente, mantém a atribuição MIT à taste-skill.

Não foram introduzidos React, kit de componentes, banco, serviços externos ou migração de stack. Os componentes foram construídos na tecnologia existente. Playwright 1.62.1 foi acrescentado somente como dependência de desenvolvimento; testes financeiros usam o runner nativo do Node.

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

`check` verifica sintaxe JavaScript; não substitui lint semântico. Não há ESLint nem TypeScript no projeto, portanto lint/typecheck específicos não são apresentados como executados.

Testes financeiros cobrem todas as consultas com exemplos, vínculo do saldo à fonte, resultado mensal em centavos, exclusão de transferências do resultado, abatimentos, situação/data, não mutação e fontes vazias. Testes de navegador cobrem 14 rotas em 1440/768/390/320px, menus, gráficos, pesquisa, paginação, ordenação, detalhes, CSV, OFX, importação e persistência, confirmações, temas, fontes vazias, falhas de carga/armazenamento e HTML único.

O build gera `dist/caixa-novo.html`; `dist/`, capturas em `test-results/` e `node_modules/` são ignorados pelo Git. Não houve push, merge ou deploy.

Resultado da validação desta entrega: 8 testes financeiros e 11 grupos de integração aprovados; 56 combinações de rota/largura verificadas sem rolagem horizontal da página. O HTML único foi gerado e executado no navegador sem buscar os arquivos JSON externos. A revisão visual incluiu capturas de desktop, celular e tema escuro.

## Pendências reais

1. A imagem de referência não foi recebida; a comparação visual com ela continua pendente.
2. Cadastro/edição de títulos, contas e pessoas; baixas; transferências; cancelamentos e estornos requerem API, persistência, autenticação e histórico. A interface não apresenta essas operações como disponíveis.
3. O esquema atual não tem competência, parcelas de liquidação ou trilha de auditoria completa. Não é possível representar pagamentos parciais com fidelidade até existir esse contrato.
4. Cadastros de categorias/contas não têm serviço de gravação. As telas consultam as categorias e contas existentes nas fontes.
5. Importações de fontes diferentes podem usar identificadores ou períodos incompatíveis. A indicação de fontes mistas é permanente; o sistema não realiza conciliação automática desses cadastros.
6. A dependência externa do leitor de Excel foi preservada. O teste de integração automatizado cobre CSV e OFX; Excel exige validação adicional com planilhas de teste e disponibilidade do CDN.

A entrega é um frontend funcional para as capacidades atuais de consulta, importação e conciliação. A operação transacional comercial depende das integrações acima.
