# Skills de frontend do Caixa Novo

Skills do Claude Code instaladas no escopo do projeto, em `.claude/skills/`. Ficam versionadas junto com o código, então valem para qualquer sessão aberta nesta pasta. O Claude Code lê o `SKILL.md` de cada pasta e passa a oferecer a skill pelo nome (`/impeccable`, `/humanizer` etc.) ou a ativa sozinho quando a tarefa bate com a descrição.

Instalação feita em 31/10/2026, por cópia da pasta da skill tirada do repositório original. Nenhuma skill instalou pacote no produto: o `package.json` continua igual.

## Contexto que orientou a escolha

- O Caixa Novo é HTML, CSS e JavaScript puros, sem framework, sem build e sem biblioteca de componentes. Estilo em `assets/css/styles.css`, gráficos em SVG próprio (`assets/js/charts.js`).
- Usuários: o dono e o financeiro da Mundo Novo. Telas: visão geral, fluxo de caixa, a receber, a pagar, fechamento da gaveta, lançamentos, indicadores, conciliação bancária e importação de dados.
- Por isso as skills de React, Next.js, Tailwind e shadcn ficaram de fora. Elas só serviriam se o projeto mudasse de stack, e esta tarefa não autoriza isso.

## Skills instaladas

| Skill | Repositório | Versão | Licença | Pasta |
| --- | --- | --- | --- | --- |
| impeccable | [pbakaus/impeccable](https://github.com/pbakaus/impeccable) | 4.8.0, motor 0.1.18 (commit `4f95649`) | Apache 2.0 | `.claude/skills/impeccable/` |
| ui-ux-pro-max | [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | 2.15.0 (commit `bf41cbc`) | MIT | `.claude/skills/ui-ux-pro-max/` |
| design-taste-frontend | [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) | 2.1.5 (commit `12af471`) | MIT | `.claude/skills/design-taste-frontend/` |
| web-design-guidelines | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) | 1.0.0 (commit `1a2c79d`) | MIT | `.claude/skills/web-design-guidelines/` |
| frontend-design | [anthropics/skills](https://github.com/anthropics/skills) | commit `ca45fc4` | Apache 2.0 | `.claude/skills/frontend-design/` |
| humanizer | [blader/humanizer](https://github.com/blader/humanizer) | 3.1.0 (commit `0ef9fe5`) | MIT | `.claude/skills/humanizer/` |

Cada pasta traz o `SKILL.md` e a licença original. Os arquivos complementares vieram completos: `reference/` e `scripts/` da impeccable, `data/`, `references/` e `scripts/` da ui-ux-pro-max, `library/`, `references/`, `assets/`, `evals/` e `scripts/` da taste-skill.

### impeccable

- **Para que serve:** piso de qualidade visual. Audita, critica e refina hierarquia, espaçamento, tipografia, cor, estados, textos de interface e acessibilidade.
- **Como usar:** `/impeccable audit assets/css/styles.css`, `/impeccable critique`, `/impeccable polish`, `/impeccable harden` (estados vazios, erros, textos longos), `/impeccable clarify` (textos), `/impeccable quieter`.
- **Quando aplicar:** antes de mexer em qualquer tela e na revisão final de cada mudança visual. O painel é uma tela de trabalho, que a skill chama de modo "Operate": vale precisão e contenção, sem ousadia gráfica.
- **Limitações:** o script `scripts/impeccable` baixa um binário verificado por checksum para `~/.impeccable/bin/` na primeira execução. Foi instalada por cópia manual, sem o hook automático de design e sem os subagentes. Para tê-los, rode `npx impeccable install --providers=claude --scope=project`; isso altera `.claude/settings.json`. A skill grava arquivos de trabalho em `.impeccable/`.

### ui-ux-pro-max

- **Para que serve:** base de consulta local com estilos, paletas, pares de fontes, 119 regras de UX, tipos de gráfico e lista de verificação antes da entrega.
- **Como usar:** ativa sozinha em tarefas de UI. Consulta direta: `python3 .claude/skills/ui-ux-pro-max/scripts/search.py "financial dashboard" --domain style`. Outros domínios: `ux`, `chart`, `color`, `typography`. As regras completas ficam em `references/quick-reference.md` e `references/pro-rules.md`.
- **Quando aplicar:** lista de acessibilidade (contraste, foco, alvo de toque, cor que não é o único sinal), escolha do tipo de gráfico, revisão de tabelas e formulários.
- **Limitações:** precisa de Python 3. As paletas e fontes sugeridas são genéricas. A marca da Mundo Novo (laranja `#FE7D01`, Red Hat Display e Red Hat Text) continua valendo acima delas. Ignore as partes de React, Tailwind e animação com GSAP.

### design-taste-frontend (taste-skill)

- **Para que serve:** direção de arte contra visual genérico, com regras próprias para telas de aplicativo (painéis, tabelas, configurações) e um linter.
- **Como usar:** `/design-taste-frontend`. O linter roda direto: `node .claude/skills/design-taste-frontend/scripts/lint.mjs`. O inspetor em navegador é `scripts/inspect.mjs` e pede o servidor do `npm run dev` ligado.
- **Quando aplicar:** use as regras de tela de aplicativo, que já orientam o visual atual: cor nos dados e não no menu, números alinhados à direita com algarismos de largura fixa, nada de sombra ou gradiente em caixa parada. O `charts.js` do projeto veio desta skill.
- **Limitações:** a maior parte da skill é sobre sites públicos e landing pages, e essa parte não se aplica aqui. Os scripts pedem Node 22 ou mais novo e Chrome, Edge ou Chromium. O linter acusa as linhas finas de `styles.css` (regra `hairline`). Em tabela financeira e campo de formulário, linha fina é legítima, e a própria regra abre essa exceção.

### web-design-guidelines (Vercel)

- **Para que serve:** auditoria de código de interface contra as Web Interface Guidelines da Vercel: semântica HTML, acessibilidade, foco, formulários, responsividade e números.
- **Como usar:** `/web-design-guidelines index.html` ou `/web-design-guidelines assets/js/app.js`. A resposta vem no formato `arquivo:linha`.
- **Quando aplicar:** revisão técnica de HTML e JS depois de cada mudança de tela, e antes de publicar.
- **Limitações:** a skill baixa as regras na hora, de `raw.githubusercontent.com/vercel-labs/web-interface-guidelines`, então precisa de internet. Trabalha só com o código e não abre a página renderizada.

### frontend-design (Anthropic)

- **Para que serve:** orientação de direção visual e tipografia para não cair em visual de modelo.
- **Como usar:** `/frontend-design`.
- **Quando aplicar:** só quando surgir uma tela nova sem padrão no projeto, e mesmo assim respeitando o sistema visual que já existe. A skill puxa para escolhas ousadas, o que vale pouco num painel de caixa.
- **Limitações:** é curta e não traz scripts. Sobrepõe bastante a impeccable e a taste-skill. No conflito, prevalecem o `CLAUDE.md` do projeto e a impeccable no modo Operate.

### humanizer

- **Para que serve:** revisar textos para tirar marcas de escrita de IA sem mudar o que dizem.
- **Como usar:** `/humanizer` com o texto, ou pedindo a revisão dos textos de `index.html` e `app.js`.
- **Quando aplicar:** mensagens de erro, avisos de vencimento, estados vazios, confirmações de importação e baixa, o resumo do dia e os textos de ajuda.
- **Limitações:** a skill foi escrita para inglês. As regras de estrutura (contraste forçado, frase de efeito no fim, trio forçado) valem para o português, mas a lista de palavras proibidas não. Ela nunca pode mexer em valores, datas, nomes de conta ou no que a mensagem afirma. Também não pode inventar a causa de uma falha nem dizer que algo foi concluído sem confirmação do sistema.

## Qual skill usar em cada tarefa

| Tarefa | Skills |
| --- | --- |
| Revisar uma tela existente | impeccable `audit` ou `critique`, depois web-design-guidelines |
| Acessibilidade (contraste, foco, leitor de tela) | ui-ux-pro-max, depois web-design-guidelines |
| Tabelas, extratos, a receber e a pagar | impeccable (modo Operate), regras de tela de aplicativo da taste-skill |
| Gráficos do fluxo de caixa e dos indicadores | ui-ux-pro-max (domínio `chart`), taste-skill (`charts.js`) |
| Formulários (importação, conferência de colunas, lançamento manual) | impeccable `harden` e `clarify`, web-design-guidelines |
| Estados vazios, de carga e de erro | impeccable `harden`, humanizer para os textos |
| Textos, avisos e confirmações financeiras | humanizer, impeccable `clarify` |
| Tela nova sem padrão no projeto | impeccable `shape`, frontend-design como segunda opinião |
| Movimento | impeccable `animate`, dentro da regra do projeto: 150 a 200 ms, ease-out, só em resposta a uma ação, respeitando prefers-reduced-motion |

As regras do `CLAUDE.md` do projeto vêm antes de qualquer skill: centavos inteiros, formato `R$ 1.234,56`, sinal de menos verdadeiro (−), cor que nunca é o único sinal, e telas que só leem de `calculos.js`.

## Sobreposições

- **impeccable, taste-skill e frontend-design** tratam de direção visual. A impeccable é a principal, porque cobre telas de trabalho e tem auditoria por comando. A taste-skill fica pelas regras de tela de aplicativo e pelo linter. A frontend-design é opcional e fica para telas novas.
- **ui-ux-pro-max e web-design-guidelines** fazem verificação. A primeira é uma base de regras para consultar enquanto se projeta. A segunda audita código pronto, linha por linha. Uma complementa a outra.
- **humanizer e impeccable `clarify`** mexem em texto. A humanizer tira os vícios de escrita. A `clarify` cuida de rótulos e microtextos de interface.

## Investigadas e não instaladas

| Referência | Motivo |
| --- | --- |
| vercel-labs/agent-skills: `react-best-practices`, `composition-patterns`, `react-view-transitions`, `react-native-skills` | Só valem para React, e o projeto não usa React. |
| vercel-labs/agent-skills: `deploy-to-vercel`, `vercel-cli-with-tokens`, `vercel-optimize`, `writing-guidelines` | Fora do escopo de frontend ou ligados à hospedagem na Vercel. Para texto, a humanizer já basta. |
| PyModel/react-frontend-skills (v2.3.0, 18 skills) | Feitas para React 19, Next.js, Tailwind, shadcn, TanStack Query, Zod e Vitest. A `web-design-guidelines` deles é cópia da Vercel, que entrou pela fonte original. A `ui-design` repete a ui-ux-pro-max. |
| vercel/next.js `skills/` | O projeto não usa Next.js. A página da pasta bloqueia leitura automática, então o conteúdo não foi conferido. |
| anthropics/skills: as outras skills (pdf, docx, xlsx, canvas-design, webapp-testing etc.) | Não são de interface do produto. A `webapp-testing` (testes com Playwright) pode entrar mais tarde, se o projeto ganhar testes de tela. |
| ui-ux-pro-max-skill: `design`, `design-system`, `brand`, `slides`, `banner-design`, `ui-styling` | São de banner, slides e marca, ou feitas para shadcn e Tailwind. O sistema visual do projeto já existe. |

## Atualizar

As skills foram copiadas, não ligadas aos repositórios originais. Para atualizar uma delas, baixe a versão nova, substitua a pasta em `.claude/skills/` e corrija a versão e o commit nesta página. A impeccable também tem `npx impeccable update`.
