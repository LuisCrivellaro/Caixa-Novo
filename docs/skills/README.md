# Skills de frontend do Caixa-Novo

Instalação local realizada em 01/11/2026, após analisar a arquitetura. Esta etapa instala instruções e ferramentas de desenvolvimento; não aplica mudanças visuais ou financeiras ao aplicativo. A integração RubberSegment, autorizada anteriormente, foi validada antes da instalação.

## Diagnóstico e compatibilidade

O aplicativo tem 14 telas em HTML e JavaScript, roteamento por hash em `assets/js/app.js`, consultas declarativas em `assets/js/calculos.js` e seis fontes JSON. Dados importados ficam no localStorage, após conferência e confirmação. Não há backend, banco de dados, API de autenticação ou permissões de usuários implementados.

React 19 é utilizado somente nas ilhas BranchedMenu e RubberSegment. Hugeicons fornece os ícones do menu; Motion controla a animação do seletor. O esbuild compila essas ilhas sem migrar as telas. O comando `npm run build:menu` conserva o nome anterior e agora compila ambas a partir de `assets/components/index.jsx`.

O sistema visual usa CSS com propriedades customizadas, temas Auto/Claro/Escuro, fontes Red Hat Text e Red Hat Display, laranja `#FE7D01`, cores semânticas para valores e foco visível. A sidebar mede 224px. O breakpoint principal do menu móvel é 900px. Tabelas, modais, notificações e CSV são compartilhados por `assets/js/ui.js`; as consultas de gestão são montadas por `assets/js/workspace.js`. Os gráficos são SVG locais em `assets/js/charts.js`, sem biblioteca de gráficos externa. Há testes financeiros nativos de Node e integração em Chromium com Playwright.

O RubberSegment controla Dia, Semana, Mês e Ano com Semana inicial. O resumo usa o período atual até a posição das contas, comparado ao período anterior completo; categorias e tabela acompanham o agrupamento. O gráfico mantém o histórico e as previsões disponíveis, sem inventar anos ou dados. Os filtros da tabela permanecem locais e são preservados ao mudar o período.

Não foram instaladas skills específicas de Tailwind, Next.js, bibliotecas de gráficos ou dashboards genéricos: essas tecnologias não fazem parte da arquitetura. O Impeccable já cobre motion, responsividade, contraste e refinamento; outra coleção genérica repetiria sua função. React Best Practices complementa esse conjunto nas ilhas React e Webapp Testing acrescenta orientação de inspeção e testes de comportamento.

## Catálogo instalado

Todos os caminhos abaixo são relativos ao repositório. Os arquivos de instruções e referências foram mantidos sem edição. Versões sem release semântico são identificadas pelo commit completo em [installed.json](installed.json).

| Skill e fonte oficial | Versão instalada | Local | Quando usar / chamada explícita |
| --- | --- | --- | --- |
| [Frontend Design — Anthropic](https://github.com/anthropics/skills/tree/main/skills/frontend-design) | commit `ca45fc496a34` | `.claude/skills/frontend-design/` | Criação ou evolução de interfaces autorizada: `/frontend-design` |
| [Impeccable — Paul Bakaus](https://github.com/pbakaus/impeccable) | CLI/skill 4.8.0; motor 0.1.18 | `.claude/skills/impeccable/` | Refinamento de componentes existentes: `/impeccable polish <alvo>`, `/impeccable audit <alvo>`, `/impeccable animate <alvo>` |
| [Humanizer — blader](https://github.com/blader/humanizer) | 3.1.0; commit `0ef9fe5bc357` | `.claude/skills/humanizer/` | Revisão de microcopy em português, preservando o sentido financeiro: `/humanizer <texto ou arquivo>` |
| [Web Design Guidelines — Vercel](https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines) | 1.0.0; commit `1a2c79d4e6c` | `.claude/skills/web-design-guidelines/` | Auditoria técnica e de acessibilidade: `/web-design-guidelines index.html assets/css/styles.css` |
| [React Best Practices — Vercel](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices) | 1.0.0; commit `1a2c79d4e6c` | `.claude/skills/vercel-react-best-practices/` | Bundle, renderização, efeitos e desempenho das ilhas: `/vercel-react-best-practices assets/components/` |
| [Webapp Testing — Anthropic](https://github.com/anthropics/skills/tree/main/skills/webapp-testing) | commit `ca45fc496a34` | `.claude/skills/webapp-testing/` | Validação de rotas, filtros, componentes e capturas: `/webapp-testing` |

Os links apontam às fontes oficiais atuais; os commits efetivamente baixados estão fixados no manifesto e em `skills-lock.json`. O skill Frontend Design da Anthropic e o Impeccable atual têm nomes distintos: não foram instaladas versões concorrentes de `frontend-design`.

## Descoberta automática e uso manual

O [Claude Code descobre skills de projeto em `.claude/skills/`](https://code.claude.com/docs/en/skills). Recarregue a sessão ou abra uma nova sessão na raiz do Caixa-Novo após instalar. Todas as seis mantêm a configuração original: permitem seleção automática quando a descrição combina com a tarefa e também invocação explícita. A escolha automática depende do agente e da tarefa; instalação não significa execução em cada mensagem.

`CLAUDE.md` orienta qual skill selecionar e exige preservar os limites da tarefa. Não há imports dos seis prompts no contexto permanente. Um pedido de criação pode selecionar Frontend Design; um refinamento pode selecionar Impeccable; revisão de textos pode selecionar Humanizer; auditoria pode selecionar Web Design Guidelines. React Best Practices aplica-se somente aos arquivos React relevantes; Webapp Testing aplica-se à verificação do comportamento.

Nenhuma skill deve promover um pedido de auditoria a uma reimplementação. Comandos como `polish`, `animate`, `bolder` e `live` só devem ser executados quando sua ação estiver autorizada pela tarefa. Os hooks de edição e de fim de turno do Impeccable foram desativados na instalação (`--no-hooks`); não há auditoria de UI automática por hook. O instalador oficial também adicionou quatro definições auxiliares em `.claude/agents/`; nenhuma foi executada nesta etapa.

Não execute `/impeccable init` ou `/impeccable document` como requisito para instalar as skills. São fluxos separados de descoberta/documentação, com requisitos próprios de entrevista e revisão. O contexto verificável já consta neste diagnóstico, em `CLAUDE.md` e em `docs/FRONTEND_ARCHITECTURE.md`; não foram fabricadas decisões de produto ou um novo design system.

## Métodos de instalação utilizados

Os comandos foram executados na raiz do projeto. A versão 1.7.4 do CLI oficial do ecossistema Skills foi fixada, assim como os commits mais recentes consultados dos repositórios. A opção `--copy` deixa arquivos reais em `.claude/skills/`, compartilháveis por Git e sem exigir suporte a symlinks no Windows. Não foi usado `--global`.

```powershell
npx --yes skills@1.7.4 add https://github.com/anthropics/skills/tree/ca45fc496a3436251f191354091d557da31c15b5 --skill frontend-design webapp-testing --agent claude-code --copy --yes
npx --yes skills@1.7.4 add https://github.com/blader/humanizer/tree/0ef9fe5bc3572734fd3ae6c448fe00a30cd5dcf0 --skill humanizer --agent claude-code --copy --yes
npx --yes skills@1.7.4 add https://github.com/vercel-labs/agent-skills/tree/1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62 --skill web-design-guidelines vercel-react-best-practices --agent claude-code --copy --yes
npx --yes impeccable@4.8.0 install --providers=claude --scope=project --no-hooks --yes
```

O Impeccable usou o próprio instalador oficial, com a distribuição específica para Claude Code, em vez de uma segunda cópia genérica. O motor Windows x64 foi baixado e teve seu SHA-256 conferido com `engine-checksums.txt`. Ele fica em `scripts/bin/`, ignorado pelo Git por ser específico da máquina. O launcher original pode obter a versão correta em outras plataformas quando for usado. Os demais scripts, referências e definições de agentes permanecem compartilháveis.

Também foi executado `npx --yes impeccable@4.8.0 update --scope=project --no-hooks --yes`. Os 58 arquivos da skill e as quatro definições de agentes foram comparados com o `universal.zip` oficial da release `skill-v4.8.0`: todos coincidem, desconsiderando apenas finais de linha LF/CRLF. O SHA-256 do arquivo ZIP coincide com o manifesto de assinatura publicado na release; o instalador oficial também verifica a assinatura do pacote antes de instalar.

O CLI Skills registra cinco skills em `skills-lock.json`. O Impeccable utiliza distribuição própria; sua versão npm, integridade do pacote, repositório e arquivos estão registrados em `installed.json`. Não altere manualmente o lock do CLI para fingir que outra ferramenta o gerencia.

Para atualizar, consulte novamente as fontes oficiais e use os CLIs correspondentes. Depois, registre o novo commit/versão e atualize os hashes do manifesto de maneira explícita. Um arquivo baixado de uma nova versão deve passar por revisão antes de substituir instruções do projeto.

## Dependências e limites verificados

- Nenhuma dependência npm de produção ou desenvolvimento foi adicionada para instalar as skills. Os CLIs foram executados via `npx`, usando o cache da máquina. A dependência `motion` já havia sido adicionada pela tarefa anterior do RubberSegment.
- Node 24.15 e Python 3.12 estão disponíveis. O CLI Skills 1.7.4 requer Node 22.20 ou superior; a versão instalada atende ao requisito.
- O launcher Windows do Impeccable respondeu à verificação de versão. O executável baixado é autocontido; não foi instalado Rust, Bun ou outro framework no aplicativo.
- `npx impeccable@4.8.0 check` continuou retornando `Updates available` imediatamente após o `update` bem-sucedido. O npm informa 4.8.0 como versão atual, e os 62 arquivos da distribuição correspondem ao ZIP oficial dessa release. A divergência foi registrada como limitação do verificador oficial neste ambiente; as instruções não foram modificadas para ocultar o aviso.
- O helper Python `webapp-testing/scripts/with_server.py --help` executou corretamente. Os exemplos Python dessa skill exigem o pacote Python Playwright, que não está instalado. Os testes do projeto usam o Playwright Node já existente; não foi instalada uma segunda implementação sem necessidade. Para solicitar execução literal dos exemplos Python no futuro, será necessário um ambiente Python com Playwright. Essa limitação não afeta os testes atuais do Caixa-Novo.
- As regras Next.js/SSR de React Best Practices não se aplicam a esta aplicação estática. Nenhuma skill autoriza migrar framework ou introduzir Tailwind, shadcn, backend ou biblioteca de gráficos por conta própria.
- Web Design Guidelines consulta regras atuais da [fonte oficial da Vercel](https://vercel.com/design/guidelines) a cada auditoria. Uma cópia de referência do `command.md` foi preservada em `references/` para registrar o conteúdo pesquisado; ela não é apresentada como uma consulta atual quando o acesso à rede falhar.

## Validação

```powershell
npx --yes skills@1.7.4 list --agent claude-code --json
node scripts/check-skills.cjs
npm run check
npm test
npm run build
npm run test:browser
```

O verificador local confere nomes únicos, metadados, presença e SHA-256 de cada arquivo instalado, referências e agentes auxiliares. Não reescreve os arquivos originais nem baixa versões durante a verificação. O manifesto completo torna alterações locais nas skills visíveis.

Os hashes dos arquivos de texto normalizam CRLF para LF, pois o Git no Windows converte finais de linha ao copiar fontes oficiais. A integridade do executável é comparada byte a byte. O pacote oficial e o respectivo SHA-256 também ficam identificados no manifesto, sem adicionar o ZIP ao repositório.

Durante a instalação, uma comparação SHA-256 de 33 arquivos do aplicativo, dados, build e testes confirmou que a etapa das skills não os alterou. O aplicativo foi validado com 13 testes financeiros e 13 grupos de integração de navegador, incluindo os quatro períodos do RubberSegment. A listagem do CLI reconheceu as seis skills no escopo de projeto. A decisão de seleção automática por uma sessão futura do Claude Code não foi simulada nem apresentada como um teste executado.
