# Arquitetura do frontend do Caixa Novo

Painel de caixa da Mundo Novo em HTML, CSS e JavaScript puros, sem framework e sem etapa de build. Esta página descreve como as telas estão montadas depois da revisão de 31/10/2026 e o que ainda falta.

## Ponto de partida

- **Stack:** `index.html`, `assets/css/styles.css`, `assets/js/calculos.js`, `assets/js/app.js` e `assets/js/charts.js` (gráficos em SVG da taste-skill, licença MIT). Sem dependências instaladas. O SheetJS 0.18.5 só é carregado do cdnjs quando alguém importa um .xlsx.
- **Dados:** não há backend nem banco. As fontes são `dados/*.json` (exemplo, inventado) ou planilhas importadas, guardadas no localStorage com a chave `mn-fonte-<fonte>`.
- **Gravação:** o painel só lê. Ele não registra pagamento, recebimento, transferência nem lançamento manual. Nenhuma tela finge fazer essas operações.

## Design system

Os tokens ficam no começo de `styles.css`, com variações para os temas claro e escuro.

| Token | Claro | Uso |
| --- | --- | --- |
| `--ground` | `#F5F3EE` | Fundo da página |
| `--side` | `#F0EEE8` | Sidebar |
| `--surface` | `#FFFFFF` | Caixas e tabelas |
| `--raised` | `#F8F7F3` | Destaque dentro de uma caixa (saldo principal, linha escolhida) |
| `--border` / `--rule` | `#E8E5DE` / `#EFEDE7` | Borda das caixas / linhas internas |
| `--text` | `#292824` | Texto principal |
| `--muted` / `--faint` | `#6E6B64` / `#706C65` | Texto secundário |
| `--positive` | `#3B7A42` | Valor que entra |
| `--negative` | `#B8433A` | Valor que sai, vencido |
| `--brand` | `#FE7D01` | Logo, faixa de destaque, marca do item ativo |

A referência pedida trazia `#85827B`, `#43864A` e `#D65B52`, que ficam entre 3,8:1 e 4,4:1 sobre branco. Os tons foram escurecidos até passar de 4,5:1 sobre branco e sobre o fundo, sem mudar a família de cor.

- **Tipografia:** Red Hat Display em títulos e números grandes, Red Hat Text no resto, Birthstone só na frase "Rondonópolis, há 35 anos". Escala: 12, 13, 14, 16, 18, 21, 26 e 30 px. Números com algarismos de largura fixa (`tabular-nums`).
- **Espaço:** múltiplos de 4. Entre blocos, 16 px (`--gap`). Dentro das caixas, 20 px (`--pad`), ou 16 px no celular.
- **Raios:** 12 px nas caixas, 8 px em controles e itens internos, 999 px nas pílulas.
- **Sombra:** `--shadow` é quase imperceptível (1 a 2 px, opacidade de 2% a 5%). No tema escuro não há sombra.
- **Botões:** `btn-primary` (escuro, ação principal), `btn-ghost` (contorno), `btn-text` (link sublinhado). Altura de 38 px, `scale(0.97)` ao clicar e opacidade de 55% quando desativado.
- **Formulários:** `field` (rótulo em cima), `input`, `select`, `search` (com lupa), `check`. Foco visível em todos os controles.
- **Pílulas de situação:** `pill-pos` (pago, recebido, paga em dia), `pill-warn` (vence hoje, atrasa às vezes), `pill-neg` (vencido, acima do limite), `pill-neutral` (a vencer, sem histórico). A pílula sempre traz o texto da situação; a cor nunca é o único sinal.
- **Valores:** `+` para o que entra, `−` (sinal de menos verdadeiro) para o que sai, classes `pos` e `neg` para a cor, zero sem cor. Formato `R$ 1.234,56`, datas `dd/mm/aaaa`.
- **Movimento:** de 150 a 200 ms com ease-out, só em resposta a uma ação (abrir menu, recolher sidebar, apertar botão). Fica desligado com `prefers-reduced-motion`.

## Componentes

O projeto não usa componentes de framework. Cada componente é uma classe CSS com uma função auxiliar em `app.js`.

| Componente | Onde | O que faz |
| --- | --- | --- |
| Casca (AppLayout) | `.app`, `.side`, `main` | Grade com a sidebar fixa e a área principal |
| Sidebar | `.side`, `NAV` em `app.js` | Menu em quatro grupos, montado de uma lista só para o computador e o celular |
| Menu recolhido | `.app.mini`, `aplicarMenu()` | Sidebar só com ícones; nome no `title` e no leitor de tela; a escolha fica guardada em `mn-menu` |
| Indicador de fonte | `.fonte`, `atualizarFonte()` | Mostra "Dados de exemplo", "Dados importados" ou quantas fontes foram importadas |
| Cabeçalho da tela (PageHeader) | `.title-row`, `.finding` | Título, frase com o achado principal e ações |
| Faixa de indicadores (StatCard) | `.strip`, `kpi()` | Valores em uma faixa só, divididos por linhas, sem um cartão por número |
| Faixa que escolhe | `.strip > button` | A mesma faixa, mas cada célula é um botão (contas financeiras) |
| Tabela (DataTable) | `.tbl-wrap`, `th .sort` | Cabeçalho fixo, ordenação com `aria-sort`, "Mostrar mais" no lugar de paginação |
| Barra de filtros (FilterBar) | `.filters`, `.field` | Busca, selects, datas e "Limpar filtros" |
| Valor monetário (CurrencyDisplay) | `brl()`, `brlS()`, `sinal()` | Formatação e cor do valor |
| Situação (StatusBadge) | `.pill`, `SIT_PILL`, `NOTA_PILL` | Situação do título e nota de pagador |
| Gráficos (ChartContainer) | `.chart`, `charts.js` | Linha, barras divergentes e lista de barras, com eixo, legenda e unidade |
| Alertas (AlertList) | `.alerts` | Situações que pedem atenção, cada uma com link para a tela certa |
| Próximos vencimentos | `.split`, `.list` | A receber e a pagar lado a lado, com totais |
| Ficha | `.ficha` | Detalhe de um cliente ou fornecedor ao lado da lista |
| Estado vazio | `.empty` | Explica por que não há nada e o que fazer |
| Carregando | `.boot` | Esqueleto com "Carregando os dados do caixa…" até a primeira tela aparecer |
| Erro | `.err`, `safe()` | Um bloco que falha mostra o erro só nele; uma falha na carga mostra a causa e como resolver |

## Navegação

| Grupo | Tela | Rota |
| --- | --- | --- |
| Principal | Visão geral | `#geral` |
| | Fluxo de caixa | `#fluxo` |
| Financeiro | A receber | `#receber`, `#receber/vencidos`, `#receber/limite` |
| | A pagar | `#pagar` |
| | Lançamentos | `#lancamentos` |
| | Contas financeiras (nova) | `#contas` |
| | Fechamento de caixa | `#fechamento` |
| Gestão | Clientes e fornecedores (nova) | `#cadastros` |
| | Indicadores | `#indicadores` |
| | Relatórios (nova) | `#relatorios` |
| Ferramentas | Conciliação bancária | `#conciliacao` |
| | Importar dados | `#dados` |

Cada tela é desenhada na primeira visita e guardada. Importar dados ou voltar ao exemplo limpa o cache dos cálculos e desenha tudo de novo (`recarregar()`).

## O que mudou nesta revisão

- **Design system:** paleta, tipografia, espaços, raios e sombra conforme a referência, com ajuste de contraste.
- **Sidebar:** fundo próprio, quatro grupos, marca laranja no item ativo, indicador da fonte dos dados e botão para recolher. Entre 901 e 1180 px ela começa recolhida.
- **Visão geral:** segunda faixa com entradas e saídas do mês (comparadas com o mesmo período do mês anterior), a receber em aberto com o vencido e a pagar em aberto com o que vence em 7 dias. O gráfico ficou mais alto para não sobrar espaço vazio.
- **Correção:** o quadro "Resumo do dia" aparecia aberto e vazio ao carregar a página, porque o estilo de `.card` anulava o atributo `hidden`. Agora `[hidden]` sempre esconde.
- **A pagar:** os dias do calendário pareciam botões, mas não faziam nada. Agora os dias com pagamento filtram a tabela de títulos e os dias vazios não são mais botões.
- **Contas financeiras:** faixa com o saldo de cada conta (escolhe a conta) e o extrato com busca, tipo, período, totais e CSV.
- **Clientes e fornecedores:** lista com busca, filtros, situação e ordenação, e uma ficha com os números, os títulos em aberto e os últimos recebimentos ou pagamentos. A ficha leva aos lançamentos já filtrados.
- **Relatórios:** período (mês atual, mês anterior, 30 ou 90 dias, ou datas livres), contagem de linhas ao vivo e nove CSVs. A mensagem de confirmação só aparece depois que o arquivo foi gerado.
- **Celular:** o menu do celular usa a mesma lista da sidebar. As faixas de indicadores viram uma coluna abaixo de 520 px, para os valores grandes não estourarem.

## Integração com os dados

As telas nunca leem `dados/` direto. Elas pedem resultados a `calculos.js` por `get(id)`, e os cálculos somam em centavos inteiros. Cálculos novos:

| Cálculo | Usa | Devolve |
| --- | --- | --- |
| `contas_resumo` | contas, lançamentos | Saldo, participação, entradas e saídas em 30 dias e último lançamento por conta |
| `extrato_contas` | contas, lançamentos | Lançamentos de cada conta com valor com sinal |
| `titulos_receber` | contas, receber | Todos os títulos a receber com situação e dias de atraso |
| `titulos_pagar` | contas, pagar | Todos os títulos a pagar com abatimento, líquido e situação |
| `cadastro_clientes` | contas, clientes, receber, pagadores | Cliente com em aberto, vencido, limite usado, última compra, recebido em 90 dias e nota |
| `cadastro_fornecedores` | contas, pagar | Fornecedor com categoria principal, em aberto, vencido, próximo vencimento, pago e abatido em 90 dias |

Os 22 cálculos que já existiam continuam iguais: a saída de cada um foi comparada com a versão anterior, sobre os mesmos dados, e não mudou. Os totais em aberto por cliente e por fornecedor batem no centavo com `resumo`.

## Responsividade

- **Computador (acima de 1180 px):** sidebar aberta, colunas lado a lado, tabelas completas.
- **Tablet (901 a 1180 px):** sidebar recolhida em ícones, colunas empilhadas abaixo de 1100 px, faixas em duas colunas.
- **Celular (até 900 px):** barra no topo com o logo, o nome da tela, a fonte dos dados e o menu em tela cheia. Colunas secundárias das tabelas somem (`hide-sm`). Abaixo de 520 px, as faixas viram uma coluna.
- Nenhuma tela tem rolagem horizontal em 390, 1024 e 1440 px (conferido em todas as rotas).

## Skills usadas

- **impeccable:** modo Operate (tela de trabalho) e piso de qualidade: contraste, estados, foco e texto. O detector rodou na página publicada localmente.
- **ui-ux-pro-max:** consulta do estilo "financial dashboard" e da lista de acessibilidade.
- **design-taste-frontend:** regras de tela de aplicativo e o linter.
- **humanizer:** critérios para os textos novos: frases diretas, sem chamadas de efeito, e cada mensagem diz o que aconteceu e o que fazer.
- **web-design-guidelines:** fica para a próxima revisão; ela baixa as regras da internet na hora do uso.

As bibliotecas sugeridas (21st.dev, Magic UI, Aceternity, React Bits, shadcnblocks, ReUI, Kokonut UI, Cult UI) são todas de React com Tailwind. Usar qualquer uma exigiria trocar a stack, então nenhuma entrou.

## Decisões técnicas

- **Sem saldo dia a dia por conta.** Refazer o saldo de trás para frente a partir do saldo de hoje deu −R$ 1,5 milhão no Caixa da loja, porque as fontes não têm as transferências entre contas (a sangria do caixa para o banco, por exemplo). O extrato mostra só os lançamentos e explica o motivo na própria tela.
- **"Mostrar mais" em vez de paginação.** Combina com as tabelas que já existiam e não perde a rolagem.
- **CSV com ponto e vírgula, vírgula decimal e BOM UTF-8.** Assim o Excel em português abre o arquivo sem configurar nada. Os valores saem dos centavos, sem passar pelo texto formatado da tela.
- **Sombras e bordas finas.** O linter da taste-skill pede caixas sem sombra e sem contorno. A referência pediu as duas coisas, então ficou a referência, com a sombra no mínimo e desligada no tema escuro.
- **Fundo bege.** O detector da impeccable aponta fundo creme como padrão de IA. Ficou porque é a cor pedida e combina com a marca.

## Verificação

- Interações automatizadas no Chromium: 27 de 27 passaram (resumo do dia, abas do gráfico, tema, menu recolhido, troca de conta, filtros do extrato, estado vazio, ficha e atalho para lançamentos, filtros de clientes, período e download de relatórios, conciliação de exemplo, importação, filtro do calendário, atalho de vencidos e foco pelo teclado).
- Todas as 12 rotas em 390, 1024 e 1440 px, nos temas claro e escuro: sem erro no console e sem rolagem horizontal.
- `scripts/montar_arquivo_unico.py` gera o arquivo único sem erro.
- O projeto não tem testes unitários, typecheck nem lint configurados.

## Pendências

1. **Gravar operações:** lançamento manual, baixa de pagamento e de recebimento (inclusive parcial), estorno e transferência entre contas. Precisam de um backend com banco e histórico. Quando existirem, a confirmação na tela deve esperar a resposta do servidor.
2. **Transferências nas fontes:** com elas, o extrato pode mostrar o saldo dia a dia de cada conta, e transferência deixa de aparecer como entrada ou saída.
3. **Competência:** as fontes não têm data de competência, só emissão, vencimento e pagamento. Os títulos mostram essas três.
4. **Gráficos:** `charts.js` escreve rótulos de eixo com 11 px. Vale subir para 12 px numa próxima revisão.
5. **Configurações:** tema e menu recolhido ficam na sidebar. Uma tela própria só vale a pena quando houver mais preferências, como o saldo mínimo, que hoje é uma constante em `calculos.js`.
